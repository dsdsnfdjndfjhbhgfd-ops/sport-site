import Link from "next/link";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { plural } from "@/lib/plural";

export const metadata = { title: "Коллекции" };

/** Сколько товаров коллекции показывать на общей странице; остальные — на странице коллекции. */
const PREVIEW = 8;

/** Подборки товаров, которые собирают администраторы, в заданном ими порядке. */
export default async function CollectionsPage() {
  const collections = await db.collection.findMany({
    where: { active: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      items: {
        where: { product: { active: true } },
        orderBy: { position: "asc" },
        include: { product: { include: { category: true } } },
      },
    },
  });
  const shown = collections.filter((c) => c.items.length);

  return (
    <div className="container" style={{ paddingBottom: 96 }}>
      <div className="page-head">
        <div className="crumbs">
          <Link href="/">Главная</Link> / Коллекции
        </div>
        <h1>Коллекции</h1>
      </div>
      {shown.map((c) => (
        <section key={c.id} className="collection">
          <div className="collection-head">
            <h2>
              <Link href={`/collections/${c.slug}`}>{c.name}</Link>
            </h2>
            <Link href={`/collections/${c.slug}`}>
              {c.items.length > PREVIEW ? "Все " : ""}
              {c.items.length} {plural(c.items.length, "товар", "товара", "товаров")}
            </Link>
          </div>
          {c.description && <p className="collection-text">{c.description}</p>}
          <div className="grid">
            {c.items.slice(0, PREVIEW).map(({ product }) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
      {!shown.length && (
        <div className="empty">
          <p>Коллекций пока нет. Скоро здесь появятся подборки товаров.</p>
          <Link href="/catalog" className="btn">
            В торговый каталог
          </Link>
        </div>
      )}
    </div>
  );
}
