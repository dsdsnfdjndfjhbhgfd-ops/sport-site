"use client";

import { useActionState } from "react";
import type { AdminFormState } from "@/app/actions/admin";

interface Props {
  action: (state: AdminFormState, data: FormData) => Promise<AdminFormState>;
  collection: { name: string; description: string | null; active: boolean };
}

export function CollectionSettings({ action, collection }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="panel">
      {state.error && <div className="error">{state.error}</div>}
      {state.saved && <div className="notice">Сохранено</div>}
      <div className="field">
        <label htmlFor="name">Название</label>
        <input id="name" name="name" defaultValue={collection.name} required />
      </div>
      <div className="field">
        <label htmlFor="description">Описание</label>
        <textarea
          id="description"
          name="description"
          defaultValue={collection.description ?? ""}
          placeholder="Пара предложений над товарами коллекции. Необязательно"
          style={{ minHeight: 80 }}
        />
      </div>
      <label className="checkbox">
        <input type="checkbox" name="active" defaultChecked={collection.active} /> Показывать на сайте
      </label>
      <button className="btn btn-sm" disabled={pending}>
        {pending ? "Сохраняем…" : "Сохранить"}
      </button>
    </form>
  );
}
