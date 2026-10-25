"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart, type CartItem } from "@/components/CartProvider";
import { NO_SIZE } from "@/lib/sizes";

interface Props {
  product: Omit<CartItem, "size" | "quantity">;
  /** у товара без размеров — один элемент с пустым size */
  sizes: { size: string; stock: number }[];
}

export function AddToCart({ product, sizes }: Props) {
  const { add } = useCart();
  const named = sizes.filter((s) => s.size !== "");
  const inStock = named.filter((s) => s.stock > 0);
  const [size, setSize] = useState(inStock.length === 1 ? inStock[0].size : "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  const total = sizes.reduce((n, s) => n + s.stock, 0);
  if (total <= 0) return <p className="stock-low">Нет в наличии</p>;

  // сколько можно положить в корзину прямо сейчас
  const available = named.length ? (named.find((s) => s.size === size)?.stock ?? 0) : total;
  const clamp = (q: number) => Math.min(Math.max(available, 1), Math.max(1, q));

  function handleAdd() {
    if (named.length && !size) {
      setError("Выберите размер");
      return;
    }
    add({ ...product, size: size || NO_SIZE, quantity: clamp(quantity) });
    setError("");
    setAdded(true);
  }

  return (
    <div>
      {named.length > 0 && (
        <>
          <div className="field">
            <label>Размер</label>
          </div>
          <div className="sizes" style={{ marginTop: -8 }}>
            {named.map((s) => (
              <button
                key={s.size}
                type="button"
                className={s.size === size ? "size selected" : "size"}
                disabled={s.stock <= 0}
                aria-label={`${s.size}, ${s.stock > 0 ? `в наличии ${s.stock} шт.` : "нет в наличии"}`}
                onClick={() => {
                  setSize(s.size);
                  setQuantity((q) => Math.min(s.stock, q));
                  setError("");
                  setAdded(false);
                }}
              >
                {s.size}
                <span className="size-stock">{s.stock > 0 ? `${s.stock} шт.` : "нет"}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <p className={available > 0 && available <= 3 ? "stock-line stock-low" : "stock-line"}>
        {named.length && !size
          ? "Под каждым размером указано, сколько штук осталось"
          : available <= 3
            ? `Осталось всего ${available} шт.${size ? ` размера ${size}` : ""}`
            : `В наличии ${available} шт.${size ? ` размера ${size}` : ""}`}
      </p>
      <div className="buy-row">
        <div className="qty">
          <button type="button" onClick={() => setQuantity((q) => clamp(q - 1))} aria-label="Меньше">
            −
          </button>
          <input
            type="number"
            min={1}
            max={Math.max(available, 1)}
            value={quantity}
            onChange={(e) => setQuantity(clamp(Number(e.target.value) || 1))}
          />
          <button type="button" onClick={() => setQuantity((q) => clamp(q + 1))} aria-label="Больше">
            +
          </button>
        </div>
        <button type="button" className="btn btn-red" onClick={handleAdd}>
          В корзину
        </button>
      </div>
      {error && <p className="stock-low">{error}</p>}
      {added && (
        <p className="added">
          Товар добавлен. <Link href="/cart" style={{ textDecoration: "underline" }}>Перейти в корзину</Link>
        </p>
      )}
    </div>
  );
}
