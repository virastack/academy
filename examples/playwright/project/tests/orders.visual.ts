import { expect, test } from "./fixtures";

test("sipariş tablosu görünümü", async ({ ordersPage }) => {
  await ordersPage.goto();
  await expect(ordersPage.rows).toHaveCount(6);

  await expect(ordersPage.table).toHaveScreenshot("orders-table.png");
});
