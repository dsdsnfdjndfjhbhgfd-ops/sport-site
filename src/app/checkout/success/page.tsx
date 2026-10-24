import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncOrderPayment } from "@/lib/payments";

export const metadata = { title: "Статус заказа" };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderId } = await searchParams;
  if (!orderId) notFound();
  const user = await requireUser(`/checkout/success?order=${orderId}`);

  try {
    await syncOrderPayment(orderId);
  } catch (e) {
    console.error(e);
  }
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== user.id) notFound();

  const number = order.id.slice(-8).toUpperCase();
  return (
    <div className="container auth" style={{ textAlign: "center" }}>
      {order.status === "PAID" ? (
        <>
          <h1>Спасибо за заказ!</h1>
          <p>Заказ №{number} оплачен. Мы свяжемся с вами для подтверждения доставки.</p>
        </>
      ) : order.status === "CANCELED" ? (
        <>
          <h1>Оплата не прошла</h1>
          <p>Платёж по заказу №{number} отклонён.</p>
        </>
      ) : (
        <>
          <h1>Ожидаем оплату</h1>
          <p>Заказ №{number} создан. Как только платёж подтвердится, статус обновится.</p>
        </>
      )}
      <div className="hero-actions" style={{ justifyContent: "center" }}>
        <Link href={`/account/orders/${order.id}`} className="btn">
          Открыть заказ
        </Link>
        <Link href="/catalog" className="btn btn-outline">
          Продолжить покупки
        </Link>
      </div>
    </div>
  );
}
