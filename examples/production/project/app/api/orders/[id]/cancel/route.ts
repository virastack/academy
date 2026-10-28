import { getSession } from "@/lib/session";

export async function POST(_request: Request, ctx: RouteContext<"/api/orders/[id]/cancel">) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "You are not authorized for this action." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const order = session.orders.find((item) => item.id === id);
  if (!order) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.status !== "preparing") {
    return Response.json(
      { error: "Only orders being prepared can be cancelled." },
      { status: 409 },
    );
  }

  order.status = "cancelled";
  return Response.json({ order });
}
