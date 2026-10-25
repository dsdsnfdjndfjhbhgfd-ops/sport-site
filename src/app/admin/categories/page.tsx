import { db } from "@/lib/db";
import { deleteCategory } from "@/app/actions/admin";
import { CategoryForm } from "./CategoryForm";

export default async function AdminCategories() {
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return (
    <>
      <h1>Категории</h1>
      <div className="panel">
        <CategoryForm />
      </div>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Адрес</th>
              <th>Товаров</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="muted">/catalog?category={c.slug}</td>
                <td>{c._count.products}</td>
                <td>
                  {c._count.products === 0 && (
                    <form action={deleteCategory.bind(null, c.id)}>
                      <button className="link-btn">Удалить</button>
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
