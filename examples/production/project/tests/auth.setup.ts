import { expect, test as setup } from "./fixtures";

const accounts = [
  { email: "admin@example.com", file: "playwright/.auth/admin.json" },
  { email: "viewer@example.com", file: "playwright/.auth/viewer.json" },
];

for (const { email, file } of accounts) {
  setup(`${email} ile oturum aç`, async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login(email);
    await expect(page).toHaveURL("/orders");
    await page.context().storageState({ path: file });
  });
}
