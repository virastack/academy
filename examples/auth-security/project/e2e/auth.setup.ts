import { expect, test as setup } from "@playwright/test";

import { PASSWORD, ROLES, storageState } from "./helpers";

// Better Auth production'da girişi 10 saniyede 3 istekle sınırlar.
// Her rol bir kez giriş yapar, testler kaydedilen oturumu kullanır.
for (const role of ROLES) {
  setup(`${role} girişi`, async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("E-posta").fill(`${role}@example.com`);
    await page.getByLabel("Parola").fill(PASSWORD);
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.context().storageState({ path: storageState(role) });
  });
}
