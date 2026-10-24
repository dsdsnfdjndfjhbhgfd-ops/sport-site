import Link from "next/link";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";

export default async function HomePage() {
  const [categories, newest, sale] = await Promise.all([
    db.category.findMany({
      orderBy: { name: "asc" },
      include: { products: { where: { active: true }, take: 1, orderBy: { createdAt: "desc" } } },
    }),
    db.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { category: true },
    }),
    db.product.findMany({
      where: { active: true, oldPrice: { not: null } },
      take: 4,
      include: { category: true },
    }),
  ]);

  return (
    <>
      <section className="hero">
        <div className="hero-stripes" />
        <div className="container hero-inner">
          <div className="hero-kicker">Новая коллекция</div>
          <h1>Играй на максимум</h1>
          <p>Форма, тренировочная одежда и экипировка для футбола, бега и зала. Сделано для движения.</p>
          <div className="hero-actions">
            <Link href="/catalog" className="btn btn-red">
              Смотреть каталог
            </Link>
            <Link href="/catalog?sale=1" className="btn btn-white">
              Распродажа
            </Link>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="section container">
          <div className="section-head">
            <h2>Категории</h2>
          </div>
          <div className="cat-grid">
            {categories.map((c) => (
              <Link key={c.id} href={`/catalog?category=${c.slug}`} className="cat-tile">
                {c.products[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.products[0].imageUrl} alt="" />
                )}
                <span>{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section container">
        <div className="section-head">
          <h2>Новинки</h2>
          <Link href="/catalog">Все товары</Link>
        </div>
        {newest.length ? (
          <div className="grid">
            {newest.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="empty">Товаров пока нет. Добавьте их в админ-панели.</p>
        )}
      </section>

      <section className="promo">
        <div className="container">
          <h2>Скидки до −40% на прошлый сезон</h2>
          <Link href="/catalog?sale=1" className="btn btn-white">
            Купить со скидкой
          </Link>
        </div>
      </section>

      {sale.length > 0 && (
        <section className="section container">
          <div className="section-head">
            <h2>Выгодно</h2>
            <Link href="/catalog?sale=1">Вся распродажа</Link>
          </div>
          <div className="grid">
            {sale.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
