"use client";

import { useActionState } from "react";
import { createCollection } from "@/app/actions/admin";

export function CollectionForm() {
  const [state, action, pending] = useActionState(createCollection, {});
  return (
    <form action={action}>
      {state.error && <div className="error">{state.error}</div>}
      <div className="price-form">
        <input className="input" name="name" placeholder="Например, Осень — зима 2026" required style={{ maxWidth: 320, width: "100%" }} />
        <button className="btn btn-sm" disabled={pending}>
          Создать
        </button>
      </div>
    </form>
  );
}
