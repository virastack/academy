import { expect, test } from "@playwright/test";

test("lists, paginates and searches products", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Canvas Sneaker" })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(5);

  await page.getByRole("button", { name: "Sonraki" }).click();
  await expect(page.getByRole("button", { name: "Running Shoe" })).toBeVisible();

  await page.getByPlaceholder("Search products").fill("shirt");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.getByText("Sayfa 1")).toBeVisible();
});

test("opens a product, loads more reviews and updates stock", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Linen Shirt" }).click();
  await expect(page.getByRole("heading", { name: "Linen Shirt" })).toBeVisible();

  await expect(page.getByText("Review 3 for Linen Shirt")).toBeVisible();
  await page.getByRole("button", { name: "Load more" }).click();
  await expect(page.getByText("Review 4 for Linen Shirt")).toBeVisible();

  await page.getByLabel("Stock").fill("42");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toHaveText("Stock updated");
  await expect(page.getByRole("cell", { name: "42 in stock" })).toBeVisible();
});

test("adds a review and shows it while pending", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Wool Beanie" }).click();
  await expect(page.getByText("Review 1 for Wool Beanie")).toBeVisible();

  await page.getByPlaceholder("Your review").fill("Keeps me very warm");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Keeps me very warm")).toHaveCSS("opacity", "0.5");
  await expect(page.getByText("Keeps me very warm")).toHaveCSS("opacity", "1");
});

test("toggles favorite optimistically", async ({ page }) => {
  await page.addInitScript(() => {
    // Favori isteği bu testte hiç başarısız olmasın
    Math.random = () => 0.9;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Leather Belt" }).click();
  const favorite = page.getByRole("button", { name: /favorit/i });
  await expect(favorite).toHaveText("☆ Add to favorites");
  await favorite.click();
  // Sunucu 800 ms sonra cevap verir; metin hemen değişmeli
  await expect(favorite).toHaveText("★ Favorited", { timeout: 300 });
});

test("rolls back favorite when the request fails", async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Denim Jacket" }).click();
  const favorite = page.getByRole("button", { name: /favorit/i });
  await favorite.click();
  await expect(favorite).toHaveText("★ Favorited");
  await expect(page.getByRole("status")).toHaveText("Favorite could not be saved");
  await expect(favorite).toHaveText("☆ Add to favorites");
});
