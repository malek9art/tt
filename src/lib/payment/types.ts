// =====================================================
// Payment Gateway — Core Types
// All payment flows pass through these interfaces.
// =====================================================

export type PaymentStatus =
  | "pending"
  | "awaiting_confirmation"
  | "paid"
  | "failed"
  | "refunded"
  | "expired";

export type ProviderType =
  | "cod"
  | "stripe"
  | "manual_wallet"
  | "transfer_point"
  | "bank_transfer";

export type ConfirmationMode = "instant" | "manual" | "webhook" | "on_delivery";

// ── Provider Descriptor ──────────────────────────────
export interface PaymentProviderDescriptor {
  code: string;
  name: string;
  type: ProviderType;
  confirmationMode: ConfirmationMode;
  icon: string;
  description: string;
  isActive: boolean;
  isTestMode: boolean;
  minAmount?: number;
  maxAmount?: number;
  config: Record<string, unknown>;
}

// ── Initiate Request/Response ────────────────────────
export interface InitiatePaymentRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  providerCode: string;
  customerPhone?: string;
  customerName?: string;
  returnUrl?: string;
  metadata?: Record<string, unknown>;
  /** مرجع الدفع الفريد — يولّده الـGateway ويكتبه العميل في بيان التحويل */
  referenceCode?: string;
}

export interface PaymentInstruction {
  type: "redirect" | "qr_code" | "transfer_details" | "cod" | "reference";
  /** For redirect */
  url?: string;
  /** For QR */
  qrData?: string;
  /** For transfer/wallet */
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  referenceNumber?: string;
  /** Human-readable steps */
  steps?: string[];
  /** Extra data (transfer points list, etc.) */
  extra?: Record<string, unknown>;
}

export interface InitiatePaymentResult {
  success: boolean;
  paymentId: string;
  status: PaymentStatus;
  instruction: PaymentInstruction;
  expiresAt?: string;
  error?: string;
  /** معرّف العملية عند المزوّد (مثل Stripe PaymentIntent id) — يُحفظ في provider_txn_id
   *  ليتمكّن handleWebhook لاحقاً من مطابقة الدفعة بواسطته */
  providerTxnId?: string;
}

// ── Confirm (manual admin confirmation) ─────────────
export interface ConfirmPaymentRequest {
  paymentId: string;
  adminUserId: string;
  transactionRef?: string;
  notes?: string;
  /** المبلغ المدفوع فعلاً كما تحقق منه الأدمن */
  paidAmount?: number;
}

export interface ConfirmPaymentResult {
  success: boolean;
  status: PaymentStatus;
  error?: string;
}

// ── Webhook ──────────────────────────────────────────
export interface WebhookPayload {
  providerCode: string;
  rawBody: string;
  headers: Record<string, string>;
  signature?: string;
}

export interface WebhookResult {
  verified: boolean;
  paymentId?: string;
  status?: PaymentStatus;
  providerTxnId?: string;
  error?: string;
}

// ── Provider Adapter Interface ───────────────────────
// Every provider implements this. Adding a new provider = new class, zero changes elsewhere.
export interface IPaymentProvider {
  readonly code: string;
  readonly type: ProviderType;
  readonly confirmationMode: ConfirmationMode;

  /**
   * Initiate a payment and return instructions for the customer.
   */
  initiate(req: InitiatePaymentRequest): Promise<InitiatePaymentResult>;

  /**
   * Verify and process an incoming webhook from the provider.
   * Return null if this provider does not support webhooks.
   */
  handleWebhook?(payload: WebhookPayload): Promise<WebhookResult>;

  /**
   * Admin manually confirms a manual/transfer payment.
   * Return null if not applicable (e.g. Stripe handles this via webhook).
   */
  confirmManually?(req: ConfirmPaymentRequest): Promise<ConfirmPaymentResult>;
}
