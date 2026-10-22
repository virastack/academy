import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";

test("ürün sayfası anında açılır, stok sonra gelir", async ({ page }) => {
  await page.goto("/products");

  await instant(page, async () => {
    await page.getByRole("link", { name: "Kanvas Ayakkabı" }).click();
    await page.waitForURL((url) => url.pathname === "/products/canvas-sneaker");

    await expect(page.getByRole("heading", { name: "Kanvas Ayakkabı" })).toBeVisible();
    await expect(page.getByText("Stok kontrol ediliyor...")).toBeVisible();
  });

  await expect(page.getByText("Stokta 12 adet")).toBeVisible();
});

test("sepete ekleme sepet sayısını günceller", async ({ page }) => {
  await page.goto("/products/canvas-sneaker");
  await page.getByRole("button", { name: "Sepete ekle" }).click();

  await expect(page.getByRole("status")).toHaveText("Kanvas Ayakkabı sepete eklendi.");
  await expect(page.getByRole("link", { name: "Sepet (1)" })).toBeVisible();
});
