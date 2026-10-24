import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUSES } from "@/lib/orders";
import { retryPayment } from "@/app/actions/checkout";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/account/orders/${id}`);
  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order || (order.userId !== user.id && user.role !== "ADMIN")) notFound();

  return (
    <div className="container" style={{ paddingBottom: 80, maxWidth: 820 }}>
      <div className="page-head">
        <div className="crumbs">
          <Link href="/account">Личный кабинет</Link> / Заказ
        </div>
        <h1>Заказ №{order.id.slice(-8).toUpperCase()}</h1>
        <span className={`status status-${order.status}`}>{ORDER_STATUSES[order.status] ?? order.status}</span>
      </div>
      {order.items.map((i) => (
        <div key={i.id} className="summary-row">
          <span>
            {i.name} · {i.size} × {i.quantity}
          </span>
          <span>{formatPrice(i.price * i.quantity)}</span>
        </div>
      ))}
      <div className="summary-row summary-total">
        <span>Итого (с доставкой)</span>
        <span>{formatPrice(order.total)}</span>
      </div>
      <div className="notice" style={{ marginTop: 24 }}>
        {order.fullName}, {order.phone}
        <br />
        {order.address}
      </div>
      {order.status === "PENDING" && order.userId === user.id && (
        <form action={retryPayment.bind(null, order.id)}>
          <button className="btn btn-red">Оплатить заказ</button>
        </form>
      )}
    </div>
  );
}
