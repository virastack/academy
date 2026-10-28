import { Suspense } from "react";
import { ApplicationForm } from "@/components/application-form";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Seller application</h1>
      {/* useFieldArray satırlara crypto.randomUUID() ile id verir; form istek anında render edilmeli */}
      <Suspense fallback={<p>Loading form...</p>}>
        <ApplicationForm />
      </Suspense>
    </main>
  );
}
