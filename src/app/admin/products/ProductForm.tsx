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
    sizes: string;
    stock: number;
    imageUrl: string;
    active: boolean;
  };
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
      <div className="field-row">
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
        <div className="field">
          <label htmlFor="stock">Остаток, шт.</label>
          <input id="stock" name="stock" type="number" min={0} defaultValue={product?.stock ?? 100} required />
        </div>
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
      <div className="field">
        <label htmlFor="sizes">Размеры через запятую</label>
        <input id="sizes" name="sizes" defaultValue={product?.sizes ?? "S,M,L,XL"} placeholder="S,M,L,XL или 40,41,42" />
      </div>
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
