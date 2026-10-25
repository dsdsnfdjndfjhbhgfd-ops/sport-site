import Link from "next/link";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { RETURN_DAYS } from "@/lib/config";
import { plural } from "@/lib/plural";

export default async function HomePage() {
  const [categories, newest, sale, discounted] = await Promise.all([
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
    db.product.findMany({ where: { active: true, oldPrice: { not: null } }, select: { price: true, oldPrice: true } }),
  ]);
  const maxDiscount = Math.max(
    0,
    ...discounted.map((p) => (p.oldPrice! > p.price ? Math.floor((1 - p.price / p.oldPrice!) * 100) : 0)),
  );

  return (
    <>
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hero-photo" src="/hero-stadium.webp" alt="" aria-hidden="true" />
        <svg className="hero-pitch" viewBox="0 0 1200 760" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect pathLength={1} x="40" y="40" width="1120" height="680" />
            <line pathLength={1} x1="600" y1="40" x2="600" y2="720" />
            <circle pathLength={1} cx="600" cy="380" r="110" />
            <rect pathLength={1} x="976" y="200" width="184" height="360" />
            <rect pathLength={1} x="1098" y="290" width="62" height="180" />
            <path pathLength={1} d="M976 302a96 96 0 0 0 0 156" />
            <rect pathLength={1} x="40" y="200" width="184" height="360" />
            <rect pathLength={1} x="40" y="290" width="62" height="180" />
            <path pathLength={1} d="M224 302a96 96 0 0 1 0 156" />
          </g>
          <g fill="currentColor">
            <circle cx="600" cy="380" r="4" />
            <circle cx="1036" cy="380" r="4" />
            <circle cx="164" cy="380" r="4" />
          </g>
        </svg>
        <div className="container hero-inner">
          <h1>Экипировка для тех, кто тренируется всерьёз</h1>
          <p>
            Форма, тренировочная одежда и обувь для футбола, бега и зала. Возврат в течение {RETURN_DAYS}{" "}
            {plural(RETURN_DAYS, "дня", "дней", "дней")}.
          </p>
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

      {/* размер скидки считается по реальным ценам, а не задан заранее */}
      {maxDiscount > 0 && (
        <section className="promo">
          <div className="container">
            <h2>Скидки до {maxDiscount}%</h2>
            <Link href="/catalog?sale=1" className="btn btn-white">
              Смотреть распродажу
            </Link>
          </div>
        </section>
      )}

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
