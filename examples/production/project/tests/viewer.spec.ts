import { expect, test } from "./fixtures";

test.use({ storageState: "playwright/.auth/viewer.json" });

test("a viewer does not see the cancel button", async ({ page, ordersPage }) => {
  await ordersPage.goto();

  await expect(page.getByText("Evan Viewer")).toBeVisible();
  await expect(ordersPage.rows).toHaveCount(6);
  await expect(ordersPage.table.getByRole("button", { name: "Cancel" })).toHaveCount(0);
});

test("a viewer cannot cancel through the API either", async ({ page }) => {
  const response = await page.request.post("/api/orders/SP-1001/cancel");

  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ error: "You are not authorized for this action." });
});
