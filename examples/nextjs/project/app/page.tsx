import Link from "next/link";

export default function HomePage() {
  return (
    <section>
      <h1>Yeni sezon</h1>
      <p>Shoes, bags and accessories.</p>
      <Link href="/products">See the products</Link>
    </section>
  );
}
