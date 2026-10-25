import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Какая версия сайта опубликована и видит ли она базу. Секретов не раскрывает. */
export async function GET() {
  const version = {
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  };
  try {
    const [products, sizes, images] = await Promise.all([
      db.product.count(),
      db.productSize.count(),
      db.productImage.count(),
    ]);
    return Response.json({ ok: true, ...version, database: { products, sizes, images } });
  } catch (e) {
    return Response.json(
      { ok: false, ...version, database: { error: (e as Error).message.split("\n").slice(-3).join(" ").trim() } },
      { status: 500 },
    );
  }
}
