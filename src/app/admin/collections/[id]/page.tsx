import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { plural } from "@/lib/plural";
import {
  addToCollection,
  deleteCollection,
  moveCollectionItem,
  removeCollectionItem,
  removeFromCollection,
  updateCollection,
} from "@/app/actions/admin";
import { CollectionSettings } from "./CollectionSettings";

const SHOWN_RESULTS = 100;

type Search = { q?: string; category?: string; kind?: string };

export default async function EditCollection({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const { id } = await params;
  const { q = "", category = "", kind = "" } = await searchParams;
  const collection = await db.collection.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: "asc" }, include: { product: { include: { category: true } } } },
    },
  });
  if (!collection) notFound();

  // поиск товаров, которых ещё нет в коллекции
  const where: Prisma.ProductWhereInput = {
    collections: { none: { collectionId: id } },
    ...(q.trim() && { name: { contains: q.trim(), mode: "insensitive" } }),
    ...(category && { categoryId: category }),
    ...(kind && { kind }),
  };
  const [found, categories, kinds] = await Promise.all([
    db.product.findMany({ where, orderBy: { name: "asc" }, include: { category: true } }),
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.product.findMany({ where: { kind: { not: null } }, distinct: ["kind"], select: { kind: true }, orderBy: { kind: "asc" } }),
  ]);
  const items = collection.items;

  return (
    <>
      <div className="section-head">
        <h1 style={{ margin: 0 }}>{collection.name}</h1>
        <Link href={`/collections/${collection.slug}`}>Открыть на сайте</Link>
      </div>
      <CollectionSettings action={updateCollection.bind(null, collection.id)} collection={collection} />

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>
          В коллекции {items.length} {plural(items.length, "товар", "товара", "товаров")}
        </h2>
        {items.length ? (
          <form action={removeFromCollection.bind(null, collection.id)}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th></th>
                    <th></th>
                    <th>Товар</th>
                    <th>Категория</th>
                    <th>Цена</th>
                    <th>Порядок</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ product: p }, i) => (
                    <tr key={p.id} className={p.active ? "" : "inactive"}>
                      <td>
                        <input type="checkbox" name="productId" value={p.id} aria-label={`Выбрать ${p.name}`} />
                      </td>
                      <td>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imageUrl} alt="" className="thumb" />
                      </td>
                      <td>
                        <Link href={`/admin/products/${p.id}`} style={{ fontWeight: 500 }}>
                          {p.name}
                        </Link>
                        {!p.active && <div className="muted">скрыт — на сайте не виден</div>}
                      </td>
                      <td>{p.category.name}</td>
                      <td>{formatPrice(p.price)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            formAction={moveCollectionItem.bind(null, collection.id, p.id, "up")}
                            className="link-btn"
                            disabled={i === 0}
                            aria-label="Выше"
                          >
                            ↑
                          </button>
                          <button
                            formAction={moveCollectionItem.bind(null, collection.id, p.id, "down")}
                            className="link-btn"
                            disabled={i === items.length - 1}
                            aria-label="Ниже"
                          >
                            ↓
                          </button>
                        </div>
                      </td>
                      <td>
                        <button formAction={removeCollectionItem.bind(null, collection.id, p.id)} className="link-btn">
                          Убрать
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-sm btn-outline" style={{ marginTop: 16 }}>
              Убрать отмеченные
            </button>
          </form>
        ) : (
          <p className="muted">Пока пусто — добавьте товары ниже.</p>
        )}
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Добавить товары</h2>
        <form className="row-actions" style={{ flexWrap: "wrap", marginBottom: 16 }}>
          <input className="input" name="q" defaultValue={q} placeholder="Название или артикул" style={{ maxWidth: 260 }} />
          <select className="input" name="category" defaultValue={category} style={{ maxWidth: 200 }} aria-label="Категория">
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="input" name="kind" defaultValue={kind} style={{ maxWidth: 200 }} aria-label="Тип вещи">
            <option value="">Все типы</option>
            {kinds.map(({ kind: k }) => (
              <option key={k} value={k!}>
                {k}
              </option>
            ))}
          </select>
          <button className="btn btn-sm">Найти</button>
          {(q || category || kind) && <Link href={`/admin/collections/${collection.id}`}>Сбросить</Link>}
        </form>

        {found.length ? (
          <>
            <form action={addToCollection.bind(null, collection.id)}>
              <div className="table-wrap">
                <table className="table">
                  <tbody>
                    {found.slice(0, SHOWN_RESULTS).map((p) => (
                      <tr key={p.id} className={p.active ? "" : "inactive"}>
                        <td>
                          <input type="checkbox" name="productId" value={p.id} aria-label={`Выбрать ${p.name}`} />
                        </td>
                        <td>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.imageUrl} alt="" className="thumb" />
                        </td>
                        <td>
                          {p.name}
                          {!p.active && <div className="muted">скрыт</div>}
                        </td>
                        <td>{p.category.name}</td>
                        <td>{formatPrice(p.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {found.length > SHOWN_RESULTS && (
                <p className="muted">
                  Показаны первые {SHOWN_RESULTS} из {found.length}. Уточните поиск или добавьте все найденные сразу.
                </p>
              )}
              <button className="btn btn-sm" style={{ marginTop: 16 }}>
                Добавить отмеченные
              </button>
            </form>
            <form action={addToCollection.bind(null, collection.id)} style={{ marginTop: 12 }}>
              {found.map((p) => (
                <input key={p.id} type="hidden" name="productId" value={p.id} />
              ))}
              <button className="link-btn">
                Добавить все найденные ({found.length})
              </button>
            </form>
          </>
        ) : (
          <p className="muted">Ничего не найдено — или все подходящие товары уже в коллекции.</p>
        )}
      </div>

      <form action={deleteCollection.bind(null, collection.id)}>
        <button className="link-btn" style={{ color: "#a3000b" }}>
          Удалить коллекцию
        </button>
        <span className="muted" style={{ fontSize: 13 }}> (товары останутся в каталоге)</span>
      </form>
    </>
  );
}
