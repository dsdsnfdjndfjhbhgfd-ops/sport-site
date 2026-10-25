"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parsePrice } from "@/lib/money";
import { ORDER_STATUSES } from "@/lib/orders";

export interface AdminFormState {
  error?: string;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

function slugify(text: string) {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return text
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "item";
  let slug = root;
  for (let i = 2; ; i++) {
    const existing = await db.product.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${root}-${i}`;
  }
}

// фото хранятся в базе: у хостинга нет постоянного диска
async function saveImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("Поддерживаются JPG, PNG, WEBP и SVG");
  // Vercel принимает запросы не больше 4,5 МБ
  if (file.size > 4 * 1024 * 1024) throw new Error("Файл больше 4 МБ");
  const image = await db.image.create({
    data: { contentType: file.type, data: Buffer.from(await file.arrayBuffer()) },
  });
  return `/api/images/${image.id}`;
}

/** Загружает одно фото товара; форма вызывает её для каждого выбранного файла. */
export async function uploadImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Файл не выбран" };
  try {
    return { url: await saveImage(file) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const IMAGE_URL = /^(\/[^\s]*|https?:\/\/[^\s]+)$/;
const STORED_IMAGE = /^\/api\/images\/([^/?#]+)$/;

const productSchema = z.object({
  name: z.string().trim().min(2, "Введите название"),
  description: z.string().trim().min(1, "Введите описание"),
  categoryId: z.string().min(1, "Выберите категорию"),
});

/** Размеры и остатки из формы: поля sizeName и sizeStock идут парами. */
function parseSizes(formData: FormData): { size: string; stock: number }[] | string {
  const names = formData.getAll("sizeName").map((v) => String(v).trim());
  const stocks = formData.getAll("sizeStock").map((v) => Number(v));
  if (!names.length) return "Добавьте хотя бы один размер";
  const rows: { size: string; stock: number }[] = [];
  for (let i = 0; i < names.length; i++) {
    const stock = stocks[i];
    if (!Number.isInteger(stock) || stock < 0) return "Остаток — целое число от 0";
    if (names.length > 1 && !names[i]) return "Укажите название каждого размера";
    if (rows.some((r) => r.size.toLowerCase() === names[i].toLowerCase())) return `Размер ${names[i]} указан дважды`;
    rows.push({ size: names[i], stock });
  }
  return rows;
}

export async function saveProduct(
  productId: string | null,
  _: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;
  const sizes = parseSizes(formData);
  if (typeof sizes === "string") return { error: sizes };

  const price = parsePrice(String(formData.get("price") || ""));
  if (price === null || price <= 0) return { error: "Некорректная цена" };
  const oldPriceRaw = String(formData.get("oldPrice") || "").trim();
  const oldPrice = oldPriceRaw ? parsePrice(oldPriceRaw) : null;
  if (oldPriceRaw && oldPrice === null) return { error: "Некорректная старая цена" };

  const images = [...new Set(formData.getAll("images").map((v) => String(v).trim()).filter(Boolean))];
  if (!images.length) return { error: "Добавьте хотя бы одно фото" };
  if (images.some((url) => !IMAGE_URL.test(url))) return { error: "Некорректная ссылка на фото" };

  const fields = {
    name: data.name,
    description: data.description,
    categoryId: data.categoryId,
    price,
    oldPrice: oldPrice && oldPrice > price ? oldPrice : null,
    imageUrl: images[0],
    active: formData.get("active") === "on",
  };

  const slug = productId ? undefined : await uniqueSlug(data.name);
  const before = productId ? await db.productImage.findMany({ where: { productId } }) : [];
  await db.$transaction(async (tx) => {
    const product = productId
      ? await tx.product.update({ where: { id: productId }, data: fields })
      : await tx.product.create({ data: { ...fields, slug: slug! } });
    await tx.productImage.deleteMany({ where: { productId: product.id } });
    await tx.productImage.createMany({
      data: images.map((url, position) => ({ productId: product.id, url, position })),
    });
    await tx.productSize.deleteMany({
      where: { productId: product.id, size: { notIn: sizes.map((s) => s.size) } },
    });
    for (const [position, { size, stock }] of sizes.entries()) {
      await tx.productSize.upsert({
        where: { productId_size: { productId: product.id, size } },
        update: { stock, position },
        create: { productId: product.id, size, stock, position },
      });
    }
  });
  await deleteUnusedImages(before.map((i) => i.url).filter((url) => !images.includes(url)));
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

/** Удаляет из базы загруженные фото, которые больше не стоят ни у одного товара. */
async function deleteUnusedImages(urls: string[]) {
  for (const url of urls) {
    const id = url.match(STORED_IMAGE)?.[1];
    if (!id) continue;
    const used = await db.productImage.count({ where: { url } });
    if (!used) await db.image.deleteMany({ where: { id } });
  }
}

export async function updatePrice(productId: string, formData: FormData) {
  await requireAdmin();
  const price = parsePrice(String(formData.get("price") || ""));
  if (price === null || price <= 0) return;
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return;
  await db.product.update({
    where: { id: productId },
    // если новая цена выше старой — скидка снимается
    data: { price, oldPrice: product.oldPrice && product.oldPrice > price ? product.oldPrice : null },
  });
  revalidatePath("/", "layout");
}

export async function toggleProduct(productId: string) {
  await requireAdmin();
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return;
  await db.product.update({ where: { id: productId }, data: { active: !product.active } });
  revalidatePath("/", "layout");
}

export async function deleteProduct(productId: string) {
  await requireAdmin();
  const used = await db.orderItem.count({ where: { productId } });
  if (used > 0) {
    // товар есть в заказах — просто скрываем
    await db.product.update({ where: { id: productId }, data: { active: false } });
  } else {
    const images = await db.productImage.findMany({ where: { productId } });
    await db.product.delete({ where: { id: productId } });
    await deleteUnusedImages(images.map((i) => i.url));
  }
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function createCategory(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  if (name.length < 2) return { error: "Введите название категории" };
  const slug = slugify(name);
  if (await db.category.findUnique({ where: { slug } })) return { error: "Такая категория уже есть" };
  await db.category.create({ data: { name, slug } });
  revalidatePath("/", "layout");
  return {};
}

export async function deleteCategory(categoryId: string) {
  await requireAdmin();
  if ((await db.product.count({ where: { categoryId } })) > 0) return;
  await db.category.delete({ where: { id: categoryId } });
  revalidatePath("/", "layout");
}

export async function setOrderStatus(orderId: string, formData: FormData) {
  await requireAdmin();
  const status = String(formData.get("status"));
  if (!(status in ORDER_STATUSES)) return;
  await db.order.update({ where: { id: orderId }, data: { status } });
  revalidatePath("/admin/orders");
}

export async function setUserRole(userId: string, formData: FormData) {
  const admin = await requireAdmin();
  if (userId === admin.id) return; // нельзя снять права с самого себя
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "USER";
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
}
