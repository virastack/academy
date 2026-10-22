import { ImageResponse } from "next/og";

import { getProduct } from "@/lib/products";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 96, background: "white" }}>
      {product?.name ?? "Mağaza"}
    </div>,
    size,
  );
}
