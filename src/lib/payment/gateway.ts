// =====================================================
// Payment Gateway — Central Routing Service
// Orders never talk to providers directly; they go through here.
// =====================================================

import { createClient } from "@supabase/supabase-js";
import type {
  IPaymentProvider, InitiatePaymentRequest, InitiatePaymentResult,
  ConfirmPaymentRequest, ConfirmPaymentResult,
  WebhookPayload, WebhookResult, PaymentStatus,
} from "./types";
import { CodProvider }            from "./providers/cod";
import { ManualWalletProvider }   from "./providers/manual-wallet";
import { TransferPointsProvider, type TransferPoint } from "./providers/transfer-points";
import { StripeProvider }         from "./providers/stripe";

// Service-role client (server-only — never exposed to browser)
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// مرجع دفع فريد قصير — أحرف/أرقام غير ملتبسة (بلا O/0/I/1)
function generateReferenceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint32Array(6);
  crypto.getRandomValues(arr);
  let code = "";
  for (const n of arr) code += chars[n % chars.length];
  return `PAY-${code}`;
}

// ── Provider Registry ────────────────────────────────

// التعليمات المخصصة: JSON array أو نص عادي بسطر لكل خطوة — لا نرمي استثناء أبداً
function parseInstructions(raw?: string): string[] | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : undefined;
  } catch {
    return raw.split("\n").map(s => s.trim()).filter(Boolean);
  }
}

// Build multi-currency accounts array from provider config keys
function currencyAccounts(cfg: Record<string, string>) {
  const defs = [
    { key: "account_number_yer", currency: "YER", label: "ريال يمني" },
    { key: "account_number_sar", currency: "SAR", label: "ريال سعودي" },
    { key: "account_number_usd", currency: "USD", label: "دولار أمريكي" },
  ];
  const accounts = defs
    .filter(d => cfg[d.key]?.trim())
    .map(d => ({ currency: d.currency, label: d.label, number: cfg[d.key].trim() }));
  return accounts.length > 0 ? accounts : undefined;
}

async function buildProvider(code: string): Promise<IPaymentProvider | null> {
  const sb = serviceClient();

  const { data: p } = await sb
    .from("payment_providers")
    .select("code, name, is_active, config, metadata")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (!p) return null;

  const meta = (p.metadata ?? {}) as Record<string, string>;
  const cfg  = (p.config  ?? {}) as Record<string, string>;
  const type = meta.type as string;

  if (code === "cod")    return new CodProvider();
  if (code === "stripe") return new StripeProvider();

  if (type === "manual_wallet") {
    return new ManualWalletProvider(code, meta.name_ar ?? p.name, {
      accountNumber: cfg.account_number,
      accountName:   cfg.account_name,
      walletPhone:   cfg.wallet_phone,
      accounts:      currencyAccounts(cfg),
      instructions:  parseInstructions(cfg.instructions),
    });
  }

  if (type === "transfer_point") {
    const { data: pts } = await sb
      .from("transfer_points")
      .select("id, label, phone, account_name, notes, icon_url, qr_value")
      .eq("provider_code", code)
      .eq("is_active", true)
      .order("display_order");

    const points: TransferPoint[] = (pts ?? []).map(r => ({
      id:          r.id,
      label:       r.label,
      phone:       r.phone,
      accountName: r.account_name ?? undefined,
      notes:       r.notes        ?? undefined,
      iconUrl:     r.icon_url     ?? undefined,
      qrValue:     r.qr_value     ?? undefined,
    }));

    return new TransferPointsProvider(code, meta.name_ar ?? p.name, points);
  }

  if (type === "bank_transfer") {
    return new ManualWalletProvider(code, meta.name_ar ?? p.name, {
      accountNumber: cfg.account_number,
      accountName:   cfg.account_name,
      bankName:      cfg.bank_name,
      accounts:      currencyAccounts(cfg),
      instructions: parseInstructions(cfg.instructions) ?? [
        `حوّل المبلغ إلى حساب البنك: ${cfg.bank_name ?? ""}`,
        "اختر رقم الحساب المناسب لعملة التحويل",
        "بعد التحويل أرفق صورة الإيصال أو نص الإشعار في نفس الصفحة",
        "سيبقى طلبك قيد المراجعة حتى يتأكد فريقنا من استلام المبلغ",
      ],
    });
  }

  return null;
}

