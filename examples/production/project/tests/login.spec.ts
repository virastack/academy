import { expect, signedOut, test } from "./fixtures";

test.use({ storageState: signedOut });

test("oturum yoksa siparişler sayfası girişe yönlendirir", async ({ page }) => {
  await page.goto("/orders");
  await expect(page).toHaveURL("/login");
});

test("hatalı parola hata mesajı gösterir ve e-postayı korur", async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.login("yonetici@example.com", "yanlis");

  await expect(loginPage.error).toHaveText("E-posta veya parola hatalı.");
  await expect(loginPage.email).toHaveValue("yonetici@example.com");
  await expect(page).toHaveURL("/login");
});

test("giriş yapan kullanıcı siparişleri görür ve çıkış yapabilir", async ({
  page,
  loginPage,
  ordersPage,
}) => {
  await loginPage.goto();
  await loginPage.login("yonetici@example.com");

  await expect(page).toHaveURL("/orders");
  await expect(page.getByText("Deniz Yönetici")).toBeVisible();

  await ordersPage.logout.click();
  await expect(page).toHaveURL("/login");

  await ordersPage.goto();
  await expect(page).toHaveURL("/login");
});
