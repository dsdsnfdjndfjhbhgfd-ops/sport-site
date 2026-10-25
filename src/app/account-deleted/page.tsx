import Link from "next/link";

export const metadata = { title: "Учётная запись удалена" };

export default function AccountDeletedPage() {
  return (
    <div className="container">
      <div className="empty">
        <h1>Учётная запись удалена</h1>
        <p>Ваши персональные данные удалены. Суммы и состав прошлых заказов хранятся обезличенно, как требует закон.</p>
        <Link href="/" className="btn">
          На главную
        </Link>
      </div>
    </div>
  );
}
