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

// ── Provider Registry ────────────────────────────────

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
      instructions:  cfg.instructions ? JSON.parse(cfg.instructions) : undefined,
    });
  }

  if (type === "transfer_point") {
    const { data: pts } = await sb
      .from("transfer_points")
      .select("id, label, phone, account_name, notes")
      .eq("provider_code", code)
      .eq("is_active", true)
      .order("display_order");

    const points: TransferPoint[] = (pts ?? []).map(r => ({
      id:          r.id,
      label:       r.label,
      phone:       r.phone,
      accountName: r.account_name ?? undefined,
      notes:       r.notes        ?? undefined,
    }));

    return new TransferPointsProvider(code, meta.name_ar ?? p.name, points);
  }

  if (type === "bank_transfer") {
    return new ManualWalletProvider(code, meta.name_ar ?? p.name, {
      accountNumber: cfg.account_number,
      accountName:   cfg.account_name,
      instructions: [
        `حوّل المبلغ إلى حساب: ${cfg.account_number ?? ""}`,
        `بنك: ${cfg.bank_name ?? ""}`,
        "أرسل صورة الإيصال عبر واتساب",
        "سيتم تأكيد طلبك خلال 24 ساعة",
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

    // Create payment record
    const { data: payment, error: dbErr } = await sb
      .from("payments")
      .insert({
        order_id:       req.orderId,
        provider_code:  req.providerCode,
        method:         req.providerCode,
        amount:         req.amount,
        currency:       req.currency,
        status:         "pending",
        idempotency_key: `${req.orderId}-${req.providerCode}-${Date.now()}`,
      })
      .select("id")
      .single();

    if (dbErr || !payment) {
      return { success: false, paymentId: "", status: "failed",
        instruction: { type: "reference" }, error: "فشل إنشاء سجل الدفع" };
    }

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
      .select("id, order_id, provider_code, status")
      .eq("id", req.paymentId)
      .single();

    if (!payment) return { success: false, status: "failed", error: "السجل غير موجود" };
    if (payment.status === "paid") return { success: true, status: "paid" };

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
    }).eq("id", req.paymentId);

    await sb.from("orders").update({
      payment_status: finalStatus,
      status:         "confirmed",
    }).eq("id", payment.order_id);

    await this._log(payment.id, "confirm", payment.provider_code,
      { admin: req.adminUserId, ref: req.transactionRef },
      { status: finalStatus });

    return { success: true, status: finalStatus };
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
