"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatPrice, shippingFor } from "@/lib/money";
import { placeOrder } from "@/app/actions/checkout";

export function CheckoutForm({ defaultName, testMode }: { defaultName: string; testMode: boolean }) {
  const { items, subtotal, clear } = useCart();
  const [state, action, pending] = useActionState(placeOrder, {});
  const shipping = shippingFor(subtotal);
  const redirected = useRef(false);

  useEffect(() => {
    if (state.redirectUrl && !redirected.current) {
      redirected.current = true;
      clear();
      window.location.href = state.redirectUrl;
    }
  }, [state.redirectUrl, clear]);

  if (items.length === 0 && !state.redirectUrl) {
    return (
      <div className="empty">
        <p>Корзина пуста</p>
        <Link href="/catalog" className="btn">
          В каталог
        </Link>
      </div>
    );
  }

  const payload = JSON.stringify(
    items.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
  );

  return (
    <form action={action} className="cart">
      <div>
        {state.error && <div className="error">{state.error}</div>}
        <h3>Получатель</h3>
        <div className="field-row">
          <div className="field">
            <label htmlFor="fullName">ФИО</label>
            <input id="fullName" name="fullName" defaultValue={defaultName} required autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="phone">Телефон</label>
            <input id="phone" name="phone" type="tel" placeholder="+7 900 000-00-00" required autoComplete="tel" />
          </div>
        </div>
        <h3>Доставка</h3>
        <div className="field">
          <label htmlFor="address">Адрес</label>
          <textarea id="address" name="address" placeholder="Город, улица, дом, квартира, индекс" required />
        </div>
        <input type="hidden" name="items" value={payload} />
        {testMode && (
          <div className="notice">
            Тестовый режим оплаты: реальные деньги не списываются.
          </div>
        )}
      </div>
      <aside className="summary">
        <h3>Ваш заказ</h3>
        {items.map((i) => (
          <div key={`${i.productId}-${i.size}`} className="summary-row" style={{ fontSize: 14 }}>
            <span>
              {i.name} · {i.size} × {i.quantity}
            </span>
            <span>{formatPrice(i.price * i.quantity)}</span>
          </div>
        ))}
        <div className="summary-row">
          <span>Доставка</span>
          <span>{shipping ? formatPrice(shipping) : "Бесплатно"}</span>
        </div>
        <div className="summary-row summary-total">
          <span>К оплате</span>
          <span>{formatPrice(subtotal + shipping)}</span>
        </div>
        <button className="btn btn-red btn-block" style={{ marginTop: 16 }} disabled={pending}>
          {pending ? "Создаём платёж…" : "Перейти к оплате"}
        </button>
      </aside>
    </form>
  );
}
