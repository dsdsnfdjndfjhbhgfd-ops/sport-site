import Link from "next/link";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { plural } from "@/lib/plural";

export const metadata = { title: "Сезонные коллекции" };

/** Товары, сгруппированные по сезону, который задаётся в админке у каждого товара. */
export default async function CollectionsPage() {
  const products = await db.product.findMany({
    where: { active: true, season: { not: null } },
    orderBy: [{ season: "desc" }, { createdAt: "desc" }],
    include: { category: true },
  });
  const seasons = new Map<string, typeof products>();
  for (const p of products) {
    const list = seasons.get(p.season!) ?? [];
    list.push(p);
    seasons.set(p.season!, list);
  }

  return (
    <div className="container" style={{ paddingBottom: 96 }}>
      <div className="page-head">
        <div className="crumbs">
          <Link href="/">Главная</Link> / Сезонные коллекции
        </div>
        <h1>Сезонные коллекции</h1>
      </div>
      {[...seasons].map(([season, items]) => (
        <section key={season} className="collection">
          <div className="collection-head">
            <h2>{season}</h2>
            <span>
              {items.length} {plural(items.length, "товар", "товара", "товаров")}
            </span>
          </div>
          <div className="grid">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ))}
      {!seasons.size && (
        <div className="empty">
          <p>Коллекций пока нет. Укажите сезон у товаров в админке, и они появятся здесь.</p>
          <Link href="/catalog" className="btn">
            В торговый каталог
          </Link>
        </div>
      )}
    </div>
  );
}
