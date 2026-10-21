import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("list", { name: "Ürünler" })).toBeVisible();
});

test("filters drive the product query", async ({ page }) => {
  const products = page.getByRole("list", { name: "Ürünler" });
  await expect(products.getByRole("listitem")).toHaveCount(9);

  await page.getByLabel("Kategori").selectOption("shoes");
  await expect(products.getByRole("listitem")).toHaveCount(3);

  await page.getByLabel("Ürün ara").fill("run");
  await expect(products.getByRole("listitem")).toHaveCount(1);
  await expect(products.getByRole("heading", { name: "Running Shoe" })).toBeVisible();

  await page.getByRole("button", { name: "Filtreleri temizle" }).click();
  await expect(page.getByLabel("Ürün ara")).toHaveValue("");
  await expect(products.getByRole("listitem")).toHaveCount(9);
});

test("adding to cart opens the drawer and updates count and total", async ({ page }) => {
  await page.getByRole("button", { name: "Canvas Sneaker sepete ekle" }).click();
  const cart = page.getByRole("complementary", { name: "Sepet" });
  await expect(cart).toBeVisible();
  await expect(page.getByRole("button", { name: "Sepet (1)" })).toBeVisible();

  await page.getByRole("button", { name: "Wool Beanie sepete ekle" }).click();
  await cart.getByRole("button", { name: "Wool Beanie artır" }).click();
  await expect(page.getByRole("button", { name: "Sepet (3)" })).toBeVisible();
  await expect(cart.getByText("Toplam: 1.800 ₺")).toBeVisible();

  await cart.getByRole("button", { name: "Wool Beanie azalt" }).click();
  await cart.getByRole("button", { name: "Wool Beanie azalt" }).click();
  await expect(cart.getByText("Wool Beanie")).toHaveCount(0);
  await expect(cart.getByText("Toplam: 1.200 ₺")).toBeVisible();
});

test("stock limits add buttons and sold out products", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Hiking Boot sepete ekle" })).toBeDisabled();

  const add = page.getByRole("button", { name: "Silk Scarf sepete ekle" });
  await add.click();
  await expect(add).toBeDisabled();
  await expect(
    page.getByRole("complementary", { name: "Sepet" }).getByRole("button", { name: "Silk Scarf artır" }),
  ).toBeDisabled();
});

test("cart items persist after reload, drawer state does not", async ({ page }) => {
  await page.getByRole("button", { name: "Linen Shirt sepete ekle" }).click();
  await expect(page.getByRole("complementary", { name: "Sepet" })).toBeVisible();

  const stored = await page.evaluate(() => localStorage.getItem("shop-cart"));
  expect(JSON.parse(stored!)).toEqual({
    state: { items: { 4: { id: 4, name: "Linen Shirt", price: 850, quantity: 1 } } },
    version: 1,
  });

  await page.reload();
  await expect(page.getByRole("button", { name: "Sepet (1)" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Sepet" })).toHaveCount(0);

  await page.getByRole("button", { name: "Sepet (1)" }).click();
  await page.getByRole("button", { name: "Sepeti boşalt" }).click();
  await expect(page.getByText("Sepetiniz boş.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sepet (0)" })).toBeVisible();
});

test("cart derives a stock warning from server data instead of syncing", async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem(
      "shop-cart",
      JSON.stringify({
        state: { items: { 5: { id: 5, name: "Denim Jacket", price: 1650, quantity: 4 } } },
        version: 1,
      }),
    ),
  );
  await page.reload();
  await page.getByRole("button", { name: "Sepet (4)" }).click();
  const cart = page.getByRole("complementary", { name: "Sepet" });
  await expect(cart.getByRole("alert")).toHaveText("Stokta yalnızca 2 adet var.");
  await expect(cart.getByLabel("Denim Jacket adet")).toHaveText("4");

  await cart.getByRole("button", { name: "Denim Jacket azalt" }).click();
  await cart.getByRole("button", { name: "Denim Jacket azalt" }).click();
  await expect(cart.getByRole("alert")).toHaveCount(0);
});
