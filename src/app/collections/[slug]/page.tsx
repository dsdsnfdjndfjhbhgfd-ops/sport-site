import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { plural } from "@/lib/plural";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const collection = await db.collection.findUnique({ where: { slug } });
  return { title: collection?.name ?? "Коллекция" };
}

export default async function CollectionPage({ params }: Params) {
  const { slug } = await params;
  const collection = await db.collection.findUnique({
    where: { slug },
    include: {
      items: {
        where: { product: { active: true } },
        orderBy: { position: "asc" },
        include: { product: { include: { category: true } } },
      },
    },
  });
  if (!collection || !collection.active) notFound();
  const count = collection.items.length;

  return (
    <div className="container" style={{ paddingBottom: 96 }}>
      <div className="page-head">
        <div className="crumbs">
          <Link href="/">Главная</Link> / <Link href="/collections">Коллекции</Link> / {collection.name}
        </div>
        <h1>{collection.name}</h1>
        {collection.description && <p className="collection-text">{collection.description}</p>}
        <p className="muted">
          {count} {plural(count, "товар", "товара", "товаров")}
        </p>
      </div>
      {count ? (
        <div className="grid">
          {collection.items.map(({ product }) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>В этой коллекции пока нет товаров.</p>
          <Link href="/collections" className="btn">
            Все коллекции
          </Link>
        </div>
      )}
    </div>
  );
}
