import { expect, test } from "@playwright/test";

test("lists, paginates and searches products", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Canvas Sneaker" })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(5);

  await page.getByRole("button", { name: "Sonraki" }).click();
  await expect(page.getByRole("button", { name: "Running Shoe" })).toBeVisible();

  await page.getByPlaceholder("Ürün ara").fill("shirt");
  await page.getByRole("button", { name: "Ara" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.getByText("Sayfa 1")).toBeVisible();
});

test("opens a product, loads more reviews and updates stock", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Linen Shirt" }).click();
  await expect(page.getByRole("heading", { name: "Linen Shirt" })).toBeVisible();

  await expect(page.getByText("Linen Shirt için yorum 3")).toBeVisible();
  await page.getByRole("button", { name: "Daha fazla" }).click();
  await expect(page.getByText("Linen Shirt için yorum 4")).toBeVisible();

  await page.getByLabel("Stok").fill("42");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByRole("status")).toHaveText("Stok güncellendi");
  await expect(page.getByRole("cell", { name: "42 adet" })).toBeVisible();
});

test("adds a review and shows it while pending", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Wool Beanie" }).click();
  await expect(page.getByText("Wool Beanie için yorum 1")).toBeVisible();

  await page.getByPlaceholder("Yorumunuz").fill("Çok sıcak tutuyor");
  await page.getByRole("button", { name: "Gönder" }).click();
  await expect(page.getByText("Çok sıcak tutuyor")).toHaveCSS("opacity", "0.5");
  await expect(page.getByText("Çok sıcak tutuyor")).toHaveCSS("opacity", "1");
});

test("toggles favorite optimistically", async ({ page }) => {
  await page.addInitScript(() => {
    // Favori isteği bu testte hiç başarısız olmasın
    Math.random = () => 0.9;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Leather Belt" }).click();
  const favorite = page.getByRole("button", { name: /Favori/ });
  await expect(favorite).toHaveText("☆ Favorilere ekle");
  await favorite.click();
  // Sunucu 800 ms sonra cevap verir; metin hemen değişmeli
  await expect(favorite).toHaveText("★ Favoride", { timeout: 300 });
});

test("rolls back favorite when the request fails", async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Denim Jacket" }).click();
  const favorite = page.getByRole("button", { name: /Favori/ });
  await favorite.click();
  await expect(favorite).toHaveText("★ Favoride");
  await expect(page.getByRole("status")).toHaveText("Favorite could not be saved");
  await expect(favorite).toHaveText("☆ Favorilere ekle");
});
