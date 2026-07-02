import type {
  IPaymentProvider, InitiatePaymentRequest, InitiatePaymentResult,
  ConfirmPaymentRequest, ConfirmPaymentResult,
} from "../types";

export interface CurrencyAccount {
  currency: string;   // YER | SAR | USD
  label: string;      // ريال يمني | ريال سعودي | دولار أمريكي
  number: string;
}

interface WalletConfig {
  accountNumber?: string;      // legacy single account
  accountName?: string;
  bankName?: string;
  accounts?: CurrencyAccount[]; // multi-currency accounts
  instructions?: string[];
}

// Generic adapter for manual Yemeni e-wallets and bank accounts
// (Jawali, Jeeb, Floosak, OneCash, YemenMobile, أي بنك…)
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
    const accounts = this.cfg.accounts ?? [];
    // Prefer the account matching the order currency, fall back to legacy single number
    const matching      = accounts.find(a => a.currency === req.currency);
    const accountNumber = matching?.number ?? this.cfg.accountNumber ?? accounts[0]?.number ?? "";
    const accountName   = this.cfg.accountName ?? "";

    const steps = this.cfg.instructions ?? [
      `افتح تطبيق ${this.providerName}`,
      `أرسل مبلغ ${req.amount.toLocaleString("ar")} ${req.currency} إلى الرقم المناسب للعملة`,
      "بعد التحويل أرفق صورة الإيصال أو نص الإشعار في نفس الصفحة",
      "سيبقى طلبك قيد المراجعة حتى يتأكد فريقنا من استلام المبلغ",
    ];

    return {
      success:   true,
      paymentId: req.orderId,
      status:    "awaiting_confirmation",
      instruction: {
        type:          "transfer_details",
        accountNumber,
        accountName,
        bankName:      this.cfg.bankName,
        referenceNumber: req.orderNumber,
        steps,
        extra: accounts.length > 0 ? { accounts } : undefined,
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async confirmManually(_req: ConfirmPaymentRequest): Promise<ConfirmPaymentResult> {
    return { success: true, status: "paid" };
  }
}
