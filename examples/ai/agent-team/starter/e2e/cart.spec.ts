import { expect, test } from "@playwright/test";

test("shows the cart total", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sepetim" })).toBeVisible();
  await expect(page.getByTestId("total")).toHaveText("₺1.000,00");
});
