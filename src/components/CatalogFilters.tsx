"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FACETS, type FacetKey, type FacetValues } from "@/lib/filters";

interface Props {
  facets: FacetValues;
  selected: Record<FacetKey, string[]> & { sale: boolean; min?: number; max?: number };
  /** параметры, которые фильтры не трогают: категория, поиск, сортировка */
  keep: Record<string, string | undefined>;
  activeCount: number;
}

const SHOW = 8;

/** Панель фильтров: галочки применяются сразу, цена — по кнопке или Enter. */
export function CatalogFilters({ facets, selected, keep, activeCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const form = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Partial<Record<FacetKey, boolean>>>({});

  function apply() {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(keep)) if (v) params.set(k, v);
    for (const [k, v] of new FormData(form.current!)) if (String(v).trim()) params.append(k, String(v).trim());
    router.push(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  }

  const reset = () => {
    const params = new URLSearchParams(Object.entries(keep).filter((e): e is [string, string] => Boolean(e[1])));
    router.push(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  };

  return (
    <div className="facets">
      <button type="button" className="btn btn-outline btn-sm facets-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        Фильтры{activeCount ? ` · ${activeCount}` : ""}
      </button>
      <form
        // при смене выбранных значений (например, «Сбросить» или крестик у чипа) форма пересоздаётся
        key={JSON.stringify(selected)}
        ref={form}
        className={open ? "facets-form open" : "facets-form"}
        onChange={(e) => {
          if ((e.target as unknown as HTMLInputElement).type === "checkbox") apply();
        }}
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        {FACETS.map(({ key, label }) => {
          const values = facets[key];
          if (!values.length) return null;
          // размеры — компактные кнопки, их показываем больше
          const limit = key === "size" ? SHOW * 3 : SHOW;
          const shown = expanded[key] ? values : values.slice(0, limit);
          return (
            <fieldset key={key} className="facet">
              <legend>{label}</legend>
              <div className={key === "size" ? "facet-options facet-sizes" : "facet-options"}>
                {shown.map(({ value, count }) => {
                  const checked = selected[key].includes(value);
                  return (
                    <label key={value} className={count || checked ? "facet-option" : "facet-option empty"}>
                      <input type="checkbox" name={key} value={value} defaultChecked={checked} disabled={!count && !checked} />
                      <span>{value}</span>
                      {key !== "size" && <small>{count}</small>}
                    </label>
                  );
                })}
              </div>
              {values.length > limit && (
                <button type="button" className="link-btn facet-more" onClick={() => setExpanded({ ...expanded, [key]: !expanded[key] })}>
                  {expanded[key] ? "Свернуть" : `Ещё ${values.length - limit}`}
                </button>
              )}
            </fieldset>
          );
        })}
        <fieldset className="facet">
          <legend>Цена, ₽</legend>
          <div className="facet-price">
            <input type="number" name="min" min={0} placeholder="от" defaultValue={selected.min ? selected.min / 100 : ""} aria-label="Цена от" />
            <input type="number" name="max" min={0} placeholder="до" defaultValue={selected.max ? selected.max / 100 : ""} aria-label="Цена до" />
            <button className="btn btn-sm">OK</button>
          </div>
          <label className="facet-option" style={{ marginTop: 10 }}>
            <input type="checkbox" name="sale" value="1" defaultChecked={selected.sale} />
            <span>Только со скидкой</span>
          </label>
        </fieldset>
        {activeCount > 0 && (
          <button type="button" className="link-btn facet-reset" onClick={reset}>
            Сбросить фильтры
          </button>
        )}
      </form>
    </div>
  );
}
