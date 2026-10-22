import { Suspense } from "react";
import { logout } from "@/app/actions";
import { OrdersPanel } from "@/components/orders-panel";
import { orderSummaryFlag } from "@/lib/flags";
import { getCurrentUser } from "@/lib/session";

const roleLabels = { admin: "Yönetici", viewer: "İzleyici" } as const;

export default function OrdersPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Siparişler</h1>
      <Suspense fallback={<p>Oturum kontrol ediliyor...</p>}>
        <OrdersSection />
      </Suspense>
    </main>
  );
}

async function OrdersSection() {
  const user = await getCurrentUser();
  const showSummary = await orderSummaryFlag();

  return (
    <>
      <div className="flex items-center justify-between gap-4 text-sm">
        <p>
          {user.name} <span className="text-gray-700">({roleLabels[user.role]})</span>
        </p>
        <form action={logout}>
          <button type="submit" className="underline">
            Çıkış yap
          </button>
        </form>
      </div>
      <OrdersPanel canCancel={user.role === "admin"} showSummary={showSummary} />
    </>
  );
}
