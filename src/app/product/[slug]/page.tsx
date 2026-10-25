import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { ProductCard } from "@/components/ProductCard";
import { AddToCart } from "./AddToCart";
import { ProductGallery } from "./ProductGallery";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug } });
  return { title: product?.name ?? "Товар" };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: true,
      sizes: { orderBy: { position: "asc" } },
      images: { orderBy: { position: "asc" } },
      collections: { where: { collection: { active: true } }, include: { collection: true } },
    },
  });
  if (!product || !product.active) notFound();

  const related = await db.product.findMany({
    where: { categoryId: product.categoryId, active: true, NOT: { id: product.id } },
    take: 4,
    include: { category: true },
  });
  const traits = (
    [
      ["Тип", product.kind],
      ["Материал", product.material],
      ["Цвет", product.color],
      ["Пол", product.gender],
      ["Коллекция", product.collections.map((c) => c.collection.name).join(", ")],
    ] as [string, string | null][]
  ).filter((t): t is [string, string] => Boolean(t[1]));
  const onSale = product.oldPrice && product.oldPrice > product.price;

  return (
    <div className="container">
      <div className="crumbs" style={{ paddingTop: 24 }}>
        <Link href="/">Главная</Link> / <Link href={`/catalog?category=${product.category.slug}`}>{product.category.name}</Link> / {product.name}
      </div>
      <div className="product">
        <ProductGallery
          images={product.images.length ? [...new Set(product.images.map((i) => i.url))] : [product.imageUrl]}
          name={product.name}
        />
        <div className="product-info">
          <div className="card-cat">{product.category.name}</div>
          <h1>{product.name}</h1>
          <div className="product-price">
            <span className={onSale ? "price sale" : "price"}>{formatPrice(product.price)}</span>
            {onSale && <span className="old-price">{formatPrice(product.oldPrice!)}</span>}
          </div>
          <AddToCart
            product={{
              productId: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              imageUrl: product.imageUrl,
            }}
            sizes={product.sizes.map(({ size, stock }) => ({ size, stock }))}
          />
          {traits.length > 0 && (
            <dl className="traits">
              {traits.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <h3 style={{ marginTop: 32 }}>Описание</h3>
          <p className="description">{product.description}</p>
          <ul className="perks">
            <li>Доставка по всей России</li>
            <li>Бесплатный возврат в течение 30 дней</li>
            <li>Безопасная онлайн-оплата</li>
          </ul>
        </div>
      </div>
      {related.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section-head">
            <h2>Вам может понравиться</h2>
          </div>
          <div className="grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
