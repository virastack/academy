import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "./ProductCard";
import type { Product } from "./types";

const headphones: Product = {
  id: 1,
  name: "Wireless Headphones",
  price: 1299,
  inStock: true,
};

describe("ProductCard", () => {
  test("shows the product name and price", () => {
    render(<ProductCard product={headphones} onAddToCart={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Wireless Headphones" }),
    ).toBeInTheDocument();
    expect(screen.getByText("₺1.299,00")).toBeInTheDocument();
  });

  test("reports the product when Add to cart is clicked", async () => {
    const user = userEvent.setup();
    const onAddToCart = vi.fn();
    render(<ProductCard product={headphones} onAddToCart={onAddToCart} />);

    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    expect(onAddToCart).toHaveBeenCalledWith(headphones);
  });

  test("disables the button for an out-of-stock product", async () => {
    const user = userEvent.setup();
    const onAddToCart = vi.fn();
    render(
      <ProductCard
        product={{ ...headphones, inStock: false }}
        onAddToCart={onAddToCart}
      />,
    );

    expect(screen.getByText("Out of stock")).toBeVisible();
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    expect(onAddToCart).not.toHaveBeenCalled();
  });

  test("shows the old price for a discounted product", () => {
    render(
      <ProductCard
        product={{ ...headphones, oldPrice: 1499 }}
        onAddToCart={vi.fn()}
      />,
    );

    expect(screen.getByText("₺1.499,00")).toBeInTheDocument();
    expect(screen.getByText("₺1.299,00")).toBeInTheDocument();
  });
});
