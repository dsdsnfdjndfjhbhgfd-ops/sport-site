"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
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
