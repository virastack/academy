import { CartButton } from "./CartButton";
import { CartDrawer } from "./CartDrawer";
import { Filters } from "./Filters";
import { ProductGrid } from "./ProductGrid";

export function App() {
  return (
    <div style={{ display: "flex", gap: 24, padding: 24, fontFamily: "sans-serif" }}>
      <main style={{ flex: 1 }}>
        <header style={{ display: "flex", justifyContent: "space-between" }}>
          <h1>Mağaza</h1>
          <CartButton />
        </header>
        <Filters />
        <ProductGrid />
      </main>
      <CartDrawer />
    </div>
  );
}
