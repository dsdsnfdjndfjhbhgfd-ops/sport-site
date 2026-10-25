import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await db.image.findUnique({ where: { id } });
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      // фото по адресу не меняется: новое фото получает новый id
      "Cache-Control": "public, max-age=31536000, immutable",
      // SVG может содержать скрипты — не даём им выполняться
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
