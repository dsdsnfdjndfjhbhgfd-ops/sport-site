import Link from "next/link";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { CatalogFilters } from "@/components/CatalogFilters";
import { FilterChips } from "@/components/FilterChips";
import { activeFilterCount, applyFacets, baseWhere, parseFilters, type RawSearch } from "@/lib/filters";
import { plural } from "@/lib/plural";
import { SortSelect } from "./SortSelect";

export const metadata = { title: "Торговый каталог" };

type Product = { price: number; name: string; createdAt: Date };
const SORTS: Record<string, (a: Product, b: Product) => number> = {
  new: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  cheap: (a, b) => a.price - b.price,
  expensive: (a, b) => b.price - a.price,
  name: (a, b) => a.name.localeCompare(b.name, "ru"),
};

export default async function CatalogPage({ searchParams }: { searchParams: Promise<RawSearch> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const sort = typeof sp.sort === "string" && sp.sort in SORTS ? sp.sort : "new";
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });
  const current = categories.find((c) => c.slug === filters.category);

  // торговый каталог — только то, что можно купить; полный перечень в номенклаторе
  const products = await db.product.findMany({
    where: baseWhere(filters, { inStock: true, categoryId: current?.id }),
    include: { category: true, sizes: true },
  });
  const { items, facets } = applyFacets(products, filters, { inStock: true });
  items.sort(SORTS[sort]);

  const categoryHref = (slug?: string) => {
    const qs = new URLSearchParams();
    if (slug) qs.set("category", slug);
    if (filters.q) qs.set("q", filters.q);
    if (sort !== "new") qs.set("sort", sort);
    return `/catalog${qs.size ? `?${qs}` : ""}`;
  };

  const title = filters.q
    ? `Поиск: ${filters.q}`
    : current?.name ?? (filters.sale ? "Распродажа" : "Торговый каталог");

  return (
    <div className="container">
      <div className="page-head">
        <div className="crumbs">
          <Link href="/">Главная</Link> / <Link href="/catalog">Торговый каталог</Link>
          {current && <> / {current.name}</>}
        </div>
        <h1>{title}</h1>
      </div>
      <div className="catalog">
        <aside className="filters">
          <h4>Категории</h4>
          <ul>
            <li>
              <Link href={categoryHref()} className={!current ? "active" : ""}>
                Все товары
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={categoryHref(c.slug)} className={current?.id === c.id ? "active" : ""}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
          <CatalogFilters
            facets={facets}
            selected={filters}
            keep={{ category: filters.category, q: filters.q, sort: sort === "new" ? undefined : sort }}
            activeCount={activeFilterCount(filters)}
          />
        </aside>
        <div>
          <div className="toolbar">
            <span>
              {items.length} {plural(items.length, "товар", "товара", "товаров")}
            </span>
            <SortSelect value={sort} />
          </div>
          <FilterChips filters={filters} path="/catalog" sort={sort === "new" ? undefined : sort} />
          {items.length ? (
            <div className="grid">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <p>Под выбранные фильтры ничего не подходит. Попробуйте убрать часть условий.</p>
              <Link href={categoryHref(current?.slug)} className="btn btn-outline">
                Сбросить фильтры
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