// ── Main Gateway ─────────────────────────────────────

export const PaymentGateway = {

  /**
   * Initiate a payment: creates DB record, calls provider, logs result.
   */
  async initiate(req: InitiatePaymentRequest): Promise<InitiatePaymentResult> {
    const sb = serviceClient();

    const provider = await buildProvider(req.providerCode);
    if (!provider) {
      return {
        success: false, paymentId: "", status: "failed",
        instruction: { type: "reference" },
        error: `مزود الدفع "${req.providerCode}" غير متاح`,
      };
    }

    // Create payment record — مع مرجع فريد (إعادة محاولة واحدة عند تصادم نادر)
    let payment: { id: string; reference_code: string } | null = null;
    for (let attempt = 0; attempt < 2 && !payment; attempt++) {
      const referenceCode = generateReferenceCode();
      const { data, error: dbErr } = await sb
        .from("payments")
        .insert({
          order_id:       req.orderId,
          provider_code:  req.providerCode,
          method:         req.providerCode,
          amount:         req.amount,
          currency:       req.currency,
          status:         "pending",
          reference_code: referenceCode,
          idempotency_key: `${req.orderId}-${req.providerCode}-${Date.now()}`,
        })
        .select("id, reference_code")
        .single();
      if (data) payment = data;
      else if (dbErr && dbErr.code !== "23505") break;
    }

    if (!payment) {
      return { success: false, paymentId: "", status: "failed",
        instruction: { type: "reference" }, error: "فشل إنشاء سجل الدفع" };
    }

    // المزودون يعرضون المرجع الفريد في التعليمات
    req.referenceCode = payment.reference_code;

    let result: InitiatePaymentResult;
    try {
      result = await provider.initiate(req);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Provider error";
      await sb.from("payments").update({ status: "failed", failure_reason: msg }).eq("id", payment.id);
      await this._log(payment.id, "initiate", req.providerCode, {}, {}, undefined, msg);
      return { success: false, paymentId: payment.id, status: "failed",
        instruction: { type: "reference" }, error: msg };
    }

    // Update payment with result
    const newStatus: PaymentStatus = result.success ? result.status : "failed";
    await sb.from("payments").update({
      status:       newStatus,
      instructions: result.instruction,
      expires_at:   result.expiresAt ?? null,
      failure_reason: result.error ?? null,
      provider_txn_id: result.providerTxnId ?? null,
    }).eq("id", payment.id);

    // Sync order payment_status
    await sb.from("orders").update({ payment_status: newStatus }).eq("id", req.orderId);

    await this._log(payment.id, "initiate", req.providerCode, req as unknown as Record<string, unknown>,
      { status: newStatus, instruction: result.instruction });

    return { ...result, paymentId: payment.id };
  },

  /**
   * Admin manually confirms a pending payment.
   */
  async confirmManual(req: ConfirmPaymentRequest): Promise<ConfirmPaymentResult> {
    const sb = serviceClient();

    const { data: payment } = await sb
      .from("payments")
      .select("id, order_id, provider_code, status, receipt_url, customer_note, amount")
      .eq("id", req.paymentId)
      .single();

    if (!payment) return { success: false, status: "failed", error: "السجل غير موجود" };
    if (payment.status === "paid") return { success: true, status: "paid" };

    // لا تأكيد بلا إثبات — يستثنى الدفع عند الاستلام (يُؤكَّد عبر تسليم
    // المندوب فعلياً، لا إثبات تحويل له أصلاً)
    if (payment.provider_code !== "cod" && !payment.receipt_url && !payment.customer_note) {
      return { success: false, status: payment.status as PaymentStatus,
        error: "لا يمكن تأكيد الدفعة قبل إرفاق إثبات التحويل (صورة الإيصال أو ملاحظة) من العميل أو المسؤول" };
    }

    const provider = await buildProvider(payment.provider_code);
    let finalStatus: PaymentStatus = "paid";

    if (provider?.confirmManually) {
      const res = await provider.confirmManually(req);
      if (!res.success) return res;
      finalStatus = res.status;
    }

    await sb.from("payments").update({
      status:          finalStatus,
      confirmed_by:    req.adminUserId,
      confirmed_at:    new Date().toISOString(),
      transaction_ref: req.transactionRef ?? null,
      paid_amount:     req.paidAmount ?? null,
    }).eq("id", req.paymentId);

    await sb.from("orders").update({
      payment_status: finalStatus,
      status:         "confirmed",
    }).eq("id", payment.order_id);

    await this._log(payment.id, "confirm", payment.provider_code,
      { admin: req.adminUserId, ref: req.transactionRef },
      { status: finalStatus });

    // تسجيل قيد في دفتر أستاذ المدفوعات — الدفع عند الاستلام له دفتره
    // الخاص (driver_cash_ledger) عبر مسار مختلف بالكامل
    if (finalStatus === "paid" && payment.provider_code !== "cod") {
      const { data: providerRow } = await sb
        .from("payment_providers")
        .select("name, metadata")
        .eq("code", payment.provider_code)
        .maybeSingle();
      const meta = (providerRow?.metadata ?? {}) as Record<string, string>;
      await sb.from("payment_ledger").insert({
        payment_id:           payment.id,
        order_id:             payment.order_id,
        provider_code:        payment.provider_code,
        method_name_snapshot: meta.name_ar ?? providerRow?.name ?? payment.provider_code,
        amount:                req.paidAmount ?? payment.amount,
        receipt_url:           payment.receipt_url ?? null,
        confirmed_by:          req.adminUserId,
        note:                  req.notes ?? null,
      });
    }

    return { success: true, status: finalStatus };
  },

  /**
   * Admin rejects a payment (amount mismatch, invalid proof…).
   */
  async reject(args: { paymentId: string; adminUserId: string; reason: string; paidAmount?: number }) {
    const sb = serviceClient();
    const { data: payment } = await sb
      .from("payments")
      .select("id, order_id, provider_code, status")
      .eq("id", args.paymentId)
      .single();
    if (!payment) return { success: false as const, error: "السجل غير موجود" };
    if (payment.status === "paid") return { success: false as const, error: "الدفعة مؤكدة — استخدم الاسترجاع" };

    await sb.from("payments").update({
      status:         "failed",
      failure_reason: args.reason,
      review_note:    args.reason,
      paid_amount:    args.paidAmount ?? null,
      confirmed_by:   args.adminUserId,
      updated_at:     new Date().toISOString(),
    }).eq("id", payment.id);
    await sb.from("orders").update({ payment_status: "failed" }).eq("id", payment.order_id);

    await this._log(payment.id, "reject", payment.provider_code,
      { admin: args.adminUserId }, { reason: args.reason });
    return { success: true as const, orderId: payment.order_id as string };
  },

  /**
   * Admin requests revision — payment goes back to pending, customer re-uploads proof.
   */
  async requestRevision(args: { paymentId: string; adminUserId: string; note: string }) {
    const sb = serviceClient();
    const { data: payment } = await sb
      .from("payments")
      .select("id, order_id, provider_code, status")
      .eq("id", args.paymentId)
      .single();
    if (!payment) return { success: false as const, error: "السجل غير موجود" };
    if (payment.status === "paid") return { success: false as const, error: "الدفعة مؤكدة بالفعل" };

    await sb.from("payments").update({
      status:      "pending",
      review_note: args.note,
      updated_at:  new Date().toISOString(),
    }).eq("id", payment.id);
    await sb.from("orders").update({ payment_status: "pending" }).eq("id", payment.order_id);

    await this._log(payment.id, "request_revision", payment.provider_code,
      { admin: args.adminUserId }, { note: args.note });
    return { success: true as const, orderId: payment.order_id as string };
  },

  /**
   * Admin marks a paid payment as refunded (money returned to customer).
   */
  async markRefunded(args: { paymentId: string; adminUserId: string; reason?: string }) {
    const sb = serviceClient();
    const { data: payment } = await sb
      .from("payments")
      .select("id, order_id, provider_code, status")
      .eq("id", args.paymentId)
      .single();
    if (!payment) return { success: false as const, error: "السجل غير موجود" };
    if (payment.status !== "paid") return { success: false as const, error: "لا يمكن استرجاع دفعة غير مؤكدة" };

    await sb.from("payments").update({
      status:         "refunded",
      failure_reason: args.reason ?? "استرجاع يدوي",
      updated_at:     new Date().toISOString(),
    }).eq("id", payment.id);
    await sb.from("orders").update({ payment_status: "refunded" }).eq("id", payment.order_id);

    await this._log(payment.id, "refund", payment.provider_code,
      { admin: args.adminUserId }, { reason: args.reason });
    return { success: true as const, orderId: payment.order_id as string };
  },

  /**
   * Sweep stale payments past their deadline → expired.
   * Cheap cron substitute — runs when the admin payments screen loads.
   */
  async sweepExpired(): Promise<number> {
    const sb = serviceClient();
    const { data: stale, error } = await sb
      .from("payments")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .in("status", ["pending", "awaiting_confirmation"])
      .not("expires_at", "is", null)
      .lt("expires_at", new Date().toISOString())
      .select("id, order_id");
    if (error) {
      console.error("sweepExpired:", error);
      return 0;
    }
    for (const p of stale ?? []) {
      await sb.from("orders").update({ payment_status: "expired" }).eq("id", p.order_id);
    }
    return stale?.length ?? 0;
  },

  /**
   * Handle inbound webhook from a provider (Stripe, etc.)
   */
  async handleWebhook(providerCode: string, payload: WebhookPayload): Promise<WebhookResult> {
    const sb = serviceClient();

    // Store raw event first
    const { data: evt } = await sb
      .from("webhook_events")
      .insert({
        provider_code: providerCode,
        payload:       JSON.parse(payload.rawBody || "{}"),
        headers:       payload.headers,
        signature:     payload.signature,
      })
      .select("id")
      .single();

    const provider = await buildProvider(providerCode);
    if (!provider?.handleWebhook) {
      return { verified: false, error: "Provider does not support webhooks" };
    }

    const result = await provider.handleWebhook(payload);

    if (evt) {
      await sb.from("webhook_events").update({
        is_verified:  result.verified,
        is_processed: result.verified,
        processed_at: new Date().toISOString(),
        error_message: result.error ?? null,
      }).eq("id", evt.id);
    }

    if (result.verified && result.status && result.providerTxnId) {
      // Find payment by provider txn id or order reference
      const { data: payment } = await sb
        .from("payments")
        .select("id, order_id")
        .eq("provider_txn_id", result.providerTxnId)
        .maybeSingle();

      if (payment) {
        await sb.from("payments").update({ status: result.status }).eq("id", payment.id);
        await sb.from("orders").update({ payment_status: result.status,
          status: result.status === "paid" ? "confirmed" : "pending",
        }).eq("id", payment.order_id);

        if (evt) await sb.from("webhook_events").update({ payment_id: payment.id }).eq("id", evt.id);
      }
    }

    return result;
  },

  /**
   * معاينة تفاصيل الدفع (رقم الحساب/المحفظة، نقاط التحويل...) لطريقة دفع
   * معيّنة قبل إنشاء الطلب فعلياً — لا يكتب أي سجل في قاعدة البيانات
   * (initiate() الخاص بكل مزوّد دالة نقية، تُبنى من الإعداد المخزَّن فقط).
   */
  async previewInstruction(providerCode: string, amount: number, currency: string) {
    const provider = await buildProvider(providerCode);
    if (!provider) return null;
    const result = await provider.initiate({
      orderId: "", orderNumber: "سيُنشأ بعد تأكيد الطلب", amount, currency, providerCode,
    });
    return result.instruction;
  },

  /**
   * Get active providers list for checkout UI.
   */
  async getActiveProviders() {
    const sb = serviceClient();
    const { data } = await sb
      .from("payment_providers")
      .select("code, name, is_active, is_test_mode, min_amount, max_amount, display_order, metadata, config")
      .eq("is_active", true)
      .order("display_order");
    return data ?? [];
  },

  // ── Internal log helper ──────────────────────────
  async _log(
    paymentId: string, eventType: string, providerCode: string,
    requestData: Record<string, unknown>, responseData: Record<string, unknown>,
    statusCode?: number, errorMessage?: string,
  ) {
    try {
      const sb = serviceClient();
      await sb.from("payment_logs").insert({
        payment_id:    paymentId,
        event_type:    eventType,
        direction:     "outbound",
        provider_code: providerCode,
        request_data:  requestData,
        response_data: responseData,
        status_code:   statusCode,
        error_message: errorMessage,
      });
    } catch { /* logging must never break the main flow */ }
  },
};
