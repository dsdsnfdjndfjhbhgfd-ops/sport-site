"use client";

import { useActionState, useState } from "react";
import type { AdminFormState } from "@/app/actions/admin";

interface Props {
  action: (state: AdminFormState, data: FormData) => Promise<AdminFormState>;
  categories: { id: string; name: string }[];
  product?: {
    name: string;
    description: string;
    categoryId: string;
    price: number;
    oldPrice: number | null;
    sizes: { size: string; stock: number }[];
    imageUrl: string;
    active: boolean;
  };
}

const PRESETS: Record<string, string[]> = {
  "Одежда XS–XXL": ["XS", "S", "M", "L", "XL", "XXL"],
  "Обувь 39–45": ["39", "40", "41", "42", "43", "44", "45"],
};

/** Остаток по каждому размеру. Без размеров — одно поле «Остаток». */
function SizesEditor({ initial }: { initial?: { size: string; stock: number }[] }) {
  const start = initial?.length ? initial : PRESETS["Одежда XS–XXL"].slice(1, 5).map((size) => ({ size, stock: 10 }));
  const [hasSizes, setHasSizes] = useState(!(start.length === 1 && start[0].size === ""));
  const [rows, setRows] = useState(start.filter((r) => r.size !== ""));
  const [single, setSingle] = useState(start.length === 1 && start[0].size === "" ? start[0].stock : 10);

  const update = (i: number, patch: Partial<{ size: string; stock: number }>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const total = hasSizes ? rows.reduce((n, r) => n + (Number(r.stock) || 0), 0) : single;

  return (
    <div className="field sizes-editor">
      <label>Размеры и остатки</label>
      <label className="checkbox" style={{ marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={hasSizes}
          onChange={(e) => {
            setHasSizes(e.target.checked);
            if (e.target.checked && !rows.length) setRows([{ size: "", stock: 0 }]);
          }}
        />
        У товара есть размеры
      </label>
      {hasSizes ? (
        <>
          <table className="table sizes-table">
            <thead>
              <tr>
                <th>Размер</th>
                <th>Осталось, шт.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <input
                      name="sizeName"
                      value={r.size}
                      onChange={(e) => update(i, { size: e.target.value })}
                      placeholder="M или 42"
                      aria-label="Размер"
                      required
                    />
                  </td>
                  <td>
                    <input
                      name="sizeStock"
                      type="number"
                      min={0}
                      value={r.stock}
                      onChange={(e) => update(i, { stock: Math.max(0, Number(e.target.value) || 0) })}
                      aria-label={`Остаток размера ${r.size}`}
                      required
                    />
                  </td>
                  <td>
                    {rows.length > 1 && (
                      <button type="button" className="link-btn" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                        Убрать
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row-actions" style={{ marginTop: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setRows([...rows, { size: "", stock: 0 }])}>
              + Размер
            </button>
            {Object.entries(PRESETS).map(([label, sizes]) => (
              <button
                key={label}
                type="button"
                className="link-btn"
                onClick={() =>
                  setRows(sizes.map((size) => ({ size, stock: rows.find((r) => r.size === size)?.stock ?? 0 })))
                }
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <input type="hidden" name="sizeName" value="" />
          <input
            name="sizeStock"
            type="number"
            min={0}
            value={single}
            onChange={(e) => setSingle(Math.max(0, Number(e.target.value) || 0))}
            aria-label="Остаток, шт."
            required
          />
        </>
      )}
      <span className="muted" style={{ fontSize: 14 }}>Всего на складе: {total} шт.</span>
    </div>
  );
}

export function ProductForm({ action, categories, product }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [preview, setPreview] = useState(product?.imageUrl ?? "");

  return (
    <form action={formAction} className="panel">
      {state.error && <div className="error">{state.error}</div>}
      <div className="field">
        <label htmlFor="name">Название</label>
        <input id="name" name="name" defaultValue={product?.name} required />
      </div>
      <div className="field">
        <label htmlFor="categoryId">Категория</label>
        <select id="categoryId" name="categoryId" defaultValue={product?.categoryId ?? ""} required>
          <option value="" disabled>
            Выберите…
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="price">Цена, ₽</label>
          <input id="price" name="price" inputMode="decimal" defaultValue={product ? product.price / 100 : ""} required />
        </div>
        <div className="field">
          <label htmlFor="oldPrice">Старая цена, ₽ (для скидки)</label>
          <input
            id="oldPrice"
            name="oldPrice"
            inputMode="decimal"
            defaultValue={product?.oldPrice ? product.oldPrice / 100 : ""}
            placeholder="необязательно"
          />
        </div>
      </div>
      <SizesEditor initial={product?.sizes} />
      <div className="field">
        <label htmlFor="description">Описание</label>
        <textarea id="description" name="description" defaultValue={product?.description} required />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="image">Фото (файл)</label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPreview(URL.createObjectURL(file));
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="imageUrl">…или ссылка на фото</label>
          <input
            id="imageUrl"
            name="imageUrl"
            defaultValue={product?.imageUrl}
            placeholder="https://…"
            onChange={(e) => setPreview(e.target.value)}
          />
        </div>
      </div>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" style={{ width: 160, height: 160, objectFit: "contain", background: "#f6f6f6", marginBottom: 16 }} />
      )}
      <label className="checkbox">
        <input type="checkbox" name="active" defaultChecked={product?.active ?? true} /> Показывать на сайте
      </label>
      <button className="btn" disabled={pending}>
        {pending ? "Сохраняем…" : "Сохранить"}
      </button>
    </form>
  );
}
