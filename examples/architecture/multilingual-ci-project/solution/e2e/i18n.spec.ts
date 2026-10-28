import { expect, test } from "@playwright/test";

test("redirects / to the browser language", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();

  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await context.close();
});

test("renders the Turkish page", async ({ page }) => {
  await page.goto("/tr");

  await expect(page).toHaveTitle("Mağaza");
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  await expect(page.getByTestId("price")).toHaveText("Fiyat: ₺2.499,90");
  await expect(page.getByTestId("stock")).toHaveText("Son 3 ürün");
  await expect(page.getByTestId("updated")).toHaveText("Güncelleme tarihi: 16 Ekim 2026");
});

test("switches to English", async ({ page }) => {
  await page.goto("/tr");
  await page.getByRole("link", { name: "EN" }).click();

  // With cacheComponents, the previous page stays in the DOM, hidden by <Activity>.
  // getByRole skips hidden elements, so scope the checks to the visible <main>.
  const main = page.getByRole("main");

  await expect(page).toHaveURL(/\/en$/);
  await expect(main.getByRole("heading", { level: 1 })).toHaveText("Mechanical Keyboard");
  await expect(main.getByTestId("price")).toHaveText("Price: €2,499.90");
  await expect(main.getByTestId("stock")).toHaveText("Only 3 left");
  await expect(main.getByTestId("updated")).toHaveText("Updated on October 16, 2026");
});
