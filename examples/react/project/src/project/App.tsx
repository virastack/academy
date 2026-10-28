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
            <p>Product could not be loaded.</p>
            <button onClick={resetErrorBoundary}>Try again</button>
          </div>
        )}
      >
        <Suspense fallback={<p>Loading product...</p>}>
          <ProductPage id={PRODUCT_ID} />
        </Suspense>
      </ErrorBoundary>
    </CartProvider>
  );
}
