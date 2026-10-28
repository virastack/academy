import { expect, test } from "@playwright/test";

import { storageState } from "./helpers";

test("a signed-out user is sent to the sign-in page", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test.describe("customer", () => {
  test.use({ storageState: storageState("customer") });

  test("panele giremez", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "You do not have access to this page" })).toBeVisible();
  });
});

test.describe("editor", () => {
  test.use({ storageState: storageState("editor") });

  test("updates a price but cannot archive or see users", async ({ page }) => {
    await page.goto("/admin");

    const row = page.getByTestId("product-mouse");
    await row.getByLabel("Wireless Mouse price").fill("949");
    await row.getByRole("button", { name: "Save" }).click();
    await page.reload();
    await expect(page.getByLabel("Wireless Mouse price")).toHaveValue("949");

    await expect(page.getByRole("button", { name: "Archive" })).toHaveCount(0);

    const response = await page.request.post("/api/admin/products/mouse/archive");
    expect(response.status()).toBe(403);

    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "You do not have access to this page" })).toBeVisible();
  });
});

test.describe("admin", () => {
  test.use({ storageState: storageState("admin") });

  test("archives a product and changes a role", async ({ page }) => {
    await page.goto("/admin");
    await page.getByTestId("product-keyboard").getByRole("button", { name: "Archive" }).click();
    await expect(page.getByTestId("product-keyboard")).toHaveCount(0);

    await page.goto("/admin/users");
    const roleSelect = page.getByLabel("customer@example.com role");
    await roleSelect.selectOption("editor");
    await roleSelect.locator("..").getByRole("button", { name: "Save" }).click();
    await page.reload();
    await expect(page.getByLabel("customer@example.com role")).toHaveValue("editor");
  });
});
