import { Suspense } from "react";
import { logout } from "@/app/actions";
import { OrdersPanel } from "@/components/orders-panel";
import { getCurrentUser } from "@/lib/session";

const roleLabels = { admin: "Admin", viewer: "Viewer" } as const;

export default function OrdersPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <Suspense fallback={<p>Checking the session...</p>}>
        <OrdersSection />
      </Suspense>
    </main>
  );
}

async function OrdersSection() {
  const user = await getCurrentUser();

  return (
    <>
      <div className="flex items-center justify-between gap-4 text-sm">
        <p>
          {user.name} <span className="text-gray-700">({roleLabels[user.role]})</span>
        </p>
        <form action={logout}>
          <button type="submit" className="underline">Sign out</button>
        </form>
      </div>
      <OrdersPanel canCancel={user.role === "admin"} />
    </>
  );
}
