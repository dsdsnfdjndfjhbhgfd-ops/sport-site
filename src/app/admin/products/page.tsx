import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { toggleProduct, updatePrice } from "@/app/actions/admin";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const products = await db.product.findMany({
    where: q ? { name: { contains: q } } : undefined,
    orderBy: { createdAt: "desc" },
    include: { category: true, sizes: { orderBy: { position: "asc" } } },
  });

  return (
    <>
      <div className="section-head">
        <h1 style={{ margin: 0 }}>Товары и цены</h1>
        <Link href="/admin/products/new" className="btn btn-sm">
          + Добавить товар
        </Link>
      </div>
      <div className="panel">
        <form style={{ marginBottom: 16 }}>
          <input className="input" name="q" defaultValue={q} placeholder="Поиск по названию" style={{ maxWidth: 320 }} />
        </form>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Товар</th>
                <th>Категория</th>
                <th>Цена, ₽</th>
                <th>Остаток</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={p.active ? "" : "inactive"}>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt="" className="thumb" />
                  </td>
                  <td>
                    <Link href={`/admin/products/${p.id}`} style={{ fontWeight: 500 }}>
                      {p.name}
                    </Link>
                    {!p.active && <div className="muted">скрыт</div>}
                  </td>
                  <td>{p.category.name}</td>
                  <td>
                    <form action={updatePrice.bind(null, p.id)} className="price-form">
                      <input name="price" defaultValue={(p.price / 100).toString()} inputMode="decimal" aria-label="Цена" />
                      <button className="btn btn-sm">OK</button>
                    </form>
                    {p.oldPrice && <div className="muted">было {formatPrice(p.oldPrice)}</div>}
                  </td>
                  <td>
                    <b>{p.sizes.reduce((n, s) => n + s.stock, 0)} шт.</b>
                    {p.sizes.some((s) => s.size) && (
                      <div className="stock-chips">
                        {p.sizes.map((s) => (
                          <span key={s.size} className={s.stock > 0 ? "" : "out"}>
                            {s.size}: {s.stock}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link href={`/admin/products/${p.id}`} style={{ textDecoration: "underline" }}>
                        Изменить
                      </Link>
                      <form action={toggleProduct.bind(null, p.id)}>
                        <button className="link-btn">{p.active ? "Скрыть" : "Показать"}</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!products.length && <p className="muted">Товаров не найдено</p>}
        </div>
      </div>
    </>
  );
}
