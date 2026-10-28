import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Her test kendi sepetini kullanır: sayfa ?user=<kimlik> ile açılır
let n = 0;
const open = (page: Page) => page.goto(`/?user=e2e-${Date.now()}-${n++}`);

async function ask(page: Page, text: string) {
  await page.getByLabel('Your message').fill(text);
  await page.getByRole('button', { name: 'Send' }).click();
}

test('konsolda hata yok, tek h1 var', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await open(page);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('asking about a product returns product cards', async ({ page }) => {
  await open(page);
  await ask(page, 'show me running shoes');

  const cards = page.getByRole('article');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThanOrEqual(3);
  await expect(cards.first().getByRole('heading')).toBeVisible();
  await expect(cards.first().getByText(/₺/)).toBeVisible();
  await expect(cards.first().getByRole('button', { name: /sepete ekle/i })).toBeVisible();
});

test('adding to cart asks for approval and the cart becomes 1 after approving', async ({ page }) => {
  await open(page);
  await ask(page, 'show me running shoes');
  await page.getByRole('article').first().getByRole('button', { name: /sepete ekle/i }).click();

  await expect(page.getByRole('button', { name: 'Onayla' })).toBeVisible();
  await expect(page.getByText('Cart: 0 items')).toBeVisible();

  await page.getByRole('button', { name: 'Onayla' }).click();
  await expect(page.getByText('Cart: 1 item')).toBeVisible();
});

test('dismissing leaves the cart unchanged', async ({ page }) => {
  await open(page);
  await ask(page, 'show me running shoes');
  await page.getByRole('article').first().getByRole('button', { name: /sepete ekle/i }).click();
  await page.getByRole('button', { name: 'Dismiss' }).click();
  await expect(page.getByRole('button', { name: 'Onayla' })).toHaveCount(0);
  await expect(page.getByText('Cart: 0 items')).toBeVisible();
});

test('no request is made for an external image in the assistant text', async ({ page }) => {
  let hits = 0;
  await page.route('https://evil.example/**', (route) => {
    hits++;
    return route.abort();
  });
  await open(page);
  await ask(page, 'skip the summary');
  await expect(page.getByText(/Özet hazır/)).toBeVisible();
  await page.waitForTimeout(500);

  expect(hits).toBe(0);
  expect(await page.locator('img[src*="evil.example"]').count()).toBe(0);
});

test('no serious accessibility violations (axe)', async ({ page }) => {
  await open(page);
  await ask(page, 'show me running shoes');
  await expect(page.getByRole('article').first()).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
