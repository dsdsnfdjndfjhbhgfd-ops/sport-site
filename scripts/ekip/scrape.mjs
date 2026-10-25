// Сбор структуры каталога и ассортимента s-ekip.ru (Торговый каталог, Oracle APEX).
// Запуск: node scripts/ekip/scrape.mjs [--limit N]
// Пишет data/ekip/{products.json,categories.json,facets.json,scrape-log.json} и скриншоты.
// Фото товаров и тексты описаний не сохраняются.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = 'https://s-ekip.ru';
const CAT_URL = `${BASE}/ords/r/akiaer/js/cat`;
// фильтр «Вид» передаётся параметром URL (проверено); «Тип» через URL не применяется
const kindUrl = (kind) => `${CAT_URL}?p307_name_product_kind=${encodeURIComponent(kind)}`;
const productUrl = (id) => `${CAT_URL}?request=show&P307_ID_PRODUCT_VIEW=${id}`;
const OUT = path.resolve('data/ekip');
const SHOTS = path.join(OUT, 'screenshots');
const PAUSE = 1000;
const HEADER_REGION = 'R1075195247832555932'; // шапка окна товара: название, артикул, цена

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;
const TEST = process.argv.includes('--test'); // только первый вид и 2 типа

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const parseRub = (s) => {
  const d = String(s || '').replace(/[^\d,.]/g, '').replace(',', '.');
  return d ? Number(d) : null;
};

const failures = [];

async function openCatalog(page) {
  for (let attempt = 1; ; attempt++) {
    try {
      await page.goto(CAT_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForSelector('#catalog .a-CardView-item', { timeout: 90000 });
      break;
    } catch (e) {
      if (attempt >= 4) throw e;
      log('каталог не открылся, повтор', attempt, e.message.split('\n')[0]);
      await sleep(5000 * attempt);
    }
  }
  await sleep(2000);
}

// Все группы фасетов с вариантами и счётчиками
async function readFacets(page) {
  return page.evaluate(() => {
    const fs = document.querySelector('#fs_fr');
    return [...fs.querySelectorAll('.a-FS-control')].map((c) => {
      const header = c.querySelector('.a-FS-label');
      const label = header ? header.innerText.trim() : '';
      const options = [...c.querySelectorAll('input[type=checkbox], input[type=radio]')].map((i) => {
        const lab = document.querySelector(`label[for="${i.id}"]`);
        const cnt = lab && lab.querySelector('.apex-item-option-badge');
        const text = lab && lab.querySelector('.label');
        return {
          value: i.value,
          label: (text || lab || { innerText: '' }).innerText.trim(),
          count: cnt && cnt.dataset.count ? Number(cnt.dataset.count) : null,
          checked: i.checked,
        };
      });
      const selects = [...c.querySelectorAll('select')].map((s) =>
        [...s.options].map((o) => o.text.trim()).filter((t) => t && t !== '-Выбрать-'));
      const ranges = [...c.querySelectorAll('input[type=number]')].map((i) => i.id);
      return { label, options, selects: selects[0] || null, range: ranges.length ? true : null };
    });
  });
}

// Кликнуть вариант фасета и дождаться перерисовки карточек
async function toggleFacet(page, groupLabel, value) {
  const done = page.waitForResponse((r) => r.url().includes('wwv_flow.ajax') && r.request().method() === 'POST', { timeout: 60000 })
    .then(() => 'ok', () => 'timeout');
  const id = await page.evaluate(({ groupLabel, value }) => {
    const c = [...document.querySelectorAll('#fs_fr .a-FS-control')].find((x) => {
      const h = x.querySelector('.a-FS-label');
      return h && h.innerText.trim() === groupLabel;
    });
    const i = c && [...c.querySelectorAll('input[type=checkbox]')].find((x) => x.value === value);
    if (!i) return null;
    // клик через JS: часть вариантов скрыта под «Показать больше»
    i.closest('.apex-item-option').click();
    return i.id;
  }, { groupLabel, value });
  if (!id) throw new Error(`facet ${groupLabel}=${value} not found`);
  const r = await done;
  // ждём, пока индикатор загрузки исчезнет
  await page.waitForFunction(() => !document.querySelector('#catalog .u-Processing, .u-Processing'), null, { timeout: 30000 }).catch(() => {});
  await sleep(PAUSE + 500);
  return r;
}

// Прокрутить ленту до конца (пагинация — бесконечная прокрутка), вернуть карточки
async function loadAllCards(page, expected) {
  let prev = -1, stable = 0;
  const steps = [];
  for (let i = 0; i < 200; i++) {
    const n = await page.locator('#catalog .a-CardView-item').count();
    steps.push(n);
    if (expected != null && n >= expected) break;
    if (n === prev) { if (++stable >= 3) break; } else stable = 0;
    prev = n;
    await page.evaluate(() => {
      const items = document.querySelectorAll('#catalog .a-CardView-item');
      if (items.length) items[items.length - 1].scrollIntoView();
      window.scrollBy(0, 400);
    });
    await sleep(PAUSE + 500);
  }
  const cards = await page.evaluate(() => [...document.querySelectorAll('#catalog .a-CardView-item')].map((li) => {
    const title = li.querySelector('.a-CardView-headerBody > span');
    const sub = li.querySelector('.a-CardView-subTitle');
    const icons = sub ? [...sub.querySelectorAll('.fa')].map((e) => [...e.classList].find((c) => c.startsWith('fa-') ))
      : [];
    const sec = li.querySelector('.a-CardView-actionsSecondary');
    const prices = sec ? [...sec.querySelectorAll('.a-CardView-buttonLabel, s, del, strike')].map((e) => e.innerText.trim()).filter(Boolean) : [];
    const struck = sec ? [...sec.querySelectorAll('s, del, strike, [style*=line-through]')].map((e) => e.innerText.trim()) : [];
    const badge = li.querySelector('.a-CardView-badge');
    return {
      id: li.dataset.id,
      name: title ? title.innerText.trim() : null,
      color: sub ? sub.innerText.trim() || null : null,
      genderIcons: icons,
      prices,
      struck,
      badge: badge ? badge.innerText.trim() : null,
      secondaryHtmlLen: sec ? sec.innerHTML.length : 0,
    };
  }));
  return { cards, steps };
}

// Остатки по размерам для карточки (тот же запрос, что при наведении на фото)
async function fetchRest(page, id) {
  const html = await page.evaluate((id) => apex.server.process('LOADRESTMV', {
    pageItems: '', x01: id, x02: '', x03: '', x04: '',
  }, { dataType: 'text' }), id);
  return page.evaluate((html) => {
    const d = document.createElement('div');
    d.innerHTML = html;
    const head = [...d.querySelectorAll('thead th')].map((t) => t.innerText.trim());
    const rows = [...d.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()));
    return { head, rows };
  }, html);
}

