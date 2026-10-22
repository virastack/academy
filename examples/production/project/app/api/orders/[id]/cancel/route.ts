import { getSession } from "@/lib/session";

export async function POST(_request: Request, ctx: RouteContext<"/api/orders/[id]/cancel">) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const order = session.orders.find((item) => item.id === id);
  if (!order) {
    return Response.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }
  if (order.status !== "preparing") {
    return Response.json(
      { error: "Yalnızca hazırlanan siparişler iptal edilebilir." },
      { status: 409 },
    );
  }

  order.status = "cancelled";
  return Response.json({ order });
}
