/**
 * IPaymentProvider — عقد وسائل الدفع المجرّدة
 * كل وسيلة دفع (Stripe، جوالي، جيب، COD) تُنفّذ هذا الـ interface
 * يتيح إضافة وسيلة جديدة دون تعديل باقي الكود
 */

export interface PaymentIntent {
  id:            string;
  amount:        number;
  currency:      string;
  orderId:       string;
  providerCode:  string;
  metadata?:     Record<string, unknown>;
}

export interface PaymentResult {
  success:        boolean;
  transactionRef: string | null;
  status:         "paid" | "pending" | "failed";
  redirectUrl?:   string;   // للمحافظ التي تحتاج redirect
  rawPayload?:    unknown;
  error?:         string;
}

export interface RefundRequest {
  transactionRef: string;
  amount:         number;
  reason?:        string;
}

export interface RefundResult {
  success:    boolean;
  refundId?:  string;
  error?:     string;
}

/**
 * الـ interface الذي يجب أن تُنفّذه كل وسيلة دفع
 */
export interface IPaymentProvider {
  /** كود المزوّد الفريد (stripe, jawali, jeeb, cod) */
  readonly code: string;

  /** اسم المزوّد للعرض */
  readonly name: string;

  /**
   * بدء عملية الدفع
   * @returns PaymentResult — مباشرة (COD) أو بعد redirect (محافظ)
   */
  initiatePayment(intent: PaymentIntent): Promise<PaymentResult>;

  /**
   * التحقق من حالة الدفع (للمحافظ التي تحتاج polling)
   */
  verifyPayment(transactionRef: string): Promise<PaymentResult>;

  /**
   * استرداد مبلغ
   */
  refund(request: RefundRequest): Promise<RefundResult>;

  /**
   * التحقق من صحة Webhook (التوقيع)
   */
  verifyWebhook(payload: unknown, signature: string): boolean;
}
