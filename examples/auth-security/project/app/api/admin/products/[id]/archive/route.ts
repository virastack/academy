import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { isCrossSiteRequest } from "@/lib/csrf";
import { hasPermission, isRole } from "@/lib/permissions";
import { archiveProduct } from "@/lib/products";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (isCrossSiteRequest(request)) {
    return new Response(null, { status: 403 });
  }

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return new Response(null, { status: 401 });
  }

  const role = isRole(session.user.role) ? session.user.role : "customer";

  if (!hasPermission(role, "product:archive")) {
    return new Response(null, { status: 403 });
  }

  const { id } = await params;

  if (!archiveProduct(id)) {
    return new Response(null, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
