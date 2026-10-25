"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function CartLink() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="icon-link" aria-label="Корзина">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 7h12l-1 13H7L6 7Z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      {count > 0 && (
        // key перезапускает анимацию «подпрыгивания» при каждом изменении количества
        <span key={count} className="badge">
          {count}
        </span>
      )}
    </Link>
  );
}
