import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "./ProductCard";
import type { Product } from "./types";

const headphones: Product = {
  id: 1,
  name: "Kablosuz Kulaklık",
  price: 1299,
  inStock: true,
};

describe("ProductCard", () => {
  test("ürün adını ve fiyatını gösterir", () => {
    render(<ProductCard product={headphones} onAddToCart={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Kablosuz Kulaklık" }),
    ).toBeInTheDocument();
    expect(screen.getByText("₺1.299,00")).toBeInTheDocument();
  });

  test("Sepete ekle butonuna tıklayınca ürünü bildirir", async () => {
    const user = userEvent.setup();
    const onAddToCart = vi.fn();
    render(<ProductCard product={headphones} onAddToCart={onAddToCart} />);

    await user.click(screen.getByRole("button", { name: "Sepete ekle" }));

    expect(onAddToCart).toHaveBeenCalledWith(headphones);
  });

  test("stokta olmayan ürün için butonu devre dışı bırakır", async () => {
    const user = userEvent.setup();
    const onAddToCart = vi.fn();
    render(
      <ProductCard
        product={{ ...headphones, inStock: false }}
        onAddToCart={onAddToCart}
      />,
    );

    expect(screen.getByText("Stokta yok")).toBeVisible();
    expect(screen.getByRole("button", { name: "Sepete ekle" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Sepete ekle" }));

    expect(onAddToCart).not.toHaveBeenCalled();
  });

  test("indirimli üründe eski fiyatı gösterir", () => {
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
