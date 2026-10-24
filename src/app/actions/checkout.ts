"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { shippingFor } from "@/lib/money";
import { STORE_NAME } from "@/lib/config";
import { sizeKey } from "@/lib/sizes";
import { applyPaymentStatus, getProvider } from "@/lib/payments";

export interface CheckoutState {
  error?: string;
  redirectUrl?: string;
}

const schema = z.object({
  fullName: z.string().trim().min(3, "Укажите ФИО"),
  phone: z.string().trim().min(10, "Укажите телефон"),
  address: z.string().trim().min(10, "Укажите полный адрес доставки"),
  items: z
    .array(
      z.object({
        productId: z.string(),
        size: z.string(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1, "Корзина пуста"),
});

async function startPayment(orderId: string, amount: number, email: string, provider: string) {
  const payment = await getProvider(provider).createPayment({
    orderId,
    amount,
    email,
    description: `Заказ №${orderId.slice(-8).toUpperCase()} в ${STORE_NAME}`,
  });
  await db.order.update({ where: { id: orderId }, data: { paymentId: payment.paymentId } });
  return payment.redirectUrl;
}

export async function placeOrder(_: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Войдите, чтобы оформить заказ" };

  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") || "[]"));
  } catch {
    return { error: "Некорректная корзина" };
  }
  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    items,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  // Цены всегда берём из базы, а не из браузера
  const products = await db.product.findMany({
    where: { id: { in: data.items.map((i) => i.productId) }, active: true },
    include: { sizes: true },
  });
  const lines = [];
  for (const item of data.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) return { error: "Один из товаров больше недоступен. Обновите корзину." };
    const variant = product.sizes.find((s) => s.size === sizeKey(item.size));
    if (!variant) return { error: `«${product.name}»: размера ${item.size} больше нет. Обновите корзину.` };
    if (variant.stock < item.quantity) {
      const where = variant.size ? `размера ${variant.size} ` : "";
      return {
        error: variant.stock
          ? `«${product.name}»: ${where}в наличии только ${variant.stock} шт.`
          : `«${product.name}»: ${where}закончился. Удалите его из корзины.`,
      };
    }
    lines.push({
      productId: product.id,
      name: product.name,
      size: item.size,
      price: product.price,
      quantity: item.quantity,
    });
  }
  const subtotal = lines.reduce((n, l) => n + l.price * l.quantity, 0);
  const total = subtotal + shippingFor(subtotal);
  const provider = getProvider().name;

  const order = await db.order.create({
    data: {
      userId: user.id,
      total,
      fullName: data.fullName,
      phone: data.phone,
      address: data.address,
      paymentProvider: provider,
      items: { create: lines },
    },
  });

  try {
    return { redirectUrl: await startPayment(order.id, total, user.email, provider) };
  } catch (e) {
    console.error(e);
    return { error: "Не удалось создать платёж. Заказ сохранён — оплатить его можно из личного кабинета." };
  }
}

export async function retryPayment(orderId: string) {
  const user = await requireUser();
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== user.id || order.status !== "PENDING") redirect("/account");
  const provider = getProvider().name;
  await db.order.update({ where: { id: orderId }, data: { paymentProvider: provider } });
  redirect(await startPayment(order.id, order.total, user.email, provider));
}

/** Только для тестового провайдера mock */
export async function completeMockPayment(orderId: string, formData: FormData) {
  const user = await requireUser();
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== user.id || order.paymentProvider !== "mock") redirect("/account");
  await applyPaymentStatus(orderId, formData.get("result") === "fail" ? "CANCELED" : "PAID");
  redirect(`/checkout/success?order=${orderId}`);
}
