import { db } from "./db";

/** Сезоны, которые уже указаны у товаров, — для подсказок в админке. */
export async function listSeasons() {
  const rows = await db.product.groupBy({ by: ["season"], where: { season: { not: null } }, orderBy: { season: "desc" } });
  return rows.map((r) => r.season!);
}