// Артикул из шапки окна товара: обновляем только этот регион (без change-событий,
// чтобы не перерисовывались остальные регионы окна) и ждём, пока в нём появится нужный товар
async function fetchSku(page, id, name) {
  return page.evaluate(({ id, name, region }) => new Promise((res) => {
    const el = () => document.getElementById(region);
    const started = Date.now();
    apex.item('P307_ID_PRODUCT_VIEW').setValue(id, null, true);
    apex.region(region).refresh();
    const tick = () => {
      const txt = el() ? el().innerText : '';
      if (txt.includes('Артикул:') && (!name || txt.includes(name))) {
        const m = txt.match(/Артикул:\s*([^\n]+)/);
        return res({ sku: m ? m[1].trim() : null });
      }
      if (Date.now() - started > 30000) return res({ error: 'timeout' });
      setTimeout(tick, 300);
    };
    setTimeout(tick, 500);
  }), { id, name, region: HEADER_REGION });
}

function makeSummary(p) {
  const parts = [];
  parts.push(`${p.subcategory || p.category}${p.brand ? ' ' + p.brand : ''}`);
  if (p.colors.length) parts.push(`цвет: ${p.colors.join(', ').toLowerCase()}`);
  const sizes = p.sizes.map((s) => s.size);
  if (sizes.length === 1) parts.push(`размер ${sizes[0]}`);
  else if (sizes.length > 1) parts.push(`размеры ${sizes[0]} – ${sizes[sizes.length - 1]}`);
  return parts.join('; ') + '.';
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on('dialog', (d) => d.dismiss().catch(() => {}));

  await openCatalog(page);
  await page.screenshot({ path: path.join(SHOTS, '01-catalog.png') });
  const facets = await readFacets(page);
  await writeFile(path.join(OUT, 'facets.json'), JSON.stringify(facets, null, 2));
  const brands = (facets.find((f) => f.label === 'Бренд')?.options || []).map((o) => o.value);
  const kinds = (facets.find((f) => f.label === 'Вид')?.options || []).filter((o) => o.count);
  log('categories (Вид):', kinds.map((k) => `${k.label} ${k.count}`).join(', '));

  const categories = [];
  const listed = new Map(); // id -> {category, subcategory, card}
  const perCategory = [];
  const pagingSteps = [];

  for (const kind of TEST ? kinds.slice(0, 1) : kinds) {
    log('Вид', kind.value);
    await toggleFacet(page, 'Вид', kind.value);
    const types = ((await readFacets(page)).find((f) => f.label === 'Тип')?.options || []).filter((o) => o.count);
    const node = { name: kind.label, url: kindUrl(kind.value), facet: { group: 'Вид', value: kind.value }, count: kind.count, children: [] };
    let firstType = true;
    for (const type of TEST ? types.slice(0, 2) : types) {
      try {
        await toggleFacet(page, 'Тип', type.value);
        const { cards, steps } = await loadAllCards(page, type.count);
        pagingSteps.push({ kind: kind.value, type: type.value, steps });
        if (firstType && kind === kinds[0]) await page.screenshot({ path: path.join(SHOTS, '02-category.png') });
        firstType = false;
        for (const c of cards) if (!listed.has(c.id)) listed.set(c.id, { category: kind.label, subcategory: type.label, card: c });
        node.children.push({ name: type.label, url: kindUrl(kind.value), facet: { group: 'Тип', value: type.value }, count: type.count, collected: cards.length, children: [] });
        perCategory.push({ category: kind.label, subcategory: type.label, site_count: type.count, collected: cards.length });
        log(`  ${type.label}: ${cards.length}/${type.count}`);
        if (cards.length !== type.count) failures.push({ where: `${kind.label}/${type.label}`, error: `собрано ${cards.length} из ${type.count}` });
        await toggleFacet(page, 'Тип', type.value);
      } catch (e) {
        failures.push({ where: `${kind.label}/${type.label}`, error: e.message });
        log('  FAIL', type.label, e.message);
        await openCatalog(page);
        await toggleFacet(page, 'Вид', kind.value);
      }
    }
    categories.push(node);
    await toggleFacet(page, 'Вид', kind.value);
  }

  // Детали: артикул и остатки по размерам. Окно товара открываем один раз — регион шапки
  // обновляется только когда он видим; затем для каждого товара обновляем лишь шапку.
  await openCatalog(page);
  await page.click('#catalog .a-CardView-item >> nth=0 >> .a-CardView-media a');
  await sleep(5000);
  await page.screenshot({ path: path.join(SHOTS, '03-product.png') });
  const products = [];
  let i = 0;
  for (const [id, { category, subcategory, card }] of listed) {
    if (i++ >= LIMIT) break;
    const name = card.name;
    const brand = brands.find((b) => name && name.toUpperCase().startsWith(b)) || null;
    const priceNums = card.prices.map(parseRub).filter((x) => x != null);
    const struckNums = card.struck.map(parseRub).filter((x) => x != null);
    const price = priceNums.find((x) => !struckNums.includes(x)) ?? priceNums[0] ?? null;
    const old = struckNums[0] ?? (priceNums.length > 1 ? Math.max(...priceNums) : null);
    let sku = null, sizes = [], warehouses = null;
    try {
      const r = await fetchSku(page, id, name);
      if (r.error) throw new Error('артикул: ' + r.error);
      sku = r.sku;
    } catch (e) {
      failures.push({ where: `товар ${id} (${name})`, error: e.message });
    }
    await sleep(PAUSE);
    try {
      const rest = await fetchRest(page, id);
      warehouses = rest.head.slice(1);
      sizes = rest.rows.map(([size, ...qty]) => {
        const raw = qty.join(' / ');
        // пустая ячейка склада = 0; «>500» — точного числа нет
        const nums = qty.map((q) => (q === '' ? 0 : /^\d+$/.test(q) ? Number(q) : null));
        const exact = nums.every((n) => n != null);
        return {
          size,
          stock: exact ? nums.reduce((a, b) => a + b, 0) : null,
          stock_raw: raw,
          ...(qty.length > 1 ? { by_warehouse: Object.fromEntries(warehouses.map((w, k) => [w, qty[k]])) } : {}),
        };
      });
      await sleep(PAUSE);
    } catch (e) {
      failures.push({ where: `товар ${id} (${name})`, error: 'остатки: ' + e.message });
    }
    const p = {
      category, subcategory, name, brand, sku,
      price_rub: price,
      old_price_rub: old && old !== price ? old : null,
      sizes,
      colors: card.color ? [card.color] : [],
      url: productUrl(id),
      summary: '',
      site_id: id,
      warehouses,
    };
    p.summary = makeSummary(p);
    products.push(p);
    if (i % 25 === 0) log(`детали: ${i}/${listed.size}`);
  }

  const cardSamples = [...listed.values()].slice(0, 5).map((x) => x.card);
  await writeFile(path.join(OUT, 'products.json'), JSON.stringify(products, null, 2));
  await writeFile(path.join(OUT, 'categories.json'), JSON.stringify(categories, null, 2));
  await writeFile(path.join(OUT, 'scrape-log.json'), JSON.stringify({
    scraped_at: new Date().toISOString(), source: CAT_URL,
    total_listed: listed.size, total_products: products.length,
    per_category: perCategory, paging_steps: pagingSteps, card_samples: cardSamples, failures,
  }, null, 2));
  log('готово:', products.length, 'товаров,', failures.length, 'ошибок');
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
