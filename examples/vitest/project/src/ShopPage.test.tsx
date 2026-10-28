import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { server } from "./mocks/server";
import { ShopPage } from "./ShopPage";
import { renderWithProviders } from "./test-utils";

describe("ShopPage", () => {
  test("the user adds products to the cart and sees the total", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShopPage />);

    const keyboard = await screen.findByRole("article", {
      name: "Mechanical Keyboard",
    });
    await user.click(
      within(keyboard).getByRole("button", { name: "Add to cart" }),
    );
    await user.click(
      within(keyboard).getByRole("button", { name: "Add to cart" }),
    );

    const headphones = screen.getByRole("article", {
      name: "Wireless Headphones",
    });
    await user.click(
      within(headphones).getByRole("button", { name: "Add to cart" }),
    );

    expect(screen.getByRole("link", { name: "Cart (3)" })).toBeInTheDocument();

    const summary = screen.getByRole("region", { name: "Cart summary" });
    expect(within(summary).getByText("Mechanical Keyboard × 2")).toBeInTheDocument();
    expect(
      within(summary).getByText("Wireless Headphones × 1"),
    ).toBeInTheDocument();
    expect(within(summary).getByText("Total: €5,697.00")).toBeInTheDocument();
  });

  test("the user removes a product from the cart", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShopPage />);

    const keyboard = await screen.findByRole("article", {
      name: "Mechanical Keyboard",
    });
    await user.click(
      within(keyboard).getByRole("button", { name: "Add to cart" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Remove Mechanical Keyboard from cart",
      }),
    );

    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cart (0)" })).toBeInTheDocument();
  });

  test("an out-of-stock product cannot be added to the cart", async () => {
    renderWithProviders(<ShopPage />);

    const mouse = await screen.findByRole("article", { name: "Gaming Mouse" });

    expect(within(mouse).getByText("Out of stock")).toBeVisible();
    expect(
      within(mouse).getByRole("button", { name: "Add to cart" }),
    ).toBeDisabled();
  });

  test("the cart keeps working when the API fails", async () => {
    server.use(
      http.get(
        "https://api.shop.test/products",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    renderWithProviders(<ShopPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Products could not be loaded.",
    );
    expect(screen.getByRole("link", { name: "Cart (0)" })).toBeInTheDocument();
    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
  });
});
