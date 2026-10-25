"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatPrice, shippingFor } from "@/lib/money";
import { FREE_SHIPPING_FROM } from "@/lib/config";

export default function CartPage() {
  const { items, subtotal, setQuantity, remove } = useCart();
  const shipping = shippingFor(subtotal);

  return (
    <div className="container">
      <div className="page-head">
        <h1>Корзина</h1>
      </div>
      {items.length === 0 ? (
        <div className="empty">
          <p>Ваша корзина пуста</p>
          <Link href="/catalog" className="btn">
            В каталог
          </Link>
        </div>
      ) : (
        <div className="cart">
          <div>
            {items.map((item) => (
              <div key={`${item.productId}-${item.size}`} className="cart-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt={item.name} />
                <div>
                  <Link href={`/product/${item.slug}`} style={{ fontWeight: 500 }}>
                    {item.name}
                  </Link>
                  <div className="meta">Размер: {item.size}</div>
                  <div className="row-actions" style={{ marginTop: 10 }}>
                    <div className="qty">
                      <button onClick={() => setQuantity(item.productId, item.size, item.quantity - 1)}>−</button>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => setQuantity(item.productId, item.size, Number(e.target.value) || 1)}
                      />
                      <button onClick={() => setQuantity(item.productId, item.size, item.quantity + 1)}>+</button>
                    </div>
                    <button className="link-btn" onClick={() => remove(item.productId, item.size)}>
                      Удалить
                    </button>
                  </div>
                </div>
                <div className="price">{formatPrice(item.price * item.quantity)}</div>
              </div>
            ))}
          </div>
          <aside className="summary">
            <h3>Итого</h3>
            <div className="summary-row">
              <span>Товары</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Доставка</span>
              <span>{shipping ? formatPrice(shipping) : "Бесплатно"}</span>
            </div>
            {shipping > 0 && (
              <p className="muted" style={{ fontSize: 13 }}>
                До бесплатной доставки: {formatPrice(FREE_SHIPPING_FROM - subtotal)}
              </p>
            )}
            <div className="summary-row summary-total">
              <span>К оплате</span>
              <span>{formatPrice(subtotal + shipping)}</span>
            </div>
            <Link href="/checkout" className="btn btn-red btn-block" style={{ marginTop: 16 }}>
              Оформить заказ
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
