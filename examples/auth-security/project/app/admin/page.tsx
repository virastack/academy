import { requirePermission } from "@/lib/dal";
import { hasPermission } from "@/lib/permissions";
import { listProducts } from "@/lib/products";

import { updatePriceAction } from "./actions";
import { ArchiveButton } from "./archive-button";

export default async function ProductsPage() {
  const user = await requirePermission("product:read");
  const products = listProducts();
  const canArchive = hasPermission(user.role, "product:archive");

  return (
    <main>
      <h1>Ürünler</h1>
      <p>
        {user.email} ({user.role})
      </p>
      <table>
        <thead>
          <tr>
            <th>Ürün</th>
            <th>Açıklama</th>
            <th>Fiyat</th>
            {canArchive && <th>Arşiv</th>}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} data-testid={`product-${product.id}`}>
              <td>{product.name}</td>
              <td dangerouslySetInnerHTML={product.description} />
              <td>
                <form action={updatePriceAction}>
                  <input type="hidden" name="id" value={product.id} />
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={product.price}
                    aria-label={`${product.name} fiyatı`}
                  />
                  <button type="submit">Kaydet</button>
                </form>
              </td>
              {canArchive && (
                <td>
                  <ArchiveButton productId={product.id} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
