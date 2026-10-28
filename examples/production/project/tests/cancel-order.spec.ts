import { expect, signedOut, test } from "./fixtures";

// A test that mutates data does not use the shared session; it signs in on its own.
// That way the other tests never see an already cancelled order.
test.use({ storageState: signedOut });

test("an admin cancels an order being prepared", async ({ loginPage, ordersPage }) => {
  await loginPage.goto();
  await loginPage.login("admin@example.com");

  await ordersPage.cancel("SP-1001");

  await expect(ordersPage.message).toHaveText("SP-1001 iptal edildi.");
  await expect(ordersPage.row("SP-1001")).toContainText("Cancelled");
  await expect(ordersPage.row("SP-1001").getByRole("button")).toHaveCount(0);
});

test("an admin cannot cancel a shipped order", async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.login("admin@example.com");
  await expect(page).toHaveURL("/orders");

  const response = await page.request.post("/api/orders/SP-1002/cancel");

  expect(response.status()).toBe(409);
});
