import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { completeMockPayment } from "@/app/actions/checkout";

export const metadata = { title: "Тестовая оплата" };

export default async function MockPayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const user = await requireUser(`/pay/mock/${orderId}`);
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== user.id || order.paymentProvider !== "mock") notFound();

  const action = completeMockPayment.bind(null, order.id);
  return (
    <div className="container auth">
      <div className="notice">Это тестовая платёжная страница. Подключите Stripe или ЮKassa в .env для реальных платежей.</div>
      <h1>Оплата заказа</h1>
      <p>
        Заказ №{order.id.slice(-8).toUpperCase()} на сумму <b>{formatPrice(order.total)}</b>
      </p>
      <form action={action}>
        <div className="field">
          <label>Номер карты</label>
          <input defaultValue="4242 4242 4242 4242" readOnly />
        </div>
        <button className="btn btn-red btn-block" name="result" value="success" disabled={order.status !== "PENDING"}>
          Оплатить {formatPrice(order.total)}
        </button>
        <button className="btn btn-outline btn-block" style={{ marginTop: 10 }} name="result" value="fail" disabled={order.status !== "PENDING"}>
          Отклонить платёж
        </button>
      </form>
    </div>
  );
}
