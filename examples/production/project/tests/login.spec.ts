import { expect, signedOut, test } from "./fixtures";

test.use({ storageState: signedOut });

test("without a session the orders page redirects to sign-in", async ({ page }) => {
  await page.goto("/orders");
  await expect(page).toHaveURL("/login");
});

test("a wrong password shows an error and keeps the email", async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.login("admin@example.com", "wrongpass");

  await expect(loginPage.error).toHaveText("Email or password is incorrect.");
  await expect(loginPage.email).toHaveValue("admin@example.com");
  await expect(page).toHaveURL("/login");
});

test("a signed-in user sees the orders and can sign out", async ({
  page,
  loginPage,
  ordersPage,
}) => {
  await loginPage.goto();
  await loginPage.login("admin@example.com");

  await expect(page).toHaveURL("/orders");
  await expect(page.getByText("Deniz Admin")).toBeVisible();

  await ordersPage.logout.click();
  await expect(page).toHaveURL("/login");

  await ordersPage.goto();
  await expect(page).toHaveURL("/login");
});
