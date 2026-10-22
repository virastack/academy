import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { CartButton } from "./CartDrawer.tsx";
import { clearProduct } from "./cache.ts";
import { CartProvider } from "./cart.tsx";
import { ProductPage } from "./ProductPage.tsx";

const PRODUCT_ID = "1";

export default function App() {
  return (
    <CartProvider>
      <header>
        <CartButton />
      </header>
      <ErrorBoundary
        onReset={() => clearProduct(PRODUCT_ID)}
        fallbackRender={({ resetErrorBoundary }) => (
          <div role="alert">
            <p>Ürün yüklenemedi.</p>
            <button onClick={resetErrorBoundary}>Tekrar dene</button>
          </div>
        )}
      >
        <Suspense fallback={<p>Ürün yükleniyor...</p>}>
          <ProductPage id={PRODUCT_ID} />
        </Suspense>
      </ErrorBoundary>
    </CartProvider>
  );
}
