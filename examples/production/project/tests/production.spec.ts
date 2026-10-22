import { expect, test } from "./fixtures";

test("sağlık uç noktası ortamı ve sürümü döner", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({ status: "ok", env: "local", version: "test" });
});

test("güvenlik başlıkları gönderilir, X-Powered-By gönderilmez", async ({ request }) => {
  const response = await request.get("/login");
  const headers = response.headers();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("flag açık olan kullanıcı sipariş özetini görür", async ({ page, ordersPage }) => {
  await ordersPage.goto();

  await expect(page.getByText("6 sipariş, toplam ₺5.422,40")).toBeVisible();
});

test("sunucu hatasında hata sınırı digest gösterir", async ({ page }) => {
  await page.goto("/debug");

  // Next.js'in sayfa geçişi duyurucusu da role="alert" taşır; metinle daraltıyoruz.
  const alert = page.getByRole("alert").filter({ hasText: "Bir şeyler ters gitti" });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(/hata kodu: \S+/);
  await expect(alert).not.toContainText("bilerek fırlatıldı");
});
