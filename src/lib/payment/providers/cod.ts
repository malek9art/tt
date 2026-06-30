import type {
  IPaymentProvider, InitiatePaymentRequest, InitiatePaymentResult,
  ConfirmPaymentRequest, ConfirmPaymentResult,
} from "../types";

export class CodProvider implements IPaymentProvider {
  readonly code = "cod";
  readonly type = "cod" as const;
  readonly confirmationMode = "on_delivery" as const;

  async initiate(req: InitiatePaymentRequest): Promise<InitiatePaymentResult> {
    return {
      success:   true,
      paymentId: req.orderId,
      status:    "pending",
      instruction: {
        type:  "cod",
        steps: [
          "سيتواصل معك أحد موظفينا لتأكيد الطلب",
          "سيتم توصيل الطلب إلى عنوانك",
          "ادفع المبلغ عند استلام الطلب",
        ],
      },
    };
  }

  async confirmManually(req: ConfirmPaymentRequest): Promise<ConfirmPaymentResult> {
    // COD يُعتبر مدفوعاً عند تأكيد التسليم من المندوب
    return { success: true, status: "paid" };
  }
}
