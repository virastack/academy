import AxeBuilder from "@axe-core/playwright";
import { expect, signedOut, test } from "./fixtures";

test.describe("giriş sayfası", () => {
  test.use({ storageState: signedOut });

  test("erişilebilirlik ihlali yok", async ({ page, loginPage }) => {
    await loginPage.goto();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("form klavyeyle kullanılabilir", async ({ page, loginPage }) => {
    await loginPage.goto();

    await loginPage.email.focus();
    await page.keyboard.type("yonetici@example.com");
    await page.keyboard.press("Tab");
    await expect(loginPage.password).toBeFocused();

    await page.keyboard.type("parola123");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/orders");
  });
});

test("siparişler sayfasında erişilebilirlik ihlali yok", async ({ page, ordersPage }) => {
  await ordersPage.goto();
  await expect(ordersPage.rows).toHaveCount(6);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
