import Link from "next/link";
import { db } from "@/lib/db";
import { saveProduct } from "@/app/actions/admin";
import { ProductForm } from "../ProductForm";
import { listSeasons } from "@/lib/seasons";

export default async function NewProduct() {
  const [categories, seasons] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    listSeasons(),
  ]);
  return (
    <>
      <h1>Новый товар</h1>
      {categories.length ? (
        <ProductForm action={saveProduct.bind(null, null)} categories={categories} seasons={seasons} />
      ) : (
        <div className="notice">
          Сначала <Link href="/admin/categories" style={{ textDecoration: "underline" }}>создайте категорию</Link>.
        </div>
      )}
    </>
  );
}
