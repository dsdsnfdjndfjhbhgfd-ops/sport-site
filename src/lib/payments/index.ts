import { db } from "../db";
import { sizeKey } from "../sizes";
import { mockProvider } from "./mock";
import { stripeProvider } from "./stripe";
import { yookassaProvider } from "./yookassa";
import type { PaymentProvider, PaymentStatus } from "./types";

const providers: Record<string, PaymentProvider> = {
  mock: mockProvider,
  stripe: stripeProvider,
  yookassa: yookassaProvider,
};

export function getProvider(name = process.env.PAYMENT_PROVIDER || "mock"): PaymentProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Неизвестный платёжный провайдер: ${name}`);
  return provider;
}

/** Переводит заказ из PENDING в новый статус. При оплате списывает остатки. Идемпотентно. */
export async function applyPaymentStatus(orderId: string, status: PaymentStatus) {
  if (status === "PENDING") return;
  await db.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status },
    });
    if (count === 0 || status !== "PAID") return;
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
      await tx.productSize.updateMany({
        where: { productId: item.productId, size: sizeKey(item.size) },
        data: { stock: { decrement: item.quantity } },
      });
    }
  });
}

/** Спрашивает у провайдера актуальный статус платежа и обновляет заказ. */
export async function syncOrderPayment(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PENDING" || !order.paymentId) return;
  const status = await getProvider(order.paymentProvider).getStatus(order.paymentId);
  await applyPaymentStatus(orderId, status);
}
