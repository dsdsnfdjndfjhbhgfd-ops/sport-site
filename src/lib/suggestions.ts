import { db } from "./db";

const FIELDS = ["season", "kind", "material", "color"] as const;
export type SuggestionField = (typeof FIELDS)[number];

/** Значения, которые уже встречаются у товаров, — подсказки для полей формы в админке. */
export async function listSuggestions(): Promise<Record<SuggestionField, string[]>> {
  const rows = await db.product.findMany({ select: { season: true, kind: true, material: true, color: true } });
  const result = {} as Record<SuggestionField, string[]>;
  for (const f of FIELDS) {
    result[f] = [...new Set(rows.map((r) => r[f]).filter((v): v is string => Boolean(v)))].sort((a, b) =>
      a.localeCompare(b, "ru"),
    );
  }
  return result;
}
