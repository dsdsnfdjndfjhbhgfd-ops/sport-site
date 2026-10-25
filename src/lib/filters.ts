import type { Prisma } from "@prisma/client";

/** Фильтры каталога с несколькими значениями (в URL повторяются: ?size=M&size=L). */
export const FACETS = [
  { key: "kind", label: "Тип вещи" },
  { key: "size", label: "Размер" },
  { key: "material", label: "Материал" },
  { key: "color", label: "Цвет" },
  { key: "gender", label: "Пол" },
] as const;

export type FacetKey = (typeof FACETS)[number]["key"];
export type RawSearch = Record<string, string | string[] | undefined>;
export type FacetValues = Record<FacetKey, { value: string; count: number }[]>;

export interface Filters extends Record<FacetKey, string[]> {
  q?: string;
  category?: string;
  sale: boolean;
  /** цена в копейках */
  min?: number;
  max?: number;
}

interface FilterableProduct {
  kind: string | null;
  material: string | null;
  color: string | null;
  gender: string | null;
  sizes: { size: string; stock: number }[];
}

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : []).map((s) => s.trim()).filter(Boolean);

const rubles = (v: string | string[] | undefined) => {
  const n = Number(String(Array.isArray(v) ? v[0] : (v ?? "")).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : undefined;
};

export function parseFilters(sp: RawSearch): Filters {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  return {
    q: one(sp.q),
    category: one(sp.category),
    sale: Boolean(one(sp.sale)),
    min: rubles(sp.min),
    max: rubles(sp.max),
    kind: list(sp.kind),
    size: list(sp.size),
    material: list(sp.material),
    color: list(sp.color),
    gender: list(sp.gender),
  };
}

/** Условия, которые удобно отдать базе: категория, поиск, скидка, цена, наличие. */
export function baseWhere(f: Filters, opts: { inStock: boolean; categoryId?: string }): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ active: true }];
  if (opts.categoryId) and.push({ categoryId: opts.categoryId });
  if (f.q) {
    and.push({
      OR: [
        { name: { contains: f.q, mode: "insensitive" } },
        { description: { contains: f.q, mode: "insensitive" } },
        { kind: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }
  if (f.sale) and.push({ oldPrice: { not: null } });
  if (f.min) and.push({ price: { gte: f.min } });
  if (f.max) and.push({ price: { lte: f.max } });
  if (opts.inStock) and.push({ sizes: { some: { stock: { gt: 0 } } } });
  return { AND: and };
}

/** Размеры товара, которые учитываются в фильтре: в торговом каталоге — только в наличии. */
const sizesOf = (p: FilterableProduct, inStock: boolean) =>
  p.sizes.filter((s) => s.size && (!inStock || s.stock > 0)).map((s) => s.size);

function matches(p: FilterableProduct, f: Filters, inStock: boolean, except?: FacetKey) {
  for (const { key } of FACETS) {
    if (key === except || !f[key].length) continue;
    if (key === "size") {
      if (!sizesOf(p, inStock).some((s) => f.size.includes(s))) return false;
    } else if (!f[key].includes(p[key] ?? "")) {
      return false;
    }
  }
  return true;
}

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];
function compareSizes(a: string, b: string) {
  const ia = SIZE_ORDER.indexOf(a.toUpperCase());
  const ib = SIZE_ORDER.indexOf(b.toUpperCase());
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, "ru");
}

/**
 * Оставляет товары, подходящие под выбранные значения фильтров, и считает для каждого
 * значения, сколько товаров будет, если его выбрать (с учётом остальных фильтров).
 */
export function applyFacets<T extends FilterableProduct>(products: T[], f: Filters, opts: { inStock: boolean }) {
  const facets = {} as FacetValues;
  for (const { key } of FACETS) {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (!matches(p, f, opts.inStock, key)) continue;
      const values = key === "size" ? new Set(sizesOf(p, opts.inStock)) : p[key] ? [p[key]!] : [];
      for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    // выбранные значения показываем, даже если по ним сейчас ничего не нашлось
    for (const v of f[key]) if (!counts.has(v)) counts.set(v, 0);
    facets[key] = [...counts]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => (key === "size" ? compareSizes(a.value, b.value) : a.value.localeCompare(b.value, "ru")));
  }
  return { items: products.filter((p) => matches(p, f, opts.inStock)), facets };
}

/** Сколько фильтров выбрано — для кнопки «Фильтры» на телефоне. */
export const activeFilterCount = (f: Filters) =>
  FACETS.reduce((n, { key }) => n + f[key].length, 0) + (f.sale ? 1 : 0) + (f.min ? 1 : 0) + (f.max ? 1 : 0);
