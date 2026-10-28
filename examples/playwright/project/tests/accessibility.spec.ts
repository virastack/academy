import AxeBuilder from "@axe-core/playwright";
import { expect, signedOut, test } from "./fixtures";

test.describe("sign-in page", () => {
  test.use({ storageState: signedOut });

  test("no accessibility violations", async ({ page, loginPage }) => {
    await loginPage.goto();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("the form is usable with the keyboard", async ({ page, loginPage }) => {
    await loginPage.goto();

    await loginPage.email.focus();
    await page.keyboard.type("admin@example.com");
    await page.keyboard.press("Tab");
    await expect(loginPage.password).toBeFocused();

    await page.keyboard.type("password123");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/orders");
  });
});

test("no accessibility violations on the orders page", async ({ page, ordersPage }) => {
  await ordersPage.goto();
  await expect(ordersPage.rows).toHaveCount(6);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
