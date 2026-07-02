import type {
  IPaymentProvider, InitiatePaymentRequest, InitiatePaymentResult,
  ConfirmPaymentRequest, ConfirmPaymentResult,
} from "../types";

interface WalletConfig {
  accountNumber?: string;
  accountName?: string;
  instructions?: string[];
}

// Generic adapter for manual Yemeni e-wallets (Jawali, Jeeb, Floosak, OneCash, YemenMobile…)
// No API integration required — customer transfers manually, admin confirms.
export class ManualWalletProvider implements IPaymentProvider {
  readonly type = "manual_wallet" as const;
  readonly confirmationMode = "manual" as const;

  constructor(
    readonly code: string,
    private readonly providerName: string,
    private readonly cfg: WalletConfig = {},
  ) {}

  async initiate(req: InitiatePaymentRequest): Promise<InitiatePaymentResult> {
    const accountNumber = this.cfg.accountNumber ?? "";
    const accountName   = this.cfg.accountName   ?? "";
    const steps = this.cfg.instructions ?? [
      `افتح تطبيق ${this.providerName}`,
      `أرسل مبلغ ${req.amount.toLocaleString("ar")} ${req.currency} إلى الرقم: ${accountNumber}`,
      "احتفظ بصورة تأكيد التحويل",
      "سيتم تأكيد طلبك بعد مراجعة الدفع من فريقنا",
    ];

    return {
      success:   true,
      paymentId: req.orderId,
      status:    "awaiting_confirmation",
      instruction: {
        type:          "transfer_details",
        accountNumber,
        accountName,
        referenceNumber: req.orderNumber,
        steps,
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async confirmManually(_req: ConfirmPaymentRequest): Promise<ConfirmPaymentResult> {
    return { success: true, status: "paid" };
  }
}
