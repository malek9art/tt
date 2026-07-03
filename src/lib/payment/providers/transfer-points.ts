import type {
  IPaymentProvider, InitiatePaymentRequest, InitiatePaymentResult,
  ConfirmPaymentRequest, ConfirmPaymentResult,
} from "../types";

export interface TransferPoint {
  id: string;
  label: string;
  phone: string;
  accountName?: string;
  notes?: string;
  iconUrl?: string;
  /** قيمة QR مخصصة — تحل محل الهاتف في الرمز عند وجودها */
  qrValue?: string;
}

// Adapter for money-transfer networks (Kuraimi, Qutaibi…).
// Points are admin-managed in DB; passed in at construction time by the gateway.
export class TransferPointsProvider implements IPaymentProvider {
  readonly type = "transfer_point" as const;
  readonly confirmationMode = "manual" as const;

  constructor(
    readonly code: string,
    private readonly networkName: string,
    private readonly points: TransferPoint[],
  ) {}

  async initiate(req: InitiatePaymentRequest): Promise<InitiatePaymentResult> {
    const reference = req.referenceCode ?? req.orderNumber;
    return {
      success:   true,
      paymentId: req.orderId,
      status:    "awaiting_confirmation",
      instruction: {
        type:            "transfer_details",
        referenceNumber: reference,
        steps: [
          `توجّه إلى أقرب نقطة ${this.networkName} منك`,
          `اطلب التحويل بمبلغ ${req.amount.toLocaleString("ar")} ${req.currency}`,
          `اذكر رقم المرجع: ${reference} ليُكتب في بيان الحوالة`,
          "احتفظ بإيصال التحويل",
          "سيتم تأكيد طلبك بعد مراجعة الدفع",
        ],
        extra: { points: this.points, networkName: this.networkName },
      },
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    };
  }

  async confirmManually(_req: ConfirmPaymentRequest): Promise<ConfirmPaymentResult> {
    return { success: true, status: "paid" };
  }
}
