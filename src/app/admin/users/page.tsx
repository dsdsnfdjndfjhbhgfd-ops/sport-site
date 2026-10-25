import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { setUserRole } from "@/app/actions/admin";

export default async function AdminUsers() {
  const [me, users] = await Promise.all([
    getCurrentUser(),
    db.user.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { orders: true } } } }),
  ]);
  return (
    <>
      <h1>Пользователи</h1>
      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Email</th>
              <th>Заказов</th>
              <th>Регистрация</th>
              <th>Соглашение</th>
              <th>Роль</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u._count.orders}</td>
                <td>{u.createdAt.toLocaleDateString("ru-RU")}</td>
                <td className={u.termsAcceptedAt ? "" : "muted"}>
                  {u.termsAcceptedAt
                    ? `принято ${u.termsAcceptedAt.toLocaleDateString("ru-RU")} (ред. ${u.termsVersion})`
                    : "не принималось"}
                </td>
                <td>
                  {u.id === me?.id ? (
                    <span className="status">Админ (вы)</span>
                  ) : (
                    <form action={setUserRole.bind(null, u.id)} className="price-form">
                      <select name="role" defaultValue={u.role} className="input" style={{ padding: 6, width: "auto" }}>
                        <option value="USER">Покупатель</option>
                        <option value="ADMIN">Администратор</option>
                      </select>
                      <button className="btn btn-sm">OK</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
