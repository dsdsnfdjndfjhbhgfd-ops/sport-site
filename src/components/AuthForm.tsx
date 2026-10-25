"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/app/actions/auth";

interface Props {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  mode: "login" | "register";
  next?: string;
}

export function AuthForm({ action, mode, next }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      {state.error && <div className="error">{state.error}</div>}
      <input type="hidden" name="next" value={next ?? ""} />
      {mode === "register" && (
        <div className="field">
          <label htmlFor="name">Имя</label>
          <input id="name" name="name" required autoComplete="name" />
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Пароль</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />
      </div>
      {mode === "register" && (
        <fieldset className="consents">
          <legend className="visually-hidden">Согласия</legend>
          <label className="checkbox terms-check">
            <input type="checkbox" name="terms" required />
            <span>
              Принимаю{" "}
              <Link href="/terms" target="_blank">
                пользовательское соглашение
              </Link>
            </span>
          </label>
          <label className="checkbox terms-check">
            <input type="checkbox" name="consent" required />
            <span>
              Даю{" "}
              <Link href="/consent" target="_blank">
                согласие на обработку персональных данных
              </Link>{" "}
              на условиях{" "}
              <Link href="/privacy" target="_blank">
                политики
              </Link>
            </span>
          </label>
          <label className="checkbox terms-check">
            <input type="checkbox" name="adult" required />
            <span>Мне исполнилось 18 лет</span>
          </label>
        </fieldset>
      )}
      <button className="btn btn-block" disabled={pending}>
        {mode === "login" ? "Войти" : "Зарегистрироваться"}
      </button>
    </form>
  );
}
