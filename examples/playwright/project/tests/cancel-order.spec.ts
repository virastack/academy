import { expect, signedOut, test } from "./fixtures";

// Veriyi değiştiren test paylaşılan oturumu kullanmaz; kendi oturumunu açar.
// Böylece diğer testler iptal edilmiş bir sipariş görmez.
test.use({ storageState: signedOut });

test("an admin cancels an order being prepared", async ({ loginPage, ordersPage }) => {
  await loginPage.goto();
  await loginPage.login("admin@example.com");

  await ordersPage.cancel("SP-1001");

  await expect(ordersPage.message).toHaveText("SP-1001 cancelled.");
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
