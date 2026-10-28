import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("list", { name: "Products" })).toBeVisible();
});

test("filters drive the product query", async ({ page }) => {
  const products = page.getByRole("list", { name: "Products" });
  await expect(products.getByRole("listitem")).toHaveCount(9);

  await page.getByLabel("Category").selectOption("shoes");
  await expect(products.getByRole("listitem")).toHaveCount(3);

  await page.getByLabel("Search products").fill("run");
  await expect(products.getByRole("listitem")).toHaveCount(1);
  await expect(products.getByRole("heading", { name: "Running Shoe" })).toBeVisible();

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByLabel("Search products")).toHaveValue("");
  await expect(products.getByRole("listitem")).toHaveCount(9);
});

test("adding to cart opens the drawer and updates count and total", async ({ page }) => {
  await page.getByRole("button", { name: "add Canvas Sneaker to cart" }).click();
  const cart = page.getByRole("complementary", { name: "Cart" });
  await expect(cart).toBeVisible();
  await expect(page.getByRole("button", { name: "Cart (1)" })).toBeVisible();

  await page.getByRole("button", { name: "add Wool Beanie to cart" }).click();
  await cart.getByRole("button", { name: "increase Wool Beanie" }).click();
  await expect(page.getByRole("button", { name: "Cart (3)" })).toBeVisible();
  await expect(cart.getByText("Total: €1,800")).toBeVisible();

  await cart.getByRole("button", { name: "decrease Wool Beanie" }).click();
  await cart.getByRole("button", { name: "decrease Wool Beanie" }).click();
  await expect(cart.getByText("Wool Beanie")).toHaveCount(0);
  await expect(cart.getByText("Total: €1,200")).toBeVisible();
});

test("stock limits add buttons and sold out products", async ({ page }) => {
  await expect(page.getByRole("button", { name: "add Hiking Boot to cart" })).toBeDisabled();

  const add = page.getByRole("button", { name: "add Silk Scarf to cart" });
  await add.click();
  await expect(add).toBeDisabled();
  await expect(
    page.getByRole("complementary", { name: "Cart" }).getByRole("button", { name: "increase Silk Scarf" }),
  ).toBeDisabled();
});

test("cart items persist after reload, drawer state does not", async ({ page }) => {
  await page.getByRole("button", { name: "add Linen Shirt to cart" }).click();
  await expect(page.getByRole("complementary", { name: "Cart" })).toBeVisible();

  const stored = await page.evaluate(() => localStorage.getItem("shop-cart"));
  expect(JSON.parse(stored!)).toEqual({
    state: { items: { 4: { id: 4, name: "Linen Shirt", price: 850, quantity: 1 } } },
    version: 1,
  });

  await page.reload();
  await expect(page.getByRole("button", { name: "Cart (1)" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Cart" })).toHaveCount(0);

  await page.getByRole("button", { name: "Cart (1)" }).click();
  await page.getByRole("button", { name: "Clear cart" }).click();
  await expect(page.getByText("Your cart is empty.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cart (0)" })).toBeVisible();
});

test("cart derives a stock warning from server data instead of syncing", async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem(
      "shop-cart",
      JSON.stringify({
        state: { items: { 5: { id: 5, name: "Denim Jacket", price: 1650, quantity: 4 } } },
        version: 1,
      }),
    ),
  );
  await page.reload();
  await page.getByRole("button", { name: "Cart (4)" }).click();
  const cart = page.getByRole("complementary", { name: "Cart" });
  await expect(cart.getByRole("alert")).toHaveText("Only 2 left in stock.");
  await expect(cart.getByLabel("Denim Jacket quantity")).toHaveText("4");

  await cart.getByRole("button", { name: "decrease Denim Jacket" }).click();
  await cart.getByRole("button", { name: "decrease Denim Jacket" }).click();
  await expect(cart.getByRole("alert")).toHaveCount(0);
});
