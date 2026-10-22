import { Button } from "@repo/ui/button";
import { Price } from "@repo/ui/price";
import { useState } from "react";

const initialProducts = [
  { slug: "mechanical-keyboard", name: "Mekanik Klavye", price: 2499 },
  { slug: "wireless-mouse", name: "Kablosuz Mouse", price: 899 },
];

export function App() {
  const [products, setProducts] = useState(initialProducts);

  function discount(slug: string) {
    setProducts((current) =>
      current.map((product) => (product.slug === slug ? { ...product, price: product.price * 0.9 } : product)),
    );
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: "40rem", margin: "2rem auto" }}>
      <h1>Yönetim</h1>
      <table>
        <tbody>
          {products.map((product) => (
            <tr key={product.slug}>
              <td>{product.name}</td>
              <td>
                <Price value={product.price} />
              </td>
              <td>
                <Button variant="secondary" onClick={() => discount(product.slug)} aria-label={`${product.name} indirim yap`}>
                  %10 indirim
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
