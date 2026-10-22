import { expect, test } from "@playwright/test";

import { storageState } from "./helpers";

test("giriş yapmamış kullanıcı giriş sayfasına gider", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test.describe("customer", () => {
  test.use({ storageState: storageState("customer") });

  test("panele giremez", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Bu sayfaya erişiminiz yok" })).toBeVisible();
  });
});

test.describe("editor", () => {
  test.use({ storageState: storageState("editor") });

  test("fiyat günceller ama arşivleyemez ve kullanıcıları göremez", async ({ page }) => {
    await page.goto("/admin");

    const row = page.getByTestId("product-mouse");
    await row.getByLabel("Kablosuz Mouse fiyatı").fill("949");
    await row.getByRole("button", { name: "Kaydet" }).click();
    await page.reload();
    await expect(page.getByLabel("Kablosuz Mouse fiyatı")).toHaveValue("949");

    await expect(page.getByRole("button", { name: "Arşivle" })).toHaveCount(0);

    const response = await page.request.post("/api/admin/products/mouse/archive");
    expect(response.status()).toBe(403);

    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Bu sayfaya erişiminiz yok" })).toBeVisible();
  });
});

test.describe("admin", () => {
  test.use({ storageState: storageState("admin") });

  test("ürün arşivler ve rol değiştirir", async ({ page }) => {
    await page.goto("/admin");
    await page.getByTestId("product-keyboard").getByRole("button", { name: "Arşivle" }).click();
    await expect(page.getByTestId("product-keyboard")).toHaveCount(0);

    await page.goto("/admin/users");
    const roleSelect = page.getByLabel("customer@example.com rolü");
    await roleSelect.selectOption("editor");
    await roleSelect.locator("..").getByRole("button", { name: "Kaydet" }).click();
    await page.reload();
    await expect(page.getByLabel("customer@example.com rolü")).toHaveValue("editor");
  });
});
