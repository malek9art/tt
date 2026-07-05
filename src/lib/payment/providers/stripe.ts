import type {
  IPaymentProvider, InitiatePaymentRequest, InitiatePaymentResult,
  WebhookPayload, WebhookResult,
} from "../types";

// Stripe adapter — activated when STRIPE_SECRET_KEY env var is set.
// Requires `npm install stripe` to enable; the adapter fails gracefully if not installed.
export class StripeProvider implements IPaymentProvider {
  readonly code = "stripe";
  readonly type = "stripe" as const;
  readonly confirmationMode = "instant" as const;

  private get secretKey(): string {
    return process.env.STRIPE_SECRET_KEY ?? "";
  }

  async initiate(req: InitiatePaymentRequest): Promise<InitiatePaymentResult> {
    if (!this.secretKey) {
      return {
        success: false, paymentId: "", status: "failed",
        instruction: { type: "reference" },
        error: "Stripe غير مُعدّ — أضف STRIPE_SECRET_KEY في متغيرات البيئة",
      };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Stripe = require("stripe");
      const stripe = new Stripe(this.secretKey, { apiVersion: "2025-05-28.basil" });

      const intent = await stripe.paymentIntents.create({
        amount:   Math.round(req.amount * 100),
        currency: req.currency.toLowerCase(),
        metadata: { order_id: req.orderId, order_number: req.orderNumber },
        automatic_payment_methods: { enabled: true },
        return_url: req.returnUrl,
      });

      return {
        success:   true,
        paymentId: req.orderId,
        status:    "pending",
        instruction: {
          type:            "redirect",
          referenceNumber: intent.id,
          extra:           { clientSecret: intent.client_secret },
        },
        providerTxnId: intent.id,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stripe error";
      return { success: false, paymentId: "", status: "failed",
        instruction: { type: "reference" }, error: msg };
    }
  }

  async handleWebhook(payload: WebhookPayload): Promise<WebhookResult> {
    if (!this.secretKey) return { verified: false, error: "Stripe not configured" };

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
    if (!webhookSecret) return { verified: false, error: "STRIPE_WEBHOOK_SECRET not set" };

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Stripe = require("stripe");
      const stripe = new Stripe(this.secretKey, { apiVersion: "2025-05-28.basil" });

      const event = stripe.webhooks.constructEvent(
        payload.rawBody,
        payload.headers["stripe-signature"] ?? "",
        webhookSecret,
      );

      if (event.type === "payment_intent.succeeded") {
        return { verified: true, providerTxnId: event.data.object.id, status: "paid" };
      }
      if (event.type === "payment_intent.payment_failed") {
        return { verified: true, status: "failed" };
      }
      return { verified: true };
    } catch {
      return { verified: false, error: "Invalid Stripe signature" };
    }
  }
}
