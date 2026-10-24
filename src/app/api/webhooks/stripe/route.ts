import Stripe from "stripe";
import { applyPaymentStatus } from "@/lib/payments";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) return new Response("Stripe не настроен", { status: 400 });

  const signature = req.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event;
  try {
    event = new Stripe(key).webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return new Response("Неверная подпись", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.expired") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await applyPaymentStatus(
        orderId,
        event.type === "checkout.session.completed" && session.payment_status === "paid" ? "PAID" : "CANCELED",
      );
    }
  }
  return Response.json({ received: true });
}
