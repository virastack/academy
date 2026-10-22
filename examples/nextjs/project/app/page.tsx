import Link from "next/link";

export default function HomePage() {
  return (
    <section>
      <h1>Yeni sezon</h1>
      <p>Ayakkabı, çanta ve aksesuarlar.</p>
      <Link href="/products">Ürünleri gör</Link>
    </section>
  );
}
