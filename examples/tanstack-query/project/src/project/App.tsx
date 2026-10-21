import { Suspense, useState, useTransition } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { ProductTable } from "./ProductTable";
import { ProductDetail } from "./ProductDetail";
import { useToast } from "./toast";

export function App() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isSwitching, startTransition] = useTransition();
  const toast = useToast();

  return (
    <main style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
      <ProductTable
        selectedId={selectedId}
        onSelect={(id) => startTransition(() => setSelectedId(id))}
      />

      <div style={{ opacity: isSwitching ? 0.5 : 1 }}>
        {selectedId === null ? (
          <p>Bir ürün seçin.</p>
        ) : (
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary
                onReset={reset}
                resetKeys={[selectedId]}
                fallbackRender={({ resetErrorBoundary }) => (
                  <div>
                    <p>Ürün yüklenemedi.</p>
                    <button onClick={() => resetErrorBoundary()}>Tekrar dene</button>
                  </div>
                )}
              >
                <Suspense fallback={<p>Ürün yükleniyor...</p>}>
                  <ProductDetail id={selectedId} />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        )}
      </div>

      {toast && <div role="status">{toast}</div>}
    </main>
  );
}
