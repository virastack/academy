import Link from "next/link";

export default function ProductNotFound() {
  return (
    <>
      <h1>Product not found</h1>
      <Link href="/products">All products</Link>
    </>
  );
}
