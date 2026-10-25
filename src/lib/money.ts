import { FREE_SHIPPING_FROM, SHIPPING_PRICE } from "./config";

export function formatPrice(kopecks: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: kopecks % 100 === 0 ? 0 : 2,
  }).format(kopecks / 100);
}

/** "1 299,50" -> 129950 */
export function parsePrice(input: string): number | null {
  const normalized = input.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(parseFloat(normalized) * 100);
}

export function shippingFor(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_FROM || subtotal === 0 ? 0 : SHIPPING_PRICE;
}
