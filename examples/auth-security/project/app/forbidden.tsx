import Link from "next/link";

export default function Forbidden() {
  return (
    <main>
      <h1>You do not have access to this page</h1>
      <Link href="/admin">Back to the panel</Link>
    </main>
  );
}
