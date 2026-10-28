import { expect, test } from "@playwright/test";

// The same test runs against starter/ and solution/: the restructure must not change behavior.
test("adds products to the cart from the list and the detail page", async ({ page }) => {
  await page.goto("/");
  const summary = page.getByTestId("cart-summary");
  await expect(summary).toHaveText("Cart: 0 items, €0.00");

  await page.getByRole("button", { name: "Add Mechanical Keyboard to cart" }).click();
  await page.getByRole("button", { name: "Add Wireless Mouse to cart" }).click();
  await expect(summary).toHaveText("Cart: 2 items, €3,398.00");

  await page.getByRole("link", { name: "Mechanical Keyboard" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mechanical Keyboard");
  await page.getByRole("button", { name: "Add Mechanical Keyboard to cart" }).click();
  await expect(summary).toHaveText("Cart: 3 items, €5,897.00");
});

test("shows the not found page for an unknown product", async ({ page }) => {
  await page.goto("/products/unknown");
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});
