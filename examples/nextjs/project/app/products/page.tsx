import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";

import { ProductList } from "@/components/product-list";

export const metadata: Metadata = { title: "Ürünler" };

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <>
      <h1>Ürünler</h1>
      <Form action="/products">
        <input name="q" aria-label="Ürün ara" placeholder="Ara..." />
        <button>Ara</button>
      </Form>
      <Suspense fallback={<p>Ürünler yükleniyor...</p>}>
        <ProductList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
