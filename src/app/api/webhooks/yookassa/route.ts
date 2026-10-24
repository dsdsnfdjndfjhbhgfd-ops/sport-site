import { db } from "@/lib/db";
import { applyPaymentStatus, getProvider } from "@/lib/payments";

/**
 * Уведомления ЮKassa. Телу запроса не доверяем: берём id платежа
 * и перепроверяем его статус через API.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const paymentId: string | undefined = body?.object?.id;
  if (!paymentId) return new Response("bad request", { status: 400 });

  const order = await db.order.findFirst({ where: { paymentId, paymentProvider: "yookassa" } });
  if (order) {
    const status = await getProvider("yookassa").getStatus(paymentId);
    await applyPaymentStatus(order.id, status);
  }
  return Response.json({ ok: true });
}
