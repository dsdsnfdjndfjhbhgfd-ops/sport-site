"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string;
  size: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  add(item: CartItem): void;
  setQuantity(productId: string, size: string, quantity: number): void;
  remove(productId: string, size: string): void;
  clear(): void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, loaded]);

  const same = (a: CartItem, productId: string, size: string) =>
    a.productId === productId && a.size === size;

  const value: CartContextValue = {
    items,
    count: items.reduce((n, i) => n + i.quantity, 0),
    subtotal: items.reduce((n, i) => n + i.price * i.quantity, 0),
    add(item) {
      setItems((prev) => {
        const existing = prev.find((i) => same(i, item.productId, item.size));
        if (existing) {
          return prev.map((i) =>
            same(i, item.productId, item.size) ? { ...i, quantity: i.quantity + item.quantity } : i,
          );
        }
        return [...prev, item];
      });
    },
    setQuantity(productId, size, quantity) {
      setItems((prev) =>
        prev.map((i) => (same(i, productId, size) ? { ...i, quantity: Math.max(1, quantity) } : i)),
      );
    },
    remove(productId, size) {
      setItems((prev) => prev.filter((i) => !same(i, productId, size)));
    },
    clear() {
      setItems([]);
    },
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart вне CartProvider");
  return ctx;
}
