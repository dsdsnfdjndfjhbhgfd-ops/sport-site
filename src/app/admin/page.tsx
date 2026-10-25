import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUSES } from "@/lib/orders";

export default async function AdminHome() {
  const [products, users, orders, revenue, recent] = await Promise.all([
    db.product.count({ where: { active: true } }),
    db.user.count(),
    db.order.count(),
    db.order.aggregate({ _sum: { total: true }, where: { status: { in: ["PAID", "SHIPPED", "DELIVERED"] } } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: true } }),
  ]);
  return (
    <>
      <h1>Обзор</h1>
      <div className="stats">
        <div className="stat"><b>{products}</b><span>Товаров на витрине</span></div>
        <div className="stat"><b>{orders}</b><span>Заказов</span></div>
        <div className="stat"><b>{formatPrice(revenue._sum.total ?? 0)}</b><span>Выручка</span></div>
        <div className="stat"><b>{users}</b><span>Пользователей</span></div>
      </div>
      <div className="panel">
        <div className="section-head" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Последние заказы</h3>
          <Link href="/admin/orders">Все заказы</Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td>№{o.id.slice(-8).toUpperCase()}</td>
                  <td>{o.user.email}</td>
                  <td>{formatPrice(o.total)}</td>
                  <td><span className={`status status-${o.status}`}>{ORDER_STATUSES[o.status]}</span></td>
                </tr>
              ))}
              {!recent.length && <tr><td className="muted">Заказов пока нет</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
