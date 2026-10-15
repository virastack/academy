import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Her test kendi sepetini kullanır: sayfa ?user=<kimlik> ile açılır
let n = 0;
const open = (page: Page) => page.goto(`/?user=e2e-${Date.now()}-${n++}`);

async function ask(page: Page, text: string) {
  await page.getByLabel('Mesajınız').fill(text);
  await page.getByRole('button', { name: 'Gönder' }).click();
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

test('ürün sorulunca ürün kartları gelir', async ({ page }) => {
  await open(page);
  await ask(page, 'koşu ayakkabısı göster');

  const cards = page.getByRole('article');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThanOrEqual(3);
  await expect(cards.first().getByRole('heading')).toBeVisible();
  await expect(cards.first().getByText(/₺/)).toBeVisible();
  await expect(cards.first().getByRole('button', { name: /sepete ekle/i })).toBeVisible();
});

test('sepete ekleme onay ister, onaylayınca sepet 1 olur', async ({ page }) => {
  await open(page);
  await ask(page, 'koşu ayakkabısı göster');
  await page.getByRole('article').first().getByRole('button', { name: /sepete ekle/i }).click();

  await expect(page.getByRole('button', { name: 'Onayla' })).toBeVisible();
  await expect(page.getByText('Sepet: 0 ürün')).toBeVisible();

  await page.getByRole('button', { name: 'Onayla' }).click();
  await expect(page.getByText('Sepet: 1 ürün')).toBeVisible();
});

test('vazgeçince sepet değişmez', async ({ page }) => {
  await open(page);
  await ask(page, 'koşu ayakkabısı göster');
  await page.getByRole('article').first().getByRole('button', { name: /sepete ekle/i }).click();
  await page.getByRole('button', { name: 'Vazgeç' }).click();
  await expect(page.getByRole('button', { name: 'Onayla' })).toHaveCount(0);
  await expect(page.getByText('Sepet: 0 ürün')).toBeVisible();
});

test('asistan metnindeki dış görsel için istek atılmaz', async ({ page }) => {
  let hits = 0;
  await page.route('https://evil.example/**', (route) => {
    hits++;
    return route.abort();
  });
  await open(page);
  await ask(page, 'özet geç');
  await expect(page.getByText(/Özet hazır/)).toBeVisible();
  await page.waitForTimeout(500);

  expect(hits).toBe(0);
  expect(await page.locator('img[src*="evil.example"]').count()).toBe(0);
});

test('erişilebilirlikte ciddi ihlal yok (axe)', async ({ page }) => {
  await open(page);
  await ask(page, 'koşu ayakkabısı göster');
  await expect(page.getByRole('article').first()).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
