"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
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

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

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

async function saveImage(file: File) {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new Error("Поддерживаются JPG, PNG, WEBP и SVG");
  if (file.size > 5 * 1024 * 1024) throw new Error("Файл больше 5 МБ");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = randomUUID() + ext;
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

const productSchema = z.object({
  name: z.string().trim().min(2, "Введите название"),
  description: z.string().trim().min(1, "Введите описание"),
  categoryId: z.string().min(1, "Выберите категорию"),
  sizes: z.string().trim(),
  stock: z.coerce.number().int().min(0, "Остаток не может быть отрицательным"),
  imageUrl: z.string().trim(),
});

export async function saveProduct(
  productId: string | null,
  _: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const price = parsePrice(String(formData.get("price") || ""));
  if (price === null || price <= 0) return { error: "Некорректная цена" };
  const oldPriceRaw = String(formData.get("oldPrice") || "").trim();
  const oldPrice = oldPriceRaw ? parsePrice(oldPriceRaw) : null;
  if (oldPriceRaw && oldPrice === null) return { error: "Некорректная старая цена" };

  let imageUrl = data.imageUrl;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await saveImage(file);
    } catch (e) {
      return { error: (e as Error).message };
    }
  }
  if (!imageUrl) return { error: "Добавьте изображение (файл или ссылку)" };

  const fields = {
    name: data.name,
    description: data.description,
    categoryId: data.categoryId,
    sizes: data.sizes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(","),
    stock: data.stock,
    price,
    oldPrice: oldPrice && oldPrice > price ? oldPrice : null,
    imageUrl,
    active: formData.get("active") === "on",
  };

  if (productId) {
    await db.product.update({ where: { id: productId }, data: fields });
  } else {
    await db.product.create({ data: { ...fields, slug: await uniqueSlug(data.name) } });
  }
  revalidatePath("/", "layout");
  redirect("/admin/products");
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
    await db.product.delete({ where: { id: productId } });
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
