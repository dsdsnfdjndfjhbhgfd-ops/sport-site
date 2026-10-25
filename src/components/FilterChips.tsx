import Link from "next/link";
import { FACETS, type Filters } from "@/lib/filters";
import { formatPrice } from "@/lib/money";

/** Выбранные значения фильтров над списком: каждое можно снять крестиком. */
export function FilterChips({ filters, path, sort }: { filters: Filters; path: string; sort?: string }) {
  const params = (drop: (k: string, v: string) => boolean) => {
    const p = new URLSearchParams();
    const add = (k: string, v: string | number | undefined | boolean) => {
      if (v === undefined || v === false || v === "") return;
      const value = k === "min" || k === "max" ? String(Number(v) / 100) : String(v === true ? 1 : v);
      if (!drop(k, value)) p.append(k, value);
    };
    add("category", filters.category);
    add("q", filters.q);
    add("sort", sort);
    add("sale", filters.sale);
    add("min", filters.min);
    add("max", filters.max);
    for (const { key } of FACETS) for (const v of filters[key]) add(key, v);
    return p.size ? `${path}?${p}` : path;
  };

  const chips: { label: string; href: string }[] = [];
  for (const { key, label } of FACETS) {
    for (const v of filters[key]) {
      chips.push({ label: key === "size" ? `${label}: ${v}` : v, href: params((k, x) => k === key && x === v) });
    }
  }
  if (filters.min) chips.push({ label: `от ${formatPrice(filters.min)}`, href: params((k) => k === "min") });
  if (filters.max) chips.push({ label: `до ${formatPrice(filters.max)}`, href: params((k) => k === "max") });
  if (filters.sale) chips.push({ label: "Со скидкой", href: params((k) => k === "sale") });
  if (!chips.length) return null;

  return (
    <div className="filter-chips">
      {chips.map((c) => (
        <Link key={c.label + c.href} href={c.href} scroll={false} className="filter-chip" aria-label={`Убрать фильтр «${c.label}»`}>
          {c.label}
          <span aria-hidden="true">×</span>
        </Link>
      ))}
    </div>
  );
}
