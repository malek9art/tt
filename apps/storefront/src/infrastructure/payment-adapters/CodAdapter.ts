import type {
  IPaymentProvider,
  PaymentIntent,
  PaymentResult,
  RefundRequest,
  RefundResult,
} from "@/domains/payments/ports/IPaymentProvider";

/**
 * COD Adapter — الدفع عند الاستلام
 * أبسط المزوّدين: لا API خارجي، يُنشئ مرجعاً داخلياً فقط
 */
export class CodAdapter implements IPaymentProvider {
  readonly code = "cod";
  readonly name = "الدفع عند الاستلام";

  async initiatePayment(intent: PaymentIntent): Promise<PaymentResult> {
    // COD لا يحتاج استدعاء خارجي
    return {
      success:        true,
      transactionRef: `COD-${intent.orderId}-${Date.now()}`,
      status:         "pending", // تُحوَّل إلى paid عند تأكيد المندوب
    };
  }

  async verifyPayment(transactionRef: string): Promise<PaymentResult> {
    // COD لا يُتحقق منه إلكترونياً — يتم عبر تأكيد المندوب
    return {
      success:        true,
      transactionRef,
      status:         "pending",
    };
  }

  async refund(_request: RefundRequest): Promise<RefundResult> {
    // COD لا يدعم استرداداً إلكترونياً
    return {
      success: false,
      error:   "الدفع عند الاستلام لا يدعم الاسترداد الإلكتروني — يُعالج يدوياً",
    };
  }

  verifyWebhook(_payload: unknown, _signature: string): boolean {
    // COD لا يُرسل Webhooks
    return true;
  }
}
