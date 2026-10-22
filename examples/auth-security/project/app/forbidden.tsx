import Link from "next/link";

export default function Forbidden() {
  return (
    <main>
      <h1>Bu sayfaya erişiminiz yok</h1>
      <Link href="/admin">Panele dön</Link>
    </main>
  );
}
