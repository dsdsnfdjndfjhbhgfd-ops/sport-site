// Статическая демо-копия сайта для GitHub Pages.
//
// Сайт работает на сервере (база, вход, оплата), а GitHub Pages умеет отдавать
// только готовые файлы. Скрипт обходит запущенный сайт, сохраняет каждую страницу
// как HTML и подключает scripts/static-demo.js, который оживляет корзину,
// выбор размера, сортировку и поиск прямо в браузере.
//
// Запуск:
//   npm run setup && npm run build && npm start   (в отдельном терминале)
//   BASE_PATH=/sport-site node scripts/export-static.mjs
// Результат — папка out/, её содержимое публикуется в ветку gh-pages.

import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const ORIGIN = process.env.ORIGIN || "http://localhost:3000";
const BASE = (process.env.BASE_PATH || "").replace(/\/$/, "");
const OUT = path.resolve("out");
const db = new PrismaClient();

// --- демо-данные: несколько заказов, чтобы кабинет и админка не были пустыми ---

async function ensureDemoOrders(admin) {
  if ((await db.order.count()) > 0) return;
  const customer = await db.user.upsert({
    where: { email: "ivan@example.com" },
    update: {},
    create: { email: "ivan@example.com", name: "Иван Петров", password: "-" },
  });
  const products = await db.product.findMany({ orderBy: { createdAt: "asc" } });
  const pick = (slug) => products.find((p) => p.slug === slug);
  const orders = [
    [customer, "PAID", [["igrovaya-futbolka-champion", "L", 2], ["shorty-match", "L", 1]]],
    [customer, "SHIPPED", [["butsy-aguila", "42", 1]]],
    [admin, "PENDING", [["vetrovka-storm", "M", 1], ["myach-dynamic", "5", 1]]],
  ];
  for (const [user, status, lines] of orders) {
    const items = lines.map(([slug, size, quantity]) => {
      const p = pick(slug);
      return { productId: p.id, name: p.name, size, price: p.price, quantity };
    });
    const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0);
    await db.order.create({
      data: {
        userId: user.id,
        status,
        total: subtotal + (subtotal >= 500000 ? 0 : 39000),
        fullName: user.name,
        phone: "+7 900 123-45-67",
        address: "Москва, ул. Спортивная, д. 1, кв. 10",
        paymentProvider: "mock",
        items: { create: items },
      },
    });
  }
}

// --- адреса ---

/** /catalog?category=x&sort=cheap -> "catalog/category-x_sort-cheap" */
function outDir(url) {
  const u = new URL(url, ORIGIN);
  const params = [...u.searchParams]
    .filter(([k, v]) => k !== "next" && k !== "q" && !(k === "sort" && v === "new"))
    .sort(([a], [b]) => a.localeCompare(b));
  const parts = u.pathname.split("/").filter(Boolean);
  if (params.length) parts.push(params.map(([k, v]) => `${k}-${v}`).join("_"));
  return parts.join("/");
}

const staticHref = (dir) => `${BASE}/${dir ? `${dir}/` : ""}`;
const isAsset = (p) => p.startsWith("/_next/") || /\.[a-z0-9]+$/i.test(p);
const decode = (s) => s.replace(/&amp;/g, "&");

// --- обход ---

const queue = [];
const seen = new Set();
function enqueue(url) {
  const u = new URL(url, ORIGIN);
  if (u.pathname.startsWith("/api/")) return;
  const key = outDir(u);
  if (seen.has(key)) return;
  seen.add(key);
  queue.push(u.pathname + u.search);
  // у каталога сортировка переключается выпадающим списком, ссылок на неё нет
  if (u.pathname === "/catalog") {
    for (const sort of ["cheap", "expensive", "name"]) {
      const v = new URL(u);
      v.searchParams.set("sort", sort);
      enqueue(v.pathname + v.search);
    }
  }
}

