import { expect, test } from "./fixtures";

test("the health endpoint returns the environment and version", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({ status: "ok", env: "local", version: "test" });
});

test("security headers are sent and X-Powered-By is not", async ({ request }) => {
  const response = await request.get("/login");
  const headers = response.headers();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("a user with the flag on sees the order summary", async ({ page, ordersPage }) => {
  await ordersPage.goto();

  await expect(page.getByText("6 orders, ₺5.422,40 in total")).toBeVisible();
});

test("on a server error the error boundary shows a digest", async ({ page }) => {
  await page.goto("/debug");

  // Next.js'in sayfa geçişi duyurucusu da role="alert" taşır; metinle daraltıyoruz.
  const alert = page.getByRole("alert").filter({ hasText: "Something went wrong" });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(/hata kodu: \S+/);
  await expect(alert).not.toContainText("thrown on purpose");
});
