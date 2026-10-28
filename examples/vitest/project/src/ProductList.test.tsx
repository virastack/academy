import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductList } from "./ProductList";
import type { Product } from "./types";

const products: Product[] = [
  { id: 1, name: "Wireless Headphones", price: 1299, inStock: true },
  { id: 2, name: "Mechanical Keyboard", price: 2199, inStock: true },
  { id: 3, name: "Gaming Mouse", price: 899, inStock: false },
];

function renderList(
  loadProducts: () => Promise<Product[]> = () => Promise.resolve(products),
  onAddToCart = vi.fn(),
) {
  render(<ProductList loadProducts={loadProducts} onAddToCart={onAddToCart} />);

  return { onAddToCart };
}

test("shows a status message while loading, then the products", async () => {
  renderList();

  expect(screen.getByText("Loading products...")).toBeInTheDocument();
  expect(await screen.findAllByRole("article")).toHaveLength(3);
  expect(screen.queryByText("Loading products...")).not.toBeInTheDocument();
});

test("shows an error message when loading fails", async () => {
  renderList(() => Promise.reject(new Error("network error")));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Products could not be loaded.",
  );
});

test("filters the products by search", async () => {
  const user = userEvent.setup();
  renderList();

  await user.type(await screen.findByLabelText("Search products"), "keyboard");

  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(
    screen.getByRole("heading", { name: "Mechanical Keyboard" }),
  ).toBeInTheDocument();
});

test("shows the empty state when nothing matches", async () => {
  const user = userEvent.setup();
  renderList();

  await user.type(await screen.findByLabelText("Search products"), "monitor");

  expect(screen.getByText("No products found.")).toBeInTheDocument();
});

test("adds the selected product to the cart", async () => {
  const user = userEvent.setup();
  const { onAddToCart } = renderList();

  const card = await screen.findByRole("article", { name: "Mechanical Keyboard" });
  await user.click(within(card).getByRole("button", { name: "Add to cart" }));

  expect(onAddToCart).toHaveBeenCalledWith(products[1]);
});

test("the button of an out-of-stock product is disabled", async () => {
  renderList();

  const card = await screen.findByRole("article", { name: "Gaming Mouse" });

  expect(
    within(card).getByRole("button", { name: "Add to cart" }),
  ).toBeDisabled();
});

test("the status message disappears once loading finishes", async () => {
  renderList();

  await waitFor(() =>
    expect(screen.queryByRole("status")).not.toBeInTheDocument(),
  );
});
