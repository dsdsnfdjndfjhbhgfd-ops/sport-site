import { SELLER, TERMS_VERSION } from "./config";

export const BLANK = "________________";

/** Реквизиты продавца для показа: незаполненное поле — пропуск, который сразу видно. */
export const seller = Object.fromEntries(
  Object.entries(SELLER).map(([key, value]) => [key, value.trim() || BLANK]),
) as typeof SELLER;

export const sellerFilled = Object.values(SELLER).every((v) => v.trim());

export const LEGAL_EDITION = new Date(TERMS_VERSION).toLocaleDateString("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Юридические страницы сайта — для подвала и перекрёстных ссылок. */
export const LEGAL_PAGES = [
  { href: "/terms", title: "Пользовательское соглашение" },
  { href: "/privacy", title: "Политика обработки персональных данных" },
  { href: "/consent", title: "Согласие на обработку персональных данных" },
  { href: "/returns", title: "Возврат и обмен" },
  { href: "/delivery", title: "Доставка и оплата" },
  { href: "/cookies", title: "Файлы cookie" },
] as const;
