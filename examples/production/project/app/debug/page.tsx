import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getEnv } from "@/lib/env";

// Hata izleme hattını uçtan uca denemek için bilerek hata fırlatan sayfa.
// Production'da 404 döner.
export default function DebugPage() {
  return (
    <Suspense fallback={<p>Yükleniyor...</p>}>
      <FailingSection />
    </Suspense>
  );
}

async function FailingSection(): Promise<never> {
  await connection();
  if (getEnv().APP_ENV === "production") notFound();
  throw new Error("Test hatası: hata izleme hattını denemek için bilerek fırlatıldı.");
}
