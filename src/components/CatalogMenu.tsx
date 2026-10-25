"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { plural } from "@/lib/plural";

interface Props {
  /** товаров в продаже, позиций в номенклаторе, сезонных коллекций */
  counts: { trade: number; all: number; seasons: number };
}

/** Кнопка «Каталог» в шапке: по нажатию выезжает панель с тремя видами каталога. */
export function CatalogMenu({ counts }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const items = [
    {
      href: "/catalog",
      title: "Торговый каталог",
      text: "Всё, что сейчас в продаже: фильтры по категориям, скидки и сортировка.",
      meta: `${counts.trade} ${plural(counts.trade, "товар", "товара", "товаров")} в наличии`,
      icon: (
        <path d="M4 7h16l-1.5 12h-13L4 7Zm4 0a4 4 0 0 1 8 0" />
      ),
    },
    {
      href: "/nomenclature",
      title: "Номенклатор",
      text: "Полный перечень позиций одной таблицей: размеры и остатки, включая закончившиеся.",
      meta: `${counts.all} ${plural(counts.all, "позиция", "позиции", "позиций")}`,
      icon: (
        <path d="M4 5h16M4 10h16M4 15h16M4 20h10" />
      ),
    },
    {
      href: "/collections",
      title: "Сезонные коллекции",
      text: "Подборки по сезонам: что носить на тренировках весной, летом, осенью и зимой.",
      meta: counts.seasons
        ? `${counts.seasons} ${plural(counts.seasons, "коллекция", "коллекции", "коллекций")}`
        : "Скоро",
      icon: (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
        </>
      ),
    },
  ];

  return (
    <div ref={root} className="catalog-menu-root">
      <button
        type="button"
        className={open ? "nav-catalog open" : "nav-catalog"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        Каталог
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      <div id={panelId} className={open ? "catalog-menu open" : "catalog-menu"} hidden={!open}>
        <div className="container catalog-menu-grid">
          {items.map((item, i) => (
            <Link key={item.href} href={item.href} className="catalog-type" style={{ "--i": i } as React.CSSProperties}>
              <svg className="catalog-type-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                {item.icon}
              </svg>
              <span className="catalog-type-title">{item.title}</span>
              <span className="catalog-type-text">{item.text}</span>
              <span className="catalog-type-meta">{item.meta}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
