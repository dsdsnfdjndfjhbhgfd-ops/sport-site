"use client";

import { useActionState } from "react";
import { createCategory } from "@/app/actions/admin";

export function CategoryForm() {
  const [state, action, pending] = useActionState(createCategory, {});
  return (
    <form action={action}>
      {state.error && <div className="error">{state.error}</div>}
      <div className="price-form">
        <input className="input" name="name" placeholder="Название новой категории" required style={{ maxWidth: 320, width: "100%" }} />
        <button className="btn btn-sm" disabled={pending}>
          Добавить
        </button>
      </div>
    </form>
  );
}
