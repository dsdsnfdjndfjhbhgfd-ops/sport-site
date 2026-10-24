import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUSES } from "@/lib/orders";
import { logout } from "@/app/actions/auth";

export const metadata = { title: "Личный кабинет" };

export default async function AccountPage() {
  const user = await requireUser();
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="page-head">
        <h1>Привет, {user.name}</h1>
        <div className="row-actions">
          <span className="muted">{user.email}</span>
          <form action={logout}>
            <button className="link-btn">Выйти</button>
          </form>
        </div>
      </div>
      <h2>Мои заказы</h2>
      {orders.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Дата</th>
                <th>Позиций</th>
                <th>Сумма</th>
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
                  </td>
                  <td>{o.createdAt.toLocaleDateString("ru-RU")}</td>
                  <td>{o._count.items}</td>
                  <td>{formatPrice(o.total)}</td>
                  <td>
                    <span className={`status status-${o.status}`}>{ORDER_STATUSES[o.status] ?? o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">
          Заказов пока нет. <Link href="/catalog" style={{ textDecoration: "underline" }}>Перейти в каталог</Link>
        </p>
      )}
    </div>
  );
}
