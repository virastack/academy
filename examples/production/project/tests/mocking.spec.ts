import { expect, test } from "./fixtures";

test("sunucu hatasında hata durumu ve tekrar deneme", async ({ page, ordersPage }) => {
  await page.route("**/api/orders?*", (route) =>
    route.fulfill({ status: 500, json: { error: "Sunucu hatası" } }),
  );

  await ordersPage.goto();
  await expect(ordersPage.loadError).toBeVisible();

  await page.unroute("**/api/orders?*");
  await ordersPage.loadError.getByRole("button", { name: "Tekrar dene" }).click();

  await expect(ordersPage.rows).toHaveCount(6);
  await expect(ordersPage.loadError).toBeHidden();
});

test("boş liste mesajı", async ({ page, ordersPage }) => {
  await page.route("**/api/orders?*", (route) => route.fulfill({ json: { orders: [] } }));

  await ordersPage.goto();
  await expect(ordersPage.empty).toBeVisible();
});

test("yanıtı değiştirerek uzun müşteri adını dener", async ({ page, ordersPage }) => {
  await page.route("**/api/orders?*", async (route) => {
    const response = await route.fetch();
    const { orders } = await response.json();
    orders[0].customer = "Ayşe Nur Yılmaz Karadeniz Uzunsoyadlı";
    await route.fulfill({ response, json: { orders } });
  });

  await ordersPage.goto();
  await expect(ordersPage.row("SP-1001")).toContainText("Ayşe Nur Yılmaz Karadeniz Uzunsoyadlı");
});

test("yükleniyor durumu görünür", async ({ page, ordersPage }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/orders?*", async (route) => {
    await gate;
    await route.continue();
  });

  await ordersPage.goto();
  await expect(ordersPage.loading).toBeVisible();

  release();
  await expect(ordersPage.rows).toHaveCount(6);
});
