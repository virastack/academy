import { product } from "@/data/product";

export default function ProductPage() {
  const price = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(product.price);
  const updated = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" }).format(
    product.updatedAt,
  );

  return (
    <main>
      <h1>{product.name}</h1>
      <p data-testid="price">Fiyat: {price}</p>
      <p data-testid="stock">{product.stock === 0 ? "Stokta yok" : `Son ${product.stock} ürün`}</p>
      <p data-testid="updated">Güncelleme tarihi: {updated}</p>
      <button type="button">Sepete ekle</button>
    </main>
  );
}
