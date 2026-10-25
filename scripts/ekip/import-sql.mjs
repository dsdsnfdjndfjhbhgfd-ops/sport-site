// Готовит SQL для загрузки data/ekip/products.json в базу сайта (Supabase / PostgreSQL).
// Запуск: node scripts/ekip/import-sql.mjs <папка-для-sql> [товаров-в-пакете]
// 00-prepare.sql — создаёт категории s-ekip; NN-products.sql — пакеты товаров (Product + ProductSize).
// Товары загружаются скрытыми и без фото: их включают в админке после загрузки фото.
// Ничего не удаляет — демо-товары удаляются отдельно.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const [outDir = 'out-sql', batchArg = '120'] = process.argv.slice(2);
const BATCH = Number(batchArg);
// категории как на s-ekip; obuv и aksessuary уже есть в базе — их оставляем
const CATEGORIES = {
  'АКСЕССУАРЫ': { slug: 'aksessuary', name: 'Аксессуары' },
  'МЯЧИ': { slug: 'myachi', name: 'Мячи' },
  'ОБУВЬ': { slug: 'obuv', name: 'Обувь' },
  'ОДЕЖДА': { slug: 'odezhda', name: 'Одежда' },
};
const STOCK_OVER = 500; // на s-ekip большие остатки показаны как «>500»

const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const slugify = (s) => s.toLowerCase().split('').map((c) => TR[c] ?? c).join('')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
// данные пакета передаём одним JSON-литералом в долларовых кавычках
const dollar = (json) => `$ekip$${json}$ekip$`;

const products = JSON.parse(await readFile('data/ekip/products.json', 'utf8'));
await mkdir(outDir, { recursive: true });

const prepare = `${Object.values(CATEGORIES).map((c) => `insert into "Category"(id, slug, name) values (${q('cat-' + c.slug)}, ${q(c.slug)}, ${q(c.name)}) on conflict (slug) do update set name = excluded.name;`).join('\n')}
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
    ...(p.old_price_rub ? { o: p.old_price_rub * 100 } : {}),
    k: p.subcategory,
    c: p.colors[0] && p.colors[0] !== 'Цвет не задан' ? p.colors[0] : null,
    g: CATEGORIES[p.category].slug,
    // товар без размера на сайте хранится с пустым size
    z: p.sizes.map((s) => [s.size === 'Без размера' ? '' : s.size, s.stock ?? STOCK_OVER]),
  };
});

// описание собираем из полей товара (тексты с s-ekip не копируются)
const insertSql = (batch) => `begin;
create temp table d on commit drop as
select * from jsonb_to_recordset(${dollar(JSON.stringify(batch))}::jsonb)
  as x(s text, n text, b text, a text, p int, o int, k text, c text, g text, z jsonb);
insert into "Product"(id, slug, name, description, price, "oldPrice", "imageUrl", active, kind, color, "categoryId", "updatedAt", sizes, stock)
select d.s, d.s, d.n,
  concat_ws(E'\\n', d.k || coalesce(' ' || d.b, '') || '.', 'Артикул: ' || d.a || '.', 'Цвет: ' || lower(d.c) || '.'),
  d.p, d.o, '', false, d.k, d.c, (select id from "Category" where slug = d.g), now(),
  coalesce((select string_agg(e->>0, ',') from jsonb_array_elements(d.z) e), ''),
  coalesce((select sum((e->>1)::int) from jsonb_array_elements(d.z) e), 0)
from d
on conflict (slug) do update set name = excluded.name, description = excluded.description, price = excluded.price,
  "oldPrice" = excluded."oldPrice", kind = excluded.kind, color = excluded.color, "categoryId" = excluded."categoryId",
  "updatedAt" = now(), sizes = excluded.sizes, stock = excluded.stock;
insert into "ProductSize"(id, "productId", size, stock, position)
select d.s || '-' || t.i, d.s, t.e->>0, (t.e->>1)::int, t.i - 1
from d, jsonb_array_elements(d.z) with ordinality as t(e, i)
on conflict ("productId", size) do update set stock = excluded.stock, position = excluded.position;
commit;
`;

let files = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  files++;
  await writeFile(path.join(outDir, `${String(files).padStart(2, '0')}-products.sql`), insertSql(rows.slice(i, i + BATCH)));
}
console.log(`${rows.length} товаров, ${files} пакетов → ${outDir}`);
