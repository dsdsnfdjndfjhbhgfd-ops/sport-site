import Link from "next/link";
import { db } from "@/lib/db";
import { moveCollection } from "@/app/actions/admin";
import { CollectionForm } from "./CollectionForm";

export default async function AdminCollections() {
  const collections = await db.collection.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { items: true } } },
  });
  return (
    <>
      <h1>Коллекции</h1>
      <div className="panel">
        <p className="muted" style={{ marginTop: 0 }}>
          Коллекция — подборка товаров на странице <Link href="/collections">«Коллекции»</Link>. Порядок здесь — порядок на сайте.
        </p>
        <CollectionForm />
      </div>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Адрес</th>
              <th>Товаров</th>
              <th>Порядок</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {collections.map((c, i) => (
              <tr key={c.id} className={c.active ? "" : "inactive"}>
                <td>
                  <Link href={`/admin/collections/${c.id}`} style={{ fontWeight: 500 }}>
                    {c.name}
                  </Link>
                  {!c.active && <div className="muted">скрыта</div>}
                </td>
                <td className="muted">/collections/{c.slug}</td>
                <td>{c._count.items}</td>
                <td>
                  <div className="row-actions">
                    <form action={moveCollection.bind(null, c.id, "up")}>
                      <button className="link-btn" disabled={i === 0} aria-label="Выше">
                        ↑
                      </button>
                    </form>
                    <form action={moveCollection.bind(null, c.id, "down")}>
                      <button className="link-btn" disabled={i === collections.length - 1} aria-label="Ниже">
                        ↓
                      </button>
                    </form>
                  </div>
                </td>
                <td>
                  <Link href={`/admin/collections/${c.id}`} style={{ textDecoration: "underline" }}>
                    Изменить
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!collections.length && <p className="muted">Коллекций пока нет</p>}
      </div>
    </>
  );
}
