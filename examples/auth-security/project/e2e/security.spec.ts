import Database from "better-sqlite3";
import { expect, test, type APIRequestContext } from "@playwright/test";

import { PASSWORD, storageState } from "./helpers";

// Giriş sınırına takılırsa sunucunun söylediği kadar bekleyip bir kez daha dener
async function postAuth(request: APIRequestContext, url: string, data: object) {
  const response = await request.post(url, { data });

  if (response.status() !== 429) {
    return response;
  }

  const seconds = Number(response.headers()["x-retry-after"] ?? 10);
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  return request.post(url, { data });
}

test.describe("admin oturumu", () => {
  test.use({ storageState: storageState("admin") });

  test("the product description is rendered sanitized", async ({ page }) => {
    await page.goto("/admin");

    const description = page.getByTestId("product-monitor").locator("td").nth(1);
    await expect(description.locator("b")).toHaveText("4K");
    await expect(description.locator("img")).not.toHaveAttribute("onerror");
    expect(await page.evaluate(() => "__xss" in window)).toBe(false);
  });

  test("a cross-site form request is rejected", async ({ page }) => {
    await page.route("https://evil.example/", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<form method="POST" action="http://localhost:3000/api/admin/products/mouse/archive"></form>
               <script>document.forms[0].submit()</script>`,
      }),
    );

    const archiveResponse = page.waitForResponse("**/api/admin/products/mouse/archive");
    await page.goto("https://evil.example/");
    expect((await archiveResponse).status()).toBe(403);

    await page.goto("/admin");
    await expect(page.getByTestId("product-mouse")).toBeVisible();
  });
});

test("security headers are present", async ({ request }) => {
  const response = await request.get("/sign-in");
  const headers = response.headers();

  expect(headers["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("a role sent during sign-up is ignored", async ({ request }) => {
  const email = `attacker-${Date.now()}@example.com`;
  const response = await postAuth(request, "/api/auth/sign-up/email", {
    email,
    password: PASSWORD,
    name: "Attacker",
    role: "admin",
  });
  expect(response.ok()).toBe(true);

  const db = new Database("sqlite.db", { readonly: true });
  const user = db.prepare("SELECT role FROM user WHERE email = ?").get(email) as { role: string };
  db.close();

  expect(user.role).toBe("customer");
});

test("repeated sign-in attempts are rate limited", async ({ request }) => {
  const statuses: number[] = [];

  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await request.post("/api/auth/sign-in/email", {
      data: { email: "admin@example.com", password: "yanlis-parola" },
    });
    statuses.push(response.status());
  }

  expect(statuses).toContain(429);
});
