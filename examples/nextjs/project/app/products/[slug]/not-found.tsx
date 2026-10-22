import Link from "next/link";

export default function ProductNotFound() {
  return (
    <>
      <h1>Ürün bulunamadı</h1>
      <Link href="/products">Tüm ürünler</Link>
    </>
  );
}
