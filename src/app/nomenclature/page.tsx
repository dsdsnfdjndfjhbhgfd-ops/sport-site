import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { plural } from "@/lib/plural";

export const metadata = { title: "Номенклатор" };

/** Полный перечень позиций: все товары на витрине, включая закончившиеся, с остатками по размерам. */
export default async function NomenclaturePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: {
      products: {
        where: { active: true, ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}) },
        orderBy: { name: "asc" },
        include: { sizes: { orderBy: { position: "asc" } } },
      },
    },
  });
  const groups = categories.filter((c) => c.products.length);
  const total = groups.reduce((n, c) => n + c.products.length, 0);

  return (
    <div className="container" style={{ paddingBottom: 96 }}>
      <div className="page-head">
        <div className="crumbs">
          <Link href="/">Главная</Link> / Номенклатор
        </div>
        <h1>Номенклатор</h1>
      </div>
      <div className="nomen-tools">
        <span>
          {total} {plural(total, "позиция", "позиции", "позиций")} в {groups.length}{" "}
          {plural(groups.length, "категории", "категориях", "категориях")}, включая закончившиеся
        </span>
        <form>
          <input className="input" name="q" defaultValue={q} placeholder="Найти по названию" aria-label="Найти по названию" />
        </form>
      </div>
      {groups.map((c) => (
        <section key={c.id} className="nomen-group">
          <h2>{c.name}</h2>
          <div className="panel table-wrap" style={{ padding: "8px 20px" }}>
            <table className="table nomen-table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Размеры и остатки</th>
                  <th>Всего</th>
                  <th>Цена</th>
                </tr>
              </thead>
              <tbody>
                {c.products.map((p) => {
                  const stock = p.sizes.reduce((n, s) => n + Math.max(0, s.stock), 0);
                  return (
                    <tr key={p.id} className={stock ? "" : "nomen-out"}>
                      <td>
                        <Link href={`/product/${p.slug}`} className="nomen-name">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.imageUrl} alt="" className="thumb" loading="lazy" />
                          <span>{p.name}</span>
                        </Link>
                      </td>
                      <td>
                        {p.sizes.some((s) => s.size) ? (
                          <div className="stock-chips">
                            {p.sizes.map((s) => (
                              <span key={s.size} className={s.stock > 0 ? "" : "out"}>
                                {s.size}: {Math.max(0, s.stock)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="muted">без размера</span>
                        )}
                      </td>
                      <td>{stock ? `${stock} шт.` : "нет в наличии"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span className={p.oldPrice ? "price sale" : "price"}>{formatPrice(p.price)}</span>
                        {p.oldPrice && <div className="old-price">{formatPrice(p.oldPrice)}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {!groups.length && <p className="empty">{q ? `По запросу «${q}» ничего не найдено` : "Товаров пока нет"}</p>}
    </div>
  );
}
