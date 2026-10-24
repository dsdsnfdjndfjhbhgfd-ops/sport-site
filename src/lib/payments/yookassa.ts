import { randomUUID } from "crypto";
import type { PaymentProvider } from "./types";
import { appUrl } from "./url";

const API = "https://api.yookassa.ru/v3";

function authHeader() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const key = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !key) throw new Error("YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY не заданы");
  return "Basic " + Buffer.from(`${shopId}:${key}`).toString("base64");
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: authHeader(), "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ЮKassa ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

interface YooPayment {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  confirmation?: { confirmation_url: string };
}

export const yookassaProvider: PaymentProvider = {
  name: "yookassa",
  async createPayment({ orderId, amount, description }) {
    const payment = await call<YooPayment>("/payments", {
      method: "POST",
      headers: { "Idempotence-Key": randomUUID() },
      body: JSON.stringify({
        amount: { value: (amount / 100).toFixed(2), currency: "RUB" },
        capture: true,
        confirmation: { type: "redirect", return_url: `${appUrl()}/checkout/success?order=${orderId}` },
        description: description.slice(0, 128),
        metadata: { orderId },
      }),
    });
    return { paymentId: payment.id, redirectUrl: payment.confirmation!.confirmation_url };
  },
  async getStatus(paymentId) {
    const payment = await call<YooPayment>(`/payments/${paymentId}`);
    if (payment.status === "succeeded") return "PAID";
    if (payment.status === "canceled") return "CANCELED";
    return "PENDING";
  },
};