function rewrite(html, { pageUrl, extraHead = "" }) {
  html = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
    .replace(/<link\b[^>]*\bas="script"[^>]*\/?>/g, "")
    .replace(/\s(href|src|action)="(\/[^"]*)"/g, (_, attr, raw) => {
      const value = decode(raw);
      if (value.startsWith("//")) return ` ${attr}="${raw}"`;
      if (isAsset(value.split("?")[0])) return ` ${attr}="${BASE}${value}"`;
      if (attr !== "action") enqueue(value);
      return ` ${attr}="${staticHref(outDir(value))}"`;
    });

  const demo = {
    base: BASE,
    path: new URL(pageUrl, ORIGIN).pathname,
    query: Object.fromEntries(new URL(pageUrl, ORIGIN).searchParams),
  };
  const head =
    `<script>window.__DEMO__=${JSON.stringify(demo)}</script>` +
    extraHead +
    `<script src="${BASE}/demo.js" defer></script>`;
  return html.replace("</head>", `${head}</head>`);
}

async function main() {
  const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("Нет администратора — сначала выполните npm run setup");
  await ensureDemoOrders(admin);

  const env = await readFile(".env", "utf8").catch(() => "");
  const secret = process.env.AUTH_SECRET || env.match(/^AUTH_SECRET="?([^"\n]*)"?/m)?.[1];
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(admin.id)
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
  const adminCookie = `session=${token}`;

  const products = Object.fromEntries(
    (await db.product.findMany()).map((p) => [
      p.slug,
      {
        productId: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        imageUrl: p.imageUrl.startsWith("/") ? BASE + p.imageUrl : p.imageUrl,
        sizes: p.sizes.split(",").map((s) => s.trim()).filter(Boolean),
        stock: p.stock,
      },
    ]),
  );

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // вход и регистрация показываются гостю, всё остальное — администратору,
  // чтобы были видны личный кабинет и админ-панель
  const guestOnly = new Set(["/login", "/register"]);
  for (const p of ["/", "/cart", "/checkout", "/login", "/register", "/account", "/admin"]) enqueue(p);
  for (const o of await db.order.findMany()) enqueue(`/account/orders/${o.id}`);

  while (queue.length) {
    const url = queue.shift();
    const pathname = new URL(url, ORIGIN).pathname;
    const res = await fetch(ORIGIN + url, {
      redirect: "manual",
      headers: guestOnly.has(pathname) ? {} : { cookie: adminCookie },
    });
    const dir = outDir(url);
    let html;
    if (res.status >= 300 && res.status < 400) {
      const target = staticHref(outDir(res.headers.get("location")));
      enqueue(res.headers.get("location"));
      html = `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${target}"><a href="${target}">${target}</a>`;
    } else if (res.ok) {
      const slug = pathname.startsWith("/product/") ? pathname.split("/")[2] : null;
      const extraHead = slug && products[slug]
        ? `<script>window.__DEMO_PRODUCT__=${JSON.stringify(products[slug])}</script>`
        : "";
      html = rewrite(await res.text(), { pageUrl: url, extraHead });
    } else {
      console.warn(`  ${res.status} ${url}`);
      continue;
    }
    await mkdir(path.join(OUT, dir), { recursive: true });
    await writeFile(path.join(OUT, dir, "index.html"), html);
    console.log(`  ${url} -> /${dir}`);
  }

  const notFound = await fetch(`${ORIGIN}/__not-found__`, { headers: { cookie: adminCookie } });
  await writeFile(path.join(OUT, "404.html"), rewrite(await notFound.text(), { pageUrl: "/404" }));

  await cp(".next/static", path.join(OUT, "_next/static"), { recursive: true });
  await cp("public", OUT, { recursive: true });
  if (existsSync("uploads")) await cp("uploads", path.join(OUT, "uploads"), { recursive: true });
  await cp("scripts/static-demo.js", path.join(OUT, "demo.js"));
  await writeFile(path.join(OUT, ".nojekyll"), "");
  console.log(`Готово: ${seen.size} страниц в ${OUT}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
