import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { SortSelect } from "./SortSelect";

export const metadata = { title: "Каталог" };

type Search = { category?: string; q?: string; sort?: string; sale?: string };

const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  new: { createdAt: "desc" },
  cheap: { price: "asc" },
  expensive: { price: "desc" },
  name: { name: "asc" },
};

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { category, q, sort = "new", sale } = await searchParams;
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });
  const current = categories.find((c) => c.slug === category);

  const where: Prisma.ProductWhereInput = { active: true };
  if (current) where.categoryId = current.id;
  if (sale) where.oldPrice = { not: null };
  if (q) where.OR = [{ name: { contains: q } }, { description: { contains: q } }];

  const products = await db.product.findMany({
    where,
    orderBy: SORTS[sort] ?? SORTS.new,
    include: { category: true },
  });

  const href = (params: Partial<Search>) => {
    const merged = { category, q, sort, sale, ...params };
    const qs = new URLSearchParams(
      Object.entries(merged).filter((e): e is [string, string] => Boolean(e[1])),
    );
    return `/catalog${qs.size ? `?${qs}` : ""}`;
  };

  const title = q ? `Поиск: ${q}` : sale ? "Распродажа" : current?.name ?? "Каталог";

  return (
    <div className="container">
      <div className="page-head">
        <div className="crumbs">
          <Link href="/">Главная</Link> / <Link href="/catalog">Каталог</Link>
          {current && <> / {current.name}</>}
        </div>
        <h1>{title}</h1>
      </div>
      <div className="catalog">
        <aside className="filters">
          <h4>Категории</h4>
          <ul>
            <li>
              <Link href={href({ category: undefined })} className={!current ? "active" : ""}>
                Все товары
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={href({ category: c.slug })} className={current?.id === c.id ? "active" : ""}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
          <h4>Предложения</h4>
          <ul>
            <li>
              <Link href={href({ sale: sale ? undefined : "1" })} className={sale ? "active" : ""}>
                Со скидкой
              </Link>
            </li>
          </ul>
        </aside>
        <div>
          <div className="toolbar">
            <span>{products.length} товаров</span>
            <SortSelect value={sort} />
          </div>
          {products.length ? (
            <div className="grid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <p className="empty">Ничего не найдено</p>
          )}
        </div>
      </div>
    </div>
  );
}
