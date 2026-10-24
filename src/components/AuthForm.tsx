"use client";

import { useActionState } from "react";
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
      <button className="btn btn-block" disabled={pending}>
        {mode === "login" ? "Войти" : "Зарегистрироваться"}
      </button>
    </form>
  );
}
