---
title: "Sipariş paneli testleri"
description: "Oturumlu ve rollere ayrılmış bir paneli uçtan uca test etmek."
lastVerified: "2026-10-22"
translationKey: "playwright/project"
---

## Senaryo

Küçük bir sipariş paneli var. Uygulama:

- `/login` sayfasında e-posta ve parolayla giriş alır; oturumu `httpOnly` bir cookie'de tutar.
- `/orders` sayfasında siparişleri [!tanstack-query] ile `/api/orders`'tan yükler ve duruma göre filtreler.
- Yükleniyor, hata *("Try again" butonuyla)* ve boş liste durumlarını gösterir.
- Yöneticiye hazırlanan siparişleri iptal etme yetkisi verir; izleyici yalnızca görüntüler. Sunucu da izleyicinin iptal isteğini reddeder.

Sizin işiniz bu uygulamanın test paketini yazmak. Amaç her dersteki parçayı bir arada kullanmak:

| Parça | Dosya | Ders |
| :-- | :-- | :-- |
| `webServer`, projeler, `default: false` | `playwright.config.ts` | Kurulum |
| `getByRole`, `filter`, `Locator.within()` | `tests/pages/orders-page.ts` | İlk test ve locator'lar |
| Web-first assertion, hidrasyonu beklemek | `tests/orders.spec.ts` | Assertion ve bekleme |
| `LoginPage`, `OrdersPage` | `tests/pages/` | Page Object |
| Fixture'lar, setup projesi, iki rol, oturumsuz test | `tests/fixtures.ts`, `tests/auth.setup.ts` | Auth ve fixture |
| Hata, boş liste, yanıt değiştirme, yükleniyor | `tests/mocking.spec.ts` | API mock |
| axe, klavye, aria snapshot, ekran görüntüsü | `tests/accessibility.spec.ts`, `tests/orders.visual.ts` | Erişilebilirlik ve görsel testler |
| `--shuffle` ile bulunan sıra hatası | `tests/cancel-order.spec.ts` | Trace ile hata ayıklama |
| GitHub Actions | `.github/workflows/playwright.yml` | CI'da çalıştırma |

Projenin çalışan hali GitHub'da: [examples/playwright/project](https://github.com/virastack/academy/tree/main/examples/playwright/project). Uygulama ve 19 test orada; takıldığınızda karşılaştırın.

## Adım 1: Projeyi kurun

[!nextjs] projesini açın, TanStack Query'yi ve test paketlerini ekleyin:[^1]

```command
npx create-next-app@latest order-panel --yes
```

```command
npm install @tanstack/react-query server-only
```

```command
npm init playwright@latest
```

Playwright kurulumunda TypeScript'i, `tests` klasörünü ve GitHub Actions iş akışını seçin. Ardından axe'ı ekleyin:

```command
npm install -D @axe-core/playwright
```

`package.json`'a test komutunu ekleyin: `"test": "playwright test"`. `public/` altındaki örnek SVG'leri ve oluşturulan `tests/example.spec.ts`'i silin.

## Adım 2: Test edilecek uygulama

Uygulamanın kendisi bu rehberin konusu değil; [Next.js](/academy/nextjs) ve [TanStack Query](/academy/tanstack-query) rehberlerindeki parçalardan oluşur. Dosyaları yazın ya da örnek klasörden kopyalayın.

Veri bir veritabanı yerine sunucunun belleğinde durur. Her oturum siparişlerin **kendi kopyasıyla** başlar. Böylece bir testin iptal ettiği sipariş, aynı anda çalışan başka bir testi etkilemez *(bkz. [Auth ve fixture](/academy/playwright/auth-and-fixtures))*. Gerçek bir projede bunun karşılığı her testin kendi verisini oluşturmasıdır.

```ts
// lib/orders.ts
export type OrderStatus = "preparing" | "shipped" | "delivered" | "cancelled";

export type Order = {
  id: string;
  customer: string;
  total: number;
  status: OrderStatus;
};

export const statusLabels: Record<OrderStatus, string> = {
  preparing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export type StatusFilter = OrderStatus | "all";

export function isStatusFilter(value: string): value is StatusFilter {
  return value === "all" || value in statusLabels;
}
```

