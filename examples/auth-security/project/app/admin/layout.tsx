import Link from "next/link";

import { signOut } from "./actions";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav>
        <Link href="/admin">Ürünler</Link>
        <Link href="/admin/users">Kullanıcılar</Link>
        <form action={signOut}>
          <button type="submit">Çıkış yap</button>
        </form>
      </nav>
      {children}
    </>
  );
}
