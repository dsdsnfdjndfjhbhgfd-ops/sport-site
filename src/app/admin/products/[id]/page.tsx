import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { deleteProduct, saveProduct } from "@/app/actions/admin";
import { ProductForm } from "../ProductForm";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id } }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <>
      <div className="section-head">
        <h1 style={{ margin: 0 }}>{product.name}</h1>
        <Link href={`/product/${product.slug}`}>Открыть на сайте</Link>
      </div>
      <ProductForm action={saveProduct.bind(null, product.id)} categories={categories} product={product} />
      <form action={deleteProduct.bind(null, product.id)}>
        <button className="link-btn" style={{ color: "#a3000b" }}>
          Удалить товар
        </button>
        <span className="muted" style={{ fontSize: 13 }}> (если товар уже заказывали, он будет скрыт)</span>
      </form>
    </>
  );
}
