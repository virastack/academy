import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("SALE10 takes 10 percent off the total", async ({ page }) => {
  await page.getByLabel("Kupon kodu").fill(" sale10 ");
  await page.getByRole("button", { name: "Uygula" }).click();

  await expect(page.getByText("İndirim (SALE10)")).toBeVisible();
  await expect(page.getByTestId("total")).toHaveText("₺900,00");
});

test("an invalid code shows an error and keeps the total", async ({ page }) => {
  await page.getByLabel("Kupon kodu").fill("FREE");
  await page.getByRole("button", { name: "Uygula" }).click();

  await expect(page.getByRole("alert")).toHaveText("Kupon geçersiz");
  await expect(page.getByTestId("total")).toHaveText("₺1.000,00");
});

test("removing the coupon restores the total", async ({ page }) => {
  await page.getByLabel("Kupon kodu").fill("SALE10");
  await page.getByRole("button", { name: "Uygula" }).click();
  await page.getByRole("button", { name: "Kaldır" }).click();

  await expect(page.getByText("İndirim (SALE10)")).toBeHidden();
  await expect(page.getByTestId("total")).toHaveText("₺1.000,00");
});
