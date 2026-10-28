import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";

test("the product page opens instantly and stock arrives later", async ({ page }) => {
  await page.goto("/products");

  await instant(page, async () => {
    await page.getByRole("link", { name: "Canvas Shoe" }).click();
    await page.waitForURL((url) => url.pathname === "/products/canvas-sneaker");

    await expect(page.getByRole("heading", { name: "Canvas Shoe" })).toBeVisible();
    await expect(page.getByText("Checking stock...")).toBeVisible();
  });

  await expect(page.getByText("12 left in stock")).toBeVisible();
});

test("adding to cart updates the cart count", async ({ page }) => {
  await page.goto("/products/canvas-sneaker");
  await page.getByRole("button", { name: "Add to cart" }).click();

  await expect(page.getByRole("status")).toHaveText("Canvas Shoe added to cart.");
  await expect(page.getByRole("link", { name: "Cart (1)" })).toBeVisible();
});
