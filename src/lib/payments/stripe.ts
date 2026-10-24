import Stripe from "stripe";
import type { PaymentProvider } from "./types";
import { appUrl } from "./url";

function client() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY не задан");
  return new Stripe(key);
}

export const stripeProvider: PaymentProvider = {
  name: "stripe",
  async createPayment({ orderId, amount, description, email }) {
    const session = await client().checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: process.env.STRIPE_CURRENCY || "rub",
            unit_amount: amount,
            product_data: { name: description },
          },
        },
      ],
      metadata: { orderId },
      success_url: `${appUrl()}/checkout/success?order=${orderId}`,
      cancel_url: `${appUrl()}/cart`,
    });
    return { paymentId: session.id, redirectUrl: session.url! };
  },
  async getStatus(paymentId) {
    const session = await client().checkout.sessions.retrieve(paymentId);
    if (session.payment_status === "paid") return "PAID";
    if (session.status === "expired") return "CANCELED";
    return "PENDING";
  },
};
