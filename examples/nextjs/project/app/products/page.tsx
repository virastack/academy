import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";

import { ProductList } from "@/components/product-list";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <>
      <h1>Products</h1>
      <Form action="/products">
        <input name="q" aria-label="Search products" placeholder="Search..." />
        <button>Search</button>
      </Form>
      <Suspense fallback={<p>Loading products...</p>}>
        <ProductList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
