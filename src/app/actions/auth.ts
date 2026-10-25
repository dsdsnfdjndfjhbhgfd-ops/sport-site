"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { syncOrderPayment } from "@/lib/payments";
import { TERMS_VERSION } from "@/lib/config";

export interface FormState {
  error?: string;
}

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Введите имя"),
  email: z.string().trim().toLowerCase().email("Некорректный email"),
  password: z.string().min(8, "Пароль — минимум 8 символов"),
  terms: z.literal("on", { error: "Чтобы зарегистрироваться, примите пользовательское соглашение" }),
  consent: z.literal("on", { error: "Без согласия на обработку персональных данных регистрация невозможна" }),
  adult: z.literal("on", { error: "Регистрация доступна с 18 лет" }),
});

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return { error: "Пользователь с таким email уже зарегистрирован" };
  }
  const user = await db.user.create({
    data: {
      name,
      email,
      password: await bcrypt.hash(password, 10),
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
      personalDataConsentAt: new Date(),
      adultConfirmedAt: new Date(),
    },
  });
  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return { error: "Неверный email или пароль" };
  }
  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

/** Заказы в этих статусах ещё не завершены: удалять данные покупателя нельзя, по ним нужна доставка или возврат. */
const OPEN_ORDERS = ["PENDING", "PAID", "SHIPPED"];

/**
 * Удаление учётной записи по запросу пользователя: имя, почта и пароль стираются, в заказах обезличиваются
 * получатель, телефон и адрес. Суммы и состав заказов остаются для бухгалтерского учёта.
 */
export async function deleteAccount(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  if (formData.get("confirm") !== "on") return { error: "Отметьте, что понимаете: учётную запись нельзя будет восстановить" };
  if (user.role === "ADMIN") {
    return { error: "Учётную запись администратора нельзя удалить: сначала попросите другого администратора снять с вас права" };
  }

  // неоплаченный заказ мог оплатиться прямо сейчас — уточняем статус у платёжного сервиса
  const pending = await db.order.findMany({ where: { userId: user.id, status: "PENDING" } });
  for (const order of pending) {
    try {
      await syncOrderPayment(order.id);
    } catch {}
  }
  if (await db.order.count({ where: { userId: user.id, status: { in: OPEN_ORDERS } } })) {
    return {
      error: "У вас есть незавершённые заказы. Удалить учётную запись можно после их доставки или отмены — или напишите нам",
    };
  }

  const password = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  await db.$transaction([
    db.order.updateMany({ where: { userId: user.id }, data: { fullName: "Удалено", phone: "", address: "" } }),
    db.user.update({
      where: { id: user.id },
      data: { name: "Удалённый пользователь", email: `deleted-${user.id}@deleted.invalid`, password },
    }),
  ]);
  await destroySession();
  redirect("/account-deleted");
}
