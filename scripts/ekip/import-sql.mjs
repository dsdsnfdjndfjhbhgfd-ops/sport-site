// Готовит SQL для загрузки data/ekip/products.json в базу сайта (Supabase / PostgreSQL).
// Запуск: node scripts/ekip/import-sql.mjs <папка-для-sql> [товаров-в-пакете]
// 00-prepare.sql — удаляет демо-товары и старые категории, создаёт категории s-ekip и заглушку фото;
// NN-products.sql — пакеты товаров (Product + ProductSize + ProductImage). Выполнять по порядку.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const [outDir = 'out-sql', batchArg = '120'] = process.argv.slice(2);
const BATCH = Number(batchArg);
const PLACEHOLDER_ID = 'ekip-no-photo';
const PLACEHOLDER_URL = `/api/images/${PLACEHOLDER_ID}`;

// категории как на s-ekip; obuv и aksessuary уже есть в базе — их оставляем
const CATEGORIES = {
  'АКСЕССУАРЫ': { slug: 'aksessuary', name: 'Аксессуары' },
  'МЯЧИ': { slug: 'myachi', name: 'Мячи' },
  'ОБУВЬ': { slug: 'obuv', name: 'Обувь' },
  'ОДЕЖДА': { slug: 'odezhda', name: 'Одежда' },
};
const DEMO_CATEGORIES = ['futbolki', 'kurtki', 'shorty-i-bryuki'];
const STOCK_OVER = 500; // на s-ekip большие остатки показаны как «>500»

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#f1f3f5"/><g fill="none" stroke="#adb5bd" stroke-width="14" stroke-linejoin="round"><rect x="170" y="200" width="260" height="190" rx="18"/><circle cx="300" cy="295" r="55"/><path d="M240 200l20-35h80l20 35"/></g><text x="300" y="460" text-anchor="middle" font-family="sans-serif" font-size="34" fill="#868e96">Фото скоро появится</text></svg>`;

const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const slugify = (s) => s.toLowerCase().split('').map((c) => TR[c] ?? c).join('')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
// данные пакета передаём одним JSON-литералом в долларовых кавычках
const dollar = (json) => `$ekip$${json}$ekip$`;

const products = JSON.parse(await readFile('data/ekip/products.json', 'utf8'));
await mkdir(outDir, { recursive: true });

const prepare = `begin;
delete from "Product" where "categoryId" in (select id from "Category" where slug in (${[...DEMO_CATEGORIES, 'obuv', 'aksessuary'].map(q).join(', ')}))
  and slug not like 'ekip-%' and not exists (select 1 from "OrderItem" oi where oi."productId" = "Product".id);
delete from "Category" c where slug in (${DEMO_CATEGORIES.map(q).join(', ')}) and not exists (select 1 from "Product" p where p."categoryId" = c.id);
${Object.values(CATEGORIES).map((c) => `insert into "Category"(id, slug, name) values (${q('cat-' + c.slug)}, ${q(c.slug)}, ${q(c.name)}) on conflict (slug) do update set name = excluded.name;`).join('\n')}
insert into "Image"(id, "contentType", data) values (${q(PLACEHOLDER_ID)}, 'image/svg+xml', convert_to(${q(PLACEHOLDER_SVG)}, 'UTF8')) on conflict (id) do nothing;
commit;
`;
await writeFile(path.join(outDir, '00-prepare.sql'), prepare);

const used = new Set();
const rows = products.map((p) => {
  let slug = 'ekip-' + slugify(p.name);
  for (let n = 2; used.has(slug); n++) slug = `ekip-${slugify(p.name)}-${n}`;
  used.add(slug);
  return {
    s: slug,
    n: p.name,
    b: p.brand,
    a: p.sku,
    p: p.price_rub * 100,
    o: p.old_price_rub ? p.old_price_rub * 100 : null,
    k: p.subcategory,
    c: p.colors[0] ?? null,
    g: CATEGORIES[p.category].slug,
    z: p.sizes.map((s) => [s.size, s.stock ?? STOCK_OVER]),
  };
});

// описание собираем из полей товара (тексты с s-ekip не копируются)
const insertSql = (batch) => `begin;
create temp table d on commit drop as
select * from jsonb_to_recordset(${dollar(JSON.stringify(batch))}::jsonb)
  as x(s text, n text, b text, a text, p int, o int, k text, c text, g text, z jsonb);
insert into "Product"(id, slug, name, description, price, "oldPrice", "imageUrl", kind, color, "categoryId", "updatedAt", sizes, stock)
select d.s, d.s, d.n,
  concat_ws(E'\\n', d.k || coalesce(' ' || d.b, '') || '.', 'Артикул: ' || d.a || '.', 'Цвет: ' || lower(d.c) || '.'),
  d.p, d.o, ${q(PLACEHOLDER_URL)}, d.k, d.c, (select id from "Category" where slug = d.g), now(),
  coalesce((select string_agg(e->>0, ',') from jsonb_array_elements(d.z) e), ''),
  coalesce((select sum((e->>1)::int) from jsonb_array_elements(d.z) e), 0)
from d
on conflict (slug) do update set name = excluded.name, description = excluded.description, price = excluded.price,
  "oldPrice" = excluded."oldPrice", kind = excluded.kind, color = excluded.color, "categoryId" = excluded."categoryId",
  "updatedAt" = now(), sizes = excluded.sizes, stock = excluded.stock;
delete from "ProductSize" where "productId" in (select s from d);
insert into "ProductSize"(id, "productId", size, stock, position)
select d.s || '-' || t.i, d.s, t.e->>0, (t.e->>1)::int, t.i - 1
from d, jsonb_array_elements(d.z) with ordinality as t(e, i);
insert into "ProductImage"(id, "productId", url, position)
select d.s || '-img', d.s, ${q(PLACEHOLDER_URL)}, 0 from d
on conflict (id) do nothing;
commit;
`;

let files = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  files++;
  await writeFile(path.join(outDir, `${String(files).padStart(2, '0')}-products.sql`), insertSql(rows.slice(i, i + BATCH)));
}
console.log(`${rows.length} товаров, ${files} пакетов → ${outDir}`);