```ts
// lib/store.ts
import "server-only";
import type { Order } from "./orders";

export type Role = "admin" | "viewer";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type Session = {
  user: User;
  orders: Order[];
};

const PASSWORD = "password123";

const users: User[] = [
  { id: "u1", name: "Dana Admin", email: "admin@example.com", role: "admin" },
  { id: "u2", name: "Evan Viewer", email: "viewer@example.com", role: "viewer" },
];

const seedOrders: Order[] = [
  { id: "SP-1001", customer: "Jane Miller", total: 1249.9, status: "preparing" },
  { id: "SP-1002", customer: "Marco Rossi", total: 389, status: "shipped" },
  { id: "SP-1003", customer: "Nina Kowalski", total: 2150, status: "delivered" },
  { id: "SP-1004", customer: "Tom Baker", total: 74.5, status: "preparing" },
  { id: "SP-1005", customer: "Clara Dubois", total: 999, status: "cancelled" },
  { id: "SP-1006", customer: "Felix Wagner", total: 560, status: "shipped" },
];

// Demo veri katmanı: veritabanı yerine bellekte tutulur. Her oturum siparişlerin
// kendi kopyasıyla başlar; bir testin iptal ettiği sipariş diğer testleri etkilemez.
const store = globalThis as typeof globalThis & { sessions?: Map<string, Session> };
const sessions = (store.sessions ??= new Map<string, Session>());

export function findUser(email: string, password: string): User | undefined {
  if (password !== PASSWORD) return undefined;
  return users.find((user) => user.email === email);
}

export function createSession(user: User): string {
  const id = crypto.randomUUID();
  sessions.set(id, { user, orders: structuredClone(seedOrders) });
  return id;
}

export function readSession(id: string | undefined): Session | undefined {
  return id ? sessions.get(id) : undefined;
}

export function deleteSession(id: string | undefined) {
  if (id) sessions.delete(id);
}
```

`cacheComponents` açık olduğu için cookie okuyan her component bir `<Suspense>` sınırının içinde olmalıdır; dışarıda okumak build hatasıdır.[^2]

```ts
// lib/session.ts
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, type User } from "./store";

export const SESSION_COOKIE = "session";

export async function getSession() {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  return readSession(id);
}

export async function getCurrentUser(): Promise<User> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}
```

Giriş ve çıkış Server Action'dır. Giriş formu `action` ile gönderildiği için JavaScript yüklenmeden de çalışır; testte hidrasyonu beklemek gerekmez *(bkz. [Assertion ve bekleme](/academy/playwright/assertions-and-waiting))*.

```ts
// app/actions.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session";
import { createSession, deleteSession, findUser } from "@/lib/store";

export type LoginState = {
  error?: string;
  email?: string;
};

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = findUser(email, password);
  if (!user) {
    return { error: "Email or password is incorrect.", email };
  }

  (await cookies()).set(SESSION_COOKIE, createSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  redirect("/orders");
}

export async function logout() {
  const cookieStore = await cookies();
  deleteSession(cookieStore.get(SESSION_COOKIE)?.value);
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
```

Route Handler'lar oturumu her istekte yeniden kontrol eder. İzleyici rolündeki biri butonu görmese de isteği elle atabilir; yetki kontrolü sunucudadır.[^2][^3]

```ts
// app/api/orders/route.ts
import type { NextRequest } from "next/server";
import { isStatusFilter } from "@/lib/orders";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "A session is required." }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status") ?? "all";
  if (!isStatusFilter(status)) {
    return Response.json({ error: "Invalid status." }, { status: 400 });
  }

  // Yavaş bir ağı taklit eder; yükleniyor durumu ekranda görünsün.
  await new Promise((resolve) => setTimeout(resolve, 300));

  const orders =
    status === "all" ? session.orders : session.orders.filter((order) => order.status === status);
  return Response.json({ orders });
}
```

```ts
// app/api/orders/[id]/cancel/route.ts
import { getSession } from "@/lib/session";

export async function POST(_request: Request, ctx: RouteContext<"/api/orders/[id]/cancel">) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "A session is required." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "You are not authorized for this action." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const order = session.orders.find((item) => item.id === id);
  if (!order) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.status !== "preparing") {
    return Response.json(
      { error: "Only orders being prepared can be cancelled." },
      { status: 409 },
    );
  }

  order.status = "cancelled";
  return Response.json({ order });
}
```

