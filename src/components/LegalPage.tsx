import Link from "next/link";
import { BLANK, LEGAL_EDITION, LEGAL_PAGES, seller } from "@/lib/legal";
import { SELLER } from "@/lib/config";

/** Оболочка юридической страницы: хлебные крошки, заголовок, редакция и ссылки на остальные документы. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container legal">
      <div className="page-head">
        <div className="crumbs">
          <Link href="/">Главная</Link> / {title}
        </div>
        <h1>{title}</h1>
        <p className="muted">Редакция от {LEGAL_EDITION}</p>
      </div>
      {children}
      <nav className="legal-nav" aria-label="Другие документы">
        <h2>Другие документы</h2>
        <ul>
          {LEGAL_PAGES.filter((p) => p.title !== title).map((p) => (
            <li key={p.href}>
              <Link href={p.href}>{p.title}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function SellerDetails() {
  return (
    <dl className="legal-details">
      <dt>Продавец</dt>
      <dd>{seller.name}</dd>
      <dt>ИНН</dt>
      <dd>{seller.inn}</dd>
      <dt>ОГРН / ОГРНИП</dt>
      <dd>{seller.ogrn}</dd>
      <dt>Адрес</dt>
      <dd>{seller.address}</dd>
      <dt>Электронная почта</dt>
      <dd>{SELLER.email ? <a href={`mailto:${SELLER.email}`}>{SELLER.email}</a> : BLANK}</dd>
      <dt>Телефон</dt>
      <dd>{SELLER.phone ? <a href={`tel:${SELLER.phone.replace(/[^\d+]/g, "")}`}>{SELLER.phone}</a> : BLANK}</dd>
    </dl>
  );
}
