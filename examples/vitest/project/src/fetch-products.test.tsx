import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { fetchProducts } from "./fetch-products";
import { server } from "./mocks/server";
import { ProductList } from "./ProductList";

test("API'den gelen ürünleri gösterir", async () => {
  render(<ProductList loadProducts={fetchProducts} onAddToCart={vi.fn()} />);

  expect(await screen.findAllByRole("article")).toHaveLength(3);
});

test("API boş liste dönerse boş durum gösterir", async () => {
  server.use(
    http.get("https://api.magaza.test/products", () => HttpResponse.json([])),
  );

  render(<ProductList loadProducts={fetchProducts} onAddToCart={vi.fn()} />);

  expect(await screen.findByText("Ürün bulunamadı.")).toBeInTheDocument();
});
