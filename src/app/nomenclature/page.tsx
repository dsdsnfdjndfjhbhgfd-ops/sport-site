import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { plural } from "@/lib/plural";
import { CatalogFilters } from "@/components/CatalogFilters";
import { FilterChips } from "@/components/FilterChips";
import { activeFilterCount, applyFacets, baseWhere, parseFilters, type RawSearch } from "@/lib/filters";

export const metadata = { title: "Номенклатор" };

/** Полный перечень позиций: все товары на витрине, включая закончившиеся, с остатками по размерам. */
export default async function NomenclaturePage({ searchParams }: { searchParams: Promise<RawSearch> }) {
  const filters = parseFilters(await searchParams);
  const products = await db.product.findMany({
    where: baseWhere(filters, { inStock: false }),
    orderBy: { name: "asc" },
    include: { category: true, sizes: { orderBy: { position: "asc" } } },
  });
  const { items, facets } = applyFacets(products, filters, { inStock: false });

  const groups = new Map<string, { name: string; products: typeof items }>();
  for (const p of items) {
    const g = groups.get(p.categoryId) ?? { name: p.category.name, products: [] };
    g.products.push(p);
    groups.set(p.categoryId, g);
  }
  const sorted = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));

  return (
    <div className="container" style={{ paddingBottom: 96 }}>
      <div className="page-head">
        <div className="crumbs">
          <Link href="/">Главная</Link> / Номенклатор
        </div>
        <h1>Номенклатор</h1>
      </div>
      <div className="catalog">
        <aside className="filters">
          <form className="nomen-search">
            <input className="input" name="q" defaultValue={filters.q} placeholder="Найти по названию" aria-label="Найти по названию" />
          </form>
          <CatalogFilters facets={facets} selected={filters} keep={{ q: filters.q }} activeCount={activeFilterCount(filters)} />
        </aside>
        <div>
          <div className="toolbar">
            <span>
              {items.length} {plural(items.length, "позиция", "позиции", "позиций")} в {sorted.length}{" "}
              {plural(sorted.length, "категории", "категориях", "категориях")}, включая закончившиеся
            </span>
          </div>
          <FilterChips filters={filters} path="/nomenclature" />
          {sorted.map((g) => (
            <section key={g.name} className="nomen-group">
              <h2>{g.name}</h2>
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
                    {g.products.map((p) => {
                      const stock = p.sizes.reduce((n, s) => n + Math.max(0, s.stock), 0);
                      const traits = [p.kind, p.material, p.color, p.gender].filter(Boolean).join(", ");
                      return (
                        <tr key={p.id} className={stock ? "" : "nomen-out"}>
                          <td>
                            <Link href={`/product/${p.slug}`} className="nomen-name">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.imageUrl} alt="" className="thumb" loading="lazy" />
                              <span>
                                {p.name}
                                {traits && <small className="nomen-traits">{traits}</small>}
                              </span>
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
          {!sorted.length && (
            <div className="empty">
              <p>Под выбранные условия ничего не подходит. Попробуйте убрать часть фильтров.</p>
              <Link href="/nomenclature" className="btn btn-outline">
                Сбросить фильтры
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
