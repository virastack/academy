import { expect, test } from "@playwright/test";

// The same test runs against starter/ and solution/: the restructure must not change behavior.
test("adds products to the cart from the list and the detail page", async ({ page }) => {
  await page.goto("/");
  const summary = page.getByTestId("cart-summary");
  await expect(summary).toHaveText("Sepet: 0 ürün, ₺0,00");

  await page.getByRole("button", { name: "Mekanik Klavye sepete ekle" }).click();
  await page.getByRole("button", { name: "Kablosuz Mouse sepete ekle" }).click();
  await expect(summary).toHaveText("Cart: 2 items, ₺3.398,00");

  await page.getByRole("link", { name: "Mekanik Klavye" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mekanik Klavye");
  await page.getByRole("button", { name: "Mekanik Klavye sepete ekle" }).click();
  await expect(summary).toHaveText("Sepet: 3 ürün, ₺5.897,00");
});

test("shows the not found page for an unknown product", async ({ page }) => {
  await page.goto("/products/unknown");
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});
