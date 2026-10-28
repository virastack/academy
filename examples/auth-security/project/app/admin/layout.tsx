import Link from "next/link";

import { signOut } from "./actions";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav>
        <Link href="/admin">Products</Link>
        <Link href="/admin/users">Users</Link>
        <form action={signOut}>
          <button type="submit">Sign out</button>
        </form>
      </nav>
      {children}
    </>
  );
}
