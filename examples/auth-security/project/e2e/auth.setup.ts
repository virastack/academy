import { expect, test as setup } from "@playwright/test";

import { PASSWORD, ROLES, storageState } from "./helpers";

// In production Better Auth limits sign-in to 3 requests per 10 seconds.
// Each role signs in once and the tests reuse the stored session.
for (const role of ROLES) {
  setup(`${role} sign-in`, async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("E-posta").fill(`${role}@example.com`);
    await page.getByLabel("Parola").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.context().storageState({ path: storageState(role) });
  });
}
