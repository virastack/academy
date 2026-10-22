import { expect, test } from "./fixtures";

test.use({ storageState: "playwright/.auth/viewer.json" });

test("izleyici iptal düğmesini görmez", async ({ page, ordersPage }) => {
  await ordersPage.goto();

  await expect(page.getByText("Ece İzleyici")).toBeVisible();
  await expect(ordersPage.rows).toHaveCount(6);
  await expect(ordersPage.table.getByRole("button", { name: "İptal et" })).toHaveCount(0);
});

test("izleyici API ile de iptal edemez", async ({ page }) => {
  const response = await page.request.post("/api/orders/SP-1001/cancel");

  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ error: "Bu işlem için yetkiniz yok." });
});
