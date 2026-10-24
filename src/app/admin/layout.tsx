import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Админ-панель" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="admin">
      <aside className="admin-side">
        <h3>Админ-панель</h3>
        <Link href="/admin">Обзор</Link>
        <Link href="/admin/products">Товары и цены</Link>
        <Link href="/admin/products/new">+ Добавить товар</Link>
        <Link href="/admin/categories">Категории</Link>
        <Link href="/admin/orders">Заказы</Link>
        <Link href="/admin/users">Пользователи</Link>
        <Link href="/" style={{ marginTop: 24 }}>
          ← На сайт
        </Link>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
