import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** Все персональные данные пользователя одним файлом — по праву на доступ к своим данным (152-ФЗ, ст. 14). */
export async function GET() {
  const current = await getCurrentUser();
  if (!current) return new Response("Войдите в учётную запись", { status: 401 });
  const user = await db.user.findUniqueOrThrow({ where: { id: current.id } });
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { items: { select: { name: true, size: true, price: true, quantity: true } } },
  });
  const data = {
    exportedAt: new Date().toISOString(),
    account: {
      name: user.name,
      email: user.email,
      registeredAt: user.createdAt,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      personalDataConsentAt: user.personalDataConsentAt,
      adultConfirmedAt: user.adultConfirmedAt,
    },
    orders: orders.map((o) => ({
      number: o.id.slice(-8).toUpperCase(),
      createdAt: o.createdAt,
      status: o.status,
      fullName: o.fullName,
      phone: o.phone,
      address: o.address,
      totalRub: o.total / 100,
      items: o.items.map((i) => ({ ...i, price: i.price / 100 })),
    })),
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
