import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { fetchProducts } from "./fetch-products";
import { server } from "./mocks/server";
import { ProductList } from "./ProductList";

test("shows the products from the API", async () => {
  render(<ProductList loadProducts={fetchProducts} onAddToCart={vi.fn()} />);

  expect(await screen.findAllByRole("article")).toHaveLength(3);
});

test("shows the empty state when the API returns an empty list", async () => {
  server.use(
    http.get("https://api.shop.test/products", () => HttpResponse.json([])),
  );

  render(<ProductList loadProducts={fetchProducts} onAddToCart={vi.fn()} />);

  expect(await screen.findByText("No products found.")).toBeInTheDocument();
});