```tsx
// components/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

`retry: 1` ayarı hata ekranının birkaç saniye beklemeden görünmesini sağlar. TanStack Query'nin varsayılanı tarayıcıda 3 tekrar denemedir.[^4]

```tsx
// components/login-form.tsx
"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="space-y-4" aria-label="Sign in">
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          className="w-full rounded border border-gray-400 px-3 py-2"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded border border-gray-400 px-3 py-2"
        />
      </div>
      <p role="alert" className="min-h-5 text-sm text-red-700">
        {state.error}
      </p>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-gray-900 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
```

```tsx
// components/orders-panel.tsx
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { isStatusFilter, statusLabels, type Order, type StatusFilter } from "@/lib/orders";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" });

async function fetchOrders(status: StatusFilter): Promise<Order[]> {
  const response = await fetch(`/api/orders?status=${status}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data: { orders: Order[] } = await response.json();
  return data.orders;
}

async function cancelOrder(id: string): Promise<Order> {
  const response = await fetch(`/api/orders/${id}/cancel`, { method: "POST" });
  const data: { order?: Order; error?: string } = await response.json();
  if (!response.ok || !data.order) throw new Error(data.error ?? "The order could not be cancelled.");
  return data.order;
}

export function OrdersPanel({ canCancel }: { canCancel: boolean }) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const orders = useQuery({
    queryKey: ["orders", status],
    queryFn: () => fetchOrders(status),
  });

  const cancel = useMutation({
    mutationFn: cancelOrder,
    onSuccess: (order) => {
      setMessage(`${order.id} cancelled.`);
      return queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) => setMessage(error.message),
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(event) => {
            const value = event.target.value;
            if (isStatusFilter(value)) setStatus(value);
          }}
          className="rounded border border-gray-400 px-2 py-1"
        >
          <option value="all">All</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <p role="status" className="min-h-5 text-sm">
        {message}
      </p>

      {orders.isPending ? (
        <p>Loading orders...</p>
      ) : orders.isError ? (
        <div role="alert" className="space-y-2 rounded border border-red-300 bg-red-50 p-4">
          <p>Orders could not be loaded.</p>
          <button type="button" onClick={() => orders.refetch()} className="underline">
            Try again
          </button>
        </div>
      ) : orders.data.length === 0 ? (
        <p>No orders in this filter.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Order list</caption>
          <thead>
            <tr className="border-b">
              <th scope="col" className="py-2">Order</th>
              <th scope="col">Customer</th>
              <th scope="col">Amount</th>
              <th scope="col">Status</th>
              {canCancel && <th scope="col">Action</th>}
            </tr>
          </thead>
          <tbody>
            {orders.data.map((order) => (
              <tr key={order.id} className="border-b">
                <td className="py-2 font-medium">{order.id}</td>
                <td>{order.customer}</td>
                <td>{currency.format(order.total)}</td>
                <td>{statusLabels[order.status]}</td>
                {canCancel && (
                  <td>
                    {order.status === "preparing" && (
                      <button
                        type="button"
                        onClick={() => cancel.mutate(order.id)}
                        disabled={cancel.isPending}
                        className="text-red-700 underline disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
```

Tablonun `<caption>`'ı ona erişilebilir bir ad verir; testte `getByRole("table", { name: "Order list" })` ile bulunur. Durum mesajı için `role="status"` alanı baştan sayfadadır; içerik sonradan değişince ekran okuyucu duyurur.

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Order panel",
  description: "A small order panel tested end to end with Playwright.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

```css
/* app/globals.css */
@import "tailwindcss";

body {
  font-family: system-ui, sans-serif;
}
```

```tsx
// app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/orders");
}
```

```tsx
// app/login/page.tsx
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm space-y-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Sign in to the order panel</h1>
      <LoginForm />
      <p className="text-sm text-gray-700">
        Demo accounts: admin@example.com and viewer@example.com, password: password123
      </p>
    </main>
  );
}
```

```tsx
// app/orders/page.tsx
import { Suspense } from "react";
import { logout } from "@/app/actions";
import { OrdersPanel } from "@/components/orders-panel";
import { getCurrentUser } from "@/lib/session";

const roleLabels = { admin: "Admin", viewer: "Viewer" } as const;

export default function OrdersPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <Suspense fallback={<p>Checking the session...</p>}>
        <OrdersSection />
      </Suspense>
    </main>
  );
}

async function OrdersSection() {
  const user = await getCurrentUser();

  return (
    <>
      <div className="flex items-center justify-between gap-4 text-sm">
        <p>
          {user.name} <span className="text-gray-700">({roleLabels[user.role]})</span>
        </p>
        <form action={logout}>
          <button type="submit" className="underline">
            Sign out
          </button>
        </form>
      </div>
      <OrdersPanel canCancel={user.role === "admin"} />
    </>
  );
}
```

`npm run dev` ile açın, iki hesapla da giriş yapıp deneyin. Uygulama çalışıyorsa testlere geçin.

## Adım 3: Yapılandırma

Üç proje var: oturumları hazırlayan `setup`, asıl testler için `chromium` ve varsayılan olarak çalışmayan `visual`.[^5][^6]

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const adminState = "playwright/.auth/admin.json";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      testIgnore: /.*\.visual\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: adminState },
      dependencies: ["setup"],
    },
    {
      name: "visual",
      testMatch: /.*\.visual\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: adminState },
      dependencies: ["setup"],
      default: false,
    },
  ],
  webServer: {
    command: "npm run build && npm run start -- --port 3000",
    url: "http://localhost:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

Fixture'lardaki `use(...)` çağrısını React hook'u sanan ESLint kuralını test klasöründe kapatın:

```js
// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Playwright fixture'larındaki use() bir React Hook değildir.
    files: ["tests/**"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
```

`.gitignore`'da `playwright/.auth/` olduğundan emin olun. Oturum dosyaları gerçek cookie taşır.[^5]

## Adım 4: Page Object'ler

Locator'lar kullanıcının gördüğü rollerle ve etiketlerle yazılır. `statusCells`, her satırın dördüncü hücresini `Locator.within()` ile bulur.[^7][^8]

```ts
// tests/pages/login-page.ts
import type { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    const form = page.getByRole("form", { name: "Sign in" });
    this.email = form.getByLabel("Email");
    this.password = form.getByLabel("Password");
    this.submit = form.getByRole("button", { name: "Sign in" });
    this.error = form.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password = "password123") {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
```

```ts
// tests/pages/orders-page.ts
import type { Locator, Page } from "@playwright/test";

export class OrdersPage {
  readonly heading: Locator;
  readonly statusFilter: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly statusCells: Locator;
  readonly message: Locator;
  readonly loading: Locator;
  readonly empty: Locator;
  readonly loadError: Locator;
  readonly logout: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Orders" });
    this.statusFilter = page.getByLabel("Status");
    this.table = page.getByRole("table", { name: "Order list" });
    this.rows = this.table.getByRole("row").filter({ has: page.getByRole("cell") });
    // Her satırın dördüncü hücresi: nth(3) satırların içinde ayrı ayrı çözülür.
    this.statusCells = page.getByRole("cell").nth(3).within(this.rows);
    this.message = page.getByRole("main").getByRole("status");
    this.loading = page.getByText("Loading orders...");
    this.empty = page.getByText("No orders in this filter.");
    this.loadError = page.getByRole("alert").filter({ hasText: "Orders could not be loaded." });
    this.logout = page.getByRole("button", { name: "Sign out" });
  }

  async goto() {
    await this.page.goto("/orders");
  }

  row(orderId: string) {
    return this.rows.filter({ hasText: orderId });
  }

  async filterBy(label: string) {
    await this.statusFilter.selectOption({ label });
  }

  async cancel(orderId: string) {
    await this.row(orderId).getByRole("button", { name: "Cancel" }).click();
  }
}
```

## Adım 5: Fixture'lar ve oturum

Page Object'ler fixture olarak verilir. `signedOut` oturumsuz testler için boş durumdur.[^9]

```ts
// tests/fixtures.ts
import { test as base } from "@playwright/test";
import { LoginPage } from "./pages/login-page";
import { OrdersPage } from "./pages/orders-page";

type Pages = {
  loginPage: LoginPage;
  ordersPage: OrdersPage;
};

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  ordersPage: async ({ page }, use) => {
    await use(new OrdersPage(page));
  },
});

export { expect } from "@playwright/test";

export const signedOut = { cookies: [], origins: [] };
```

Setup iki rolle giriş yapar ve her birinin durumunu ayrı dosyaya kaydeder. `toHaveURL` cookie yazılmadan kaydetmeyi önler.[^5]

```ts
// tests/auth.setup.ts
import { expect, test as setup } from "./fixtures";

const accounts = [
  { email: "admin@example.com", file: "playwright/.auth/admin.json" },
  { email: "viewer@example.com", file: "playwright/.auth/viewer.json" },
];

for (const { email, file } of accounts) {
  setup(`sign in as ${email}`, async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login(email);
    await expect(page).toHaveURL("/orders");
    await page.context().storageState({ path: file });
  });
}
```

## Adım 6: Giriş ve rol testleri

Giriş testleri oturumsuz başlar. Oturum yokken `/orders`'a gidince yönlendirme, oturumu okuyan component Suspense içinde olduğu için akış sırasında olur; `toHaveURL` bunu bekler.

```ts
// tests/login.spec.ts
import { expect, signedOut, test } from "./fixtures";

test.use({ storageState: signedOut });

test("without a session the orders page redirects to sign-in", async ({ page }) => {
  await page.goto("/orders");
  await expect(page).toHaveURL("/login");
});

test("a wrong password shows an error and keeps the email", async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.login("admin@example.com", "wrongpass");

  await expect(loginPage.error).toHaveText("Email or password is incorrect.");
  await expect(loginPage.email).toHaveValue("admin@example.com");
  await expect(page).toHaveURL("/login");
});

test("a signed-in user sees the orders and can sign out", async ({
  page,
  loginPage,
  ordersPage,
}) => {
  await loginPage.goto();
  await loginPage.login("admin@example.com");

  await expect(page).toHaveURL("/orders");
  await expect(page.getByText("Dana Admin")).toBeVisible();

  await ordersPage.logout.click();
  await expect(page).toHaveURL("/login");

  await ordersPage.goto();
  await expect(page).toHaveURL("/login");
});
```

İzleyici testleri ikinci oturum dosyasını kullanır ve yetkiyi hem arayüzde hem API'de doğrular.

```ts
// tests/viewer.spec.ts
import { expect, test } from "./fixtures";

test.use({ storageState: "playwright/.auth/viewer.json" });

test("a viewer does not see the cancel button", async ({ page, ordersPage }) => {
  await ordersPage.goto();

  await expect(page.getByText("Evan Viewer")).toBeVisible();
  await expect(ordersPage.rows).toHaveCount(6);
  await expect(ordersPage.table.getByRole("button", { name: "Cancel" })).toHaveCount(0);
});

test("a viewer cannot cancel through the API either", async ({ page }) => {
  const response = await page.request.post("/api/orders/SP-1001/cancel");

  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ error: "You are not authorized for this action." });
});
```

## Adım 7: Sipariş testleri

Okuma testleri paylaşılan yönetici oturumunu kullanır. Her test önce satırların yüklenmesini bekler; satırlar görünüyorsa React çalışıyordur ve filtre güvenle değiştirilebilir. Aria snapshot tablonun yapısını tek assertion'da doğrular.[^10]

```ts
// tests/orders.spec.ts
import { expect, test } from "./fixtures";

test.beforeEach(async ({ ordersPage }) => {
  await ordersPage.goto();
});

test("lists all orders", async ({ ordersPage }) => {
  await expect(ordersPage.rows).toHaveCount(6);
  await expect(ordersPage.row("SP-1001")).toContainText("Jane Miller");
  await expect(ordersPage.row("SP-1001")).toContainText("€1,249.90");
});

test("filters by status", async ({ ordersPage }) => {
  await ordersPage.filterBy("Shipped");

  await expect(ordersPage.rows).toHaveCount(2);
  await expect(ordersPage.statusCells).toHaveText(["Shipped", "Shipped"]);
});

test("the table structure is as expected", async ({ ordersPage }) => {
  await ordersPage.filterBy("Delivered");

  await expect(ordersPage.table).toMatchAriaSnapshot(`
    - table "Order list":
      - rowgroup:
        - row "Order Customer Amount Status Action"
      - rowgroup:
        - row /SP-1003 Nina Kowalski/:
          - cell "SP-1003"
          - cell "Nina Kowalski"
          - cell /2,150\\.00/
          - cell "Delivered"
          - cell
  `);
});
```

Veriyi değiştiren testler kendi dosyasındadır ve kendi oturumunu açar.

```ts
// tests/cancel-order.spec.ts
import { expect, signedOut, test } from "./fixtures";

// Veriyi değiştiren test paylaşılan oturumu kullanmaz; kendi oturumunu açar.
// Böylece diğer testler iptal edilmiş bir sipariş görmez.
test.use({ storageState: signedOut });

test("an admin cancels an order being prepared", async ({ loginPage, ordersPage }) => {
  await loginPage.goto();
  await loginPage.login("admin@example.com");

  await ordersPage.cancel("SP-1001");

  await expect(ordersPage.message).toHaveText("SP-1001 cancelled.");
  await expect(ordersPage.row("SP-1001")).toContainText("Cancelled");
  await expect(ordersPage.row("SP-1001").getByRole("button")).toHaveCount(0);
});

test("an admin cannot cancel a shipped order", async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.login("admin@example.com");
  await expect(page).toHaveURL("/orders");

  const response = await page.request.post("/api/orders/SP-1002/cancel");

  expect(response.status()).toBe(409);
});
```

> [!WARNING]
>
> İptal testi ilk yazıldığında `orders.spec.ts`'in içindeydi ve dosyanın `beforeEach`'i `/orders`'a gidiyordu. Oturumsuz başlayan test `/login`'e gitmeye çalışırken `beforeEach`'in başlattığı yönlendirme hâlâ sürüyordu: "Navigation is interrupted by another navigation". Test tek başına hep geçiyordu; yalnızca `--shuffle --repeat-each=3 --workers=4` ile ve belirli bir sırada düştü. Çözüm testi kendi dosyasına taşımaktı.

## Adım 8: Mock testleri

Sipariş listesi tarayıcıda yüklendiği için `page.route` ile yakalanabilir. Kalıp `"**/api/orders?*"`'dir; sorgu dizesi URL'nin parçası olduğu için `"**/api/orders"` uymaz.[^11]

```ts
// tests/mocking.spec.ts
import { expect, test } from "./fixtures";

test("error state and retry on a server error", async ({ page, ordersPage }) => {
  await page.route("**/api/orders?*", (route) =>
    route.fulfill({ status: 500, json: { error: "Server error" } }),
  );

  await ordersPage.goto();
  await expect(ordersPage.loadError).toBeVisible();

  await page.unroute("**/api/orders?*");
  await ordersPage.loadError.getByRole("button", { name: "Try again" }).click();

  await expect(ordersPage.rows).toHaveCount(6);
  await expect(ordersPage.loadError).toBeHidden();
});

test("empty list message", async ({ page, ordersPage }) => {
  await page.route("**/api/orders?*", (route) => route.fulfill({ json: { orders: [] } }));

  await ordersPage.goto();
  await expect(ordersPage.empty).toBeVisible();
});

test("overrides the response to try a long customer name", async ({ page, ordersPage }) => {
  await page.route("**/api/orders?*", async (route) => {
    const response = await route.fetch();
    const { orders } = await response.json();
    orders[0].customer = "Wilhelmina Fitzgerald-Montgomery Vandersteen Verylongsurname";
    await route.fulfill({ response, json: { orders } });
  });

  await ordersPage.goto();
  await expect(ordersPage.row("SP-1001")).toContainText("Wilhelmina Fitzgerald-Montgomery Vandersteen Verylongsurname");
});

test("the loading state is visible", async ({ page, ordersPage }) => {
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
```

## Adım 9: Erişilebilirlik ve görsel test

axe taraması sayfa hazır olunca yapılır. Klavye testi formun yalnızca klavyeyle doldurulup gönderilebildiğini doğrular.[^12]

```ts
// tests/accessibility.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, signedOut, test } from "./fixtures";

test.describe("sign-in page", () => {
  test.use({ storageState: signedOut });

  test("no accessibility violations", async ({ page, loginPage }) => {
    await loginPage.goto();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("the form is usable with the keyboard", async ({ page, loginPage }) => {
    await loginPage.goto();

    await loginPage.email.focus();
    await page.keyboard.type("admin@example.com");
    await page.keyboard.press("Tab");
    await expect(loginPage.password).toBeFocused();

    await page.keyboard.type("password123");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/orders");
  });
});

test("no accessibility violations on the orders page", async ({ page, ordersPage }) => {
  await ordersPage.goto();
  await expect(ordersPage.rows).toHaveCount(6);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

Görsel test `visual` projesindedir ve `npm test` ile çalışmaz.[^6][^13]

```ts
// tests/orders.visual.ts
import { expect, test } from "./fixtures";

test("order table appearance", async ({ ordersPage }) => {
  await ordersPage.goto();
  await expect(ordersPage.rows).toHaveCount(6);

  await expect(ordersPage.table).toHaveScreenshot("orders-table.png");
});
```

## Adım 10: Çalıştırın

```command
npx playwright install chromium
```

```command
npm test
```

`npm test` production build alır, sunucuyu başlatır ve testleri çalıştırır. Beklenen sonuç `19 passed`. Görsel test için referansı oluşturup karşılaştırın:

```command
npx playwright test --project=visual --update-snapshots=missing
```

```command
npx playwright test --project=visual
```

Kararlılığı ölçmek için testleri karışık sırayla ve tekrar tekrar çalıştırın:

```command
npx playwright test --shuffle --repeat-each=5 --workers=4
```

## Adım 11: CI

`npm init playwright`'ın oluşturduğu iş akışını yalnızca Chromium'u kuracak ve `npm test`'i çalıştıracak şekilde sadeleştirin:[^14]

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium
      - name: Run Playwright tests
        run: npm test
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Kendin dene

- Yönetici için "Shipped" filtresinde iptal butonunun hiç görünmediğini doğrulayan bir test ekleyin.
- `cancel-order.spec.ts`'i `orders.spec.ts`'e geri taşıyıp `--shuffle --repeat-each=5` ile çalıştırın. Hatayı yakalayın ve trace'inde iki gezinmeyi bulun.
- İptal isteğine `page.route` ile 409 döndürün ve kullanıcıya gösterilen mesajı doğrulayın.
- Bir sütun ekleyin *(örneğin tarih)* ve aria snapshot'ın nasıl düştüğüne bakın. Snapshot'ı `-u` ile güncellemeden önce farkı okuyun.

## Kaynaklar

1. [Next.js: Installation](https://nextjs.org/docs/app/getting-started/installation) *(doc)* — `create-next-app` ve varsayılan ayarlar.
2. [Next.js: How to implement authentication with Cache Components](https://nextjs.org/docs/app/guides/authentication-with-cache-components) *(doc)* — Oturumu Suspense içinde okumak ve her Route Handler'da yeniden doğrulamak.
3. [Next.js: route.js](https://nextjs.org/docs/app/api-reference/file-conventions/route) *(doc)* — Route Handler'lar ve `RouteContext` tipi.
4. [TanStack Query: Query Retries](https://tanstack.com/query/latest/docs/framework/react/guides/query-retries) *(doc)* — Varsayılan tekrar deneme sayısı ve `retry` ayarı.
5. [Playwright: Authentication](https://playwright.dev/docs/auth) *(doc)* — Setup projesi, `storageState`, roller ve oturum dosyalarının güvenliği.
6. [Playwright: Release notes 1.64](https://playwright.dev/docs/release-notes#version-164) *(doc)* — `TestProject.default`, `Locator.within()`, `--shuffle` ve `--update-snapshots=missing`.
7. [Playwright: Locators](https://playwright.dev/docs/locators) *(doc)* — Rol ve etiketle bulmak, filtreleme ve zincirleme.
8. [Playwright: Page object models](https://playwright.dev/docs/pom) *(doc)* — Page Object sınıfları.
9. [Playwright: Fixtures](https://playwright.dev/docs/test-fixtures) *(doc)* — `test.extend` ile kendi fixture'larınız.
10. [Playwright: Snapshot testing](https://playwright.dev/docs/aria-snapshots) *(doc)* — `toMatchAriaSnapshot` ve düzenli ifadeyle eşleştirme.
11. [Playwright: Mock APIs](https://playwright.dev/docs/mock) *(doc)* — `route.fulfill`, `route.fetch` ve `route.continue`.
12. [Playwright: Accessibility testing](https://playwright.dev/docs/accessibility-testing) *(doc)* — `AxeBuilder` ile sayfa taraması.
13. [Playwright: Visual comparisons](https://playwright.dev/docs/test-snapshots) *(doc)* — `toHaveScreenshot` ve platforma göre referans görüntüler.
14. [Playwright: Setting up CI](https://playwright.dev/docs/ci-intro) *(doc)* — GitHub Actions iş akışı ve raporu yüklemek.
