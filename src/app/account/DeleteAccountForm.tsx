"use client";

import { useActionState } from "react";
import { deleteAccount } from "@/app/actions/auth";

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, {});
  return (
    <form action={action}>
      {state.error && <div className="error">{state.error}</div>}
      <label className="checkbox terms-check">
        <input type="checkbox" name="confirm" required />
        <span>
          Понимаю, что учётная запись будет удалена без возможности восстановления, а в заказах будут стёрты ФИО,
          телефон и адрес
        </span>
      </label>
      <button className="btn btn-sm btn-outline" disabled={pending}>
        {pending ? "Удаляем…" : "Удалить учётную запись"}
      </button>
    </form>
  );
}
