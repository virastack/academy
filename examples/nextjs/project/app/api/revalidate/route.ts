import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (request.headers.get("x-revalidate-secret") !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = (await request.json()) as { slug?: string };
  revalidateTag(slug ? `product-${slug}` : "products", "max");

  return Response.json({ revalidated: true });
}
