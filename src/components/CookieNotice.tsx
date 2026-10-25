"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "cookie-notice";

/**
 * Уведомление о cookie. Сайт ставит только необходимые cookie, поэтому выбирать нечего:
 * уведомление сообщает об этом и закрывается одной кнопкой, страницу не перекрывает.
 */
export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(KEY) !== "seen");
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function close() {
    try {
      localStorage.setItem(KEY, "seen");
    } catch {}
    setVisible(false);
  }

  return (
    <section className="cookie-notice" aria-label="Уведомление о файлах cookie">
      <p>
        Мы используем только необходимые cookie: чтобы работали вход в учётную запись и корзина. Рекламных и
        аналитических трекеров нет. <Link href="/cookies">Подробнее о cookie</Link>
      </p>
      <button type="button" className="btn btn-sm" onClick={close}>
        Понятно
      </button>
    </section>
  );
}
