import type { Metadata } from "next";
import Link from "next/link";
import { Onest, Unbounded } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { CartLink } from "@/components/CartLink";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { STORE_NAME, STORE_TAGLINE, FREE_SHIPPING_FROM } from "@/lib/config";
import { formatPrice } from "@/lib/money";

const body = Onest({ subsets: ["latin", "cyrillic"], variable: "--font-body" });
const display = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: { default: `${STORE_NAME} — ${STORE_TAGLINE}`, template: `%s | ${STORE_NAME}` },
  description: STORE_TAGLINE,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, categories] = await Promise.all([
    getCurrentUser(),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <html lang="ru" className={`${body.variable} ${display.variable}`}>
      <body>
        <CartProvider>
          <div className="topbar">Бесплатная доставка от {formatPrice(FREE_SHIPPING_FROM)} и возврат в течение 30 дней</div>
          <header className="header">
            <div className="container header-inner">
              <Link href="/" className="logo">
                {STORE_NAME}
              </Link>
              <nav className="nav">
                <Link href="/catalog">Каталог</Link>
                {categories.map((c) => (
                  <Link key={c.id} href={`/catalog?category=${c.slug}`}>
                    {c.name}
                  </Link>
                ))}
                <Link href="/catalog?sale=1" className="nav-sale">
                  Распродажа
                </Link>
              </nav>
              <div className="header-actions">
                <form action="/catalog" className="search">
                  <input name="q" placeholder="Поиск" aria-label="Поиск" />
                </form>
                {user?.role === "ADMIN" && (
                  <Link href="/admin" className="admin-link">
                    Админка
                  </Link>
                )}
                <Link href={user ? "/account" : "/login"} className="icon-link" aria-label="Профиль">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
                  </svg>
                </Link>
                <CartLink />
              </div>
            </div>
          </header>
          <main>{children}</main>
          <footer className="footer">
            <div className="container footer-inner">
              <div>
                <div className="logo logo-light">{STORE_NAME}</div>
                <p>{STORE_TAGLINE}</p>
              </div>
              <div>
                <h4>Покупателям</h4>
                <Link href="/catalog">Каталог</Link>
                <Link href="/account">Мои заказы</Link>
                <Link href="/cart">Корзина</Link>
              </div>
              <div>
                <h4>Помощь</h4>
                <span>Доставка и оплата</span>
                <span>Возврат и обмен</span>
                <span>Таблица размеров</span>
              </div>
            </div>
            <div className="container copyright">© {new Date().getFullYear()} {STORE_NAME}</div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
