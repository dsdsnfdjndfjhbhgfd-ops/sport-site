import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUSES } from "@/lib/orders";
import { logout } from "@/app/actions/auth";
import { DeleteAccountForm } from "./DeleteAccountForm";

export const metadata = { title: "Личный кабинет" };

export default async function AccountPage() {
  const user = await requireUser();
  const consent = await db.user.findUnique({ where: { id: user.id }, select: { personalDataConsentAt: true } });
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

      <section className="my-data">
        <h2>Мои данные</h2>
        <dl className="legal-details">
          <dt>Имя</dt>
          <dd>{user.name}</dd>
          <dt>Электронная почта</dt>
          <dd>{user.email}</dd>
          {consent?.personalDataConsentAt && (
            <>
              <dt>Согласие на обработку данных</dt>
              <dd>
                дано {consent.personalDataConsentAt.toLocaleDateString("ru-RU")} —{" "}
                <Link href="/consent">текст согласия</Link>
              </dd>
            </>
          )}
        </dl>
        <p>
          <a href="/api/account/export" download>
            Скачать мои данные
          </a>{" "}
          <span className="muted">— учётная запись и заказы одним файлом</span>
        </p>
        <h3>Удаление учётной записи</h3>
        <p className="muted">
          Удаление отзывает согласие на обработку персональных данных. Как мы храним и удаляем данные — в{" "}
          <Link href="/privacy">политике</Link>.
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
