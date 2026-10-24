"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart, type CartItem } from "@/components/CartProvider";

interface Props {
  product: Omit<CartItem, "size" | "quantity">;
  sizes: string[];
  stock: number;
}

export function AddToCart({ product, sizes, stock }: Props) {
  const { add } = useCart();
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  if (stock <= 0) return <p className="stock-low">Нет в наличии</p>;

  function handleAdd() {
    if (sizes.length && !size) {
      setError("Выберите размер");
      return;
    }
    add({ ...product, size: size || "—", quantity });
    setError("");
    setAdded(true);
  }

  return (
    <div>
      {sizes.length > 0 && (
        <>
          <div className="field">
            <label>Размер</label>
          </div>
          <div className="sizes" style={{ marginTop: -8 }}>
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                className={s === size ? "size selected" : "size"}
                onClick={() => {
                  setSize(s);
                  setError("");
                  setAdded(false);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="buy-row">
        <div className="qty">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Меньше">
            −
          </button>
          <input
            type="number"
            min={1}
            max={stock}
            value={quantity}
            onChange={(e) => setQuantity(Math.min(stock, Math.max(1, Number(e.target.value) || 1)))}
          />
          <button type="button" onClick={() => setQuantity((q) => Math.min(stock, q + 1))} aria-label="Больше">
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
      {stock < 10 && <p className="stock-low">Осталось всего {stock} шт.</p>}
    </div>
  );
}
