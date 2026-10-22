import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AddToCartForm } from "@/components/add-to-cart-form";
import { getProduct, getProducts, getStock } from "@/lib/products";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};

  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` },
  };
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <article>
      <Suspense fallback={<p>Ürün yükleniyor...</p>}>
        <ProductDetails params={params} />
      </Suspense>
    </article>
  );
}

async function ProductDetails({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    offers: { "@type": "Offer", price: product.price, priceCurrency: "TRY" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>{product.price} TL</p>
      <Suspense fallback={<p>Stok kontrol ediliyor...</p>}>
        <Stock slug={product.slug} />
      </Suspense>
    </>
  );
}

async function Stock({ slug }: { slug: string }) {
  const count = await getStock(slug);
  if (count === 0) return <p>Tükendi</p>;

  return (
    <>
      <p>Stokta {count} adet</p>
      <AddToCartForm slug={slug} />
    </>
  );
}
