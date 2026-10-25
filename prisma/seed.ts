import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const categories = [
  { slug: "futbolki", name: "Футболки" },
  { slug: "kurtki", name: "Куртки и толстовки" },
  { slug: "shorty-i-bryuki", name: "Шорты и брюки" },
  { slug: "obuv", name: "Обувь" },
  { slug: "aksessuary", name: "Аксессуары" },
];

// цены в рублях — переводятся в копейки ниже
const products = [
  ["igrovaya-futbolka-champion", "Игровая футболка Champion", "futbolki", 2490, null, "tee-red", "XS,S,M,L,XL,XXL"],
  ["futbolka-training-pro", "Тренировочная футболка Training Pro", "futbolki", 1990, 2790, "tee-black", "S,M,L,XL"],
  ["futbolka-academy", "Футболка Academy", "futbolki", 1590, null, "tee-blue", "S,M,L,XL"],
  ["futbolka-basic-white", "Футболка Basic", "futbolki", 1290, 1690, "tee-white", "S,M,L,XL,XXL"],
  ["vetrovka-storm", "Ветровка Storm", "kurtki", 5990, null, "jacket-black", "S,M,L,XL"],
  ["olimpiyka-team", "Олимпийка Team", "kurtki", 4490, 5990, "jacket-navy", "S,M,L,XL"],
  ["shorty-match", "Игровые шорты Match", "shorty-i-bryuki", 1490, null, "shorts-black", "S,M,L,XL"],
  ["shorty-sprint", "Беговые шорты Sprint", "shorty-i-bryuki", 1790, 2290, "shorts-red", "S,M,L"],
  ["bryuki-trenirovochnye-elite", "Тренировочные брюки Elite", "shorty-i-bryuki", 3490, null, "pants-black", "S,M,L,XL"],
  ["bryuki-jogger", "Брюки Jogger", "shorty-i-bryuki", 2990, null, "pants-gray", "S,M,L,XL"],
  ["butsy-aguila", "Бутсы Aguila FG", "obuv", 7990, 9990, "boot-white", "39,40,41,42,43,44,45"],
  ["butsy-top-flex", "Бутсы Top Flex TF", "obuv", 6490, null, "boot-black", "39,40,41,42,43,44"],
  ["myach-dynamic", "Футбольный мяч Dynamic", "aksessuary", 2290, null, "ball-white", "5"],
  ["sumka-sport", "Спортивная сумка Team", "aksessuary", 2790, null, "bag-black", ""],
] as const;

const DEMO_STOCK = [12, 7, 3, 0, 9, 1, 15, 5];

// демо-коллекции: лёгкое — на тёплый сезон, куртки, брюки и обувь — на холодный
const SEASONS: Record<string, string> = {
  futbolki: "Весна — лето 2026",
  "shorty-i-bryuki": "Весна — лето 2026",
  kurtki: "Осень — зима 2026",
  obuv: "Осень — зима 2026",
};

async function main() {
  for (const c of categories) {
    await db.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  const bySlug = Object.fromEntries((await db.category.findMany()).map((c) => [c.slug, c.id]));

  for (const [slug, name, cat, price, oldPrice, image, sizes] of products) {
    await db.product.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name,
        categoryId: bySlug[cat],
        price: price * 100,
        oldPrice: oldPrice ? oldPrice * 100 : null,
        imageUrl: `/products/${image}.webp`,
        season: SEASONS[cat],
        images: { create: [{ url: `/products/${image}.webp`, position: 0 }] },
        description: `${name} — лёгкая и дышащая модель для тренировок и игр.\n\nСостав: 100% полиэстер.\nУход: машинная стирка при 30°C.`,
        // разные остатки, чтобы на витрине были и ходовые, и почти распроданные размеры
        sizes: {
          create: (sizes ? sizes.split(",") : [""]).map((size, position) => ({
            size,
            position,
            stock: size ? DEMO_STOCK[(position + slug.length) % DEMO_STOCK.length] : 8,
          })),
        },
      },
    });
  }

  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin12345";
  await db.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: { email, name: "Администратор", role: "ADMIN", password: await bcrypt.hash(password, 10) },
  });
  console.log(`Готово. Админ: ${email}`);
}

main().finally(() => db.$disconnect());
