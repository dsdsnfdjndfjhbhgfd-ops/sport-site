import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUSES } from "@/lib/orders";
import { setOrderStatus } from "@/app/actions/admin";

export default async function AdminOrders() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, items: true },
    take: 200,
  });
  return (
    <>
      <h1>Заказы</h1>
      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Заказ</th>
              <th>Покупатель</th>
              <th>Состав</th>
              <th>Сумма</th>
              <th>Оплата</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/account/orders/${o.id}`} style={{ textDecoration: "underline" }}>
                    №{o.id.slice(-8).toUpperCase()}
                  </Link>
                  <div className="muted">{o.createdAt.toLocaleString("ru-RU")}</div>
                </td>
                <td>
                  {o.fullName}
                  <div className="muted">
                    {o.user.email}, {o.phone}
                  </div>
                </td>
                <td style={{ fontSize: 13 }}>
                  {o.items.map((i) => (
                    <div key={i.id}>
                      {i.name} ({i.size}) × {i.quantity}
                    </div>
                  ))}
                </td>
                <td>{formatPrice(o.total)}</td>
                <td className="muted">{o.paymentProvider}</td>
                <td>
                  <form action={setOrderStatus.bind(null, o.id)} className="price-form">
                    <select name="status" defaultValue={o.status} className="input" style={{ padding: 6, width: "auto" }}>
                      {Object.entries(ORDER_STATUSES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <button className="btn btn-sm">OK</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.length && <p className="muted">Заказов пока нет</p>}
      </div>
    </>
  );
}
