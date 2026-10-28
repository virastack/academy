import type { NextRequest } from "next/server";
import { isStatusFilter } from "@/lib/orders";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status") ?? "all";
  if (!isStatusFilter(status)) {
    return Response.json({ error: "Invalid status." }, { status: 400 });
  }

  // Simulates a slow network so the loading state is visible on screen.
  await new Promise((resolve) => setTimeout(resolve, 300));

  const orders =
    status === "all" ? session.orders : session.orders.filter((order) => order.status === status);
  return Response.json({ orders });
}
