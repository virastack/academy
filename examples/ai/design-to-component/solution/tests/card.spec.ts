import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { profiles } from '../src/data';

const viewports = [
  { width: 320, height: 800 },
  { width: 1280, height: 900 },
];

test('konsolda hata yok', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});

test('sayfada tek h1 var', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});

test('her profil için bir kart var: isim, avatar, favori ve eylem', async ({ page }) => {
  await page.goto('/');
  const cards = page.getByRole('article');
  await expect(cards).toHaveCount(profiles.length);

  for (const [i, p] of profiles.entries()) {
    const card = cards.nth(i);
    await expect(card.getByRole('heading', { level: 2, name: p.name })).toBeVisible();
    await expect(card.getByRole('img', { name: new RegExp(p.name.split(' ')[0]) })).toBeVisible();
    await expect(card.locator('button[aria-pressed]')).toHaveCount(1);
    await expect(card.getByRole('button', { name: p.cta })).toBeVisible();
    for (const text of [p.role, p.skill, p.experience, p.rating, p.earned, p.rate]) {
      await expect(card.getByText(text, { exact: true })).toBeVisible();
    }
  }
});

test('favori butonu açılıp kapanıyor ve adı var', async ({ page }) => {
  await page.goto('/');
  for (const [i, p] of profiles.entries()) {
    const heart = page.getByRole('article').nth(i).locator('button[aria-pressed]');
    await expect(heart).toHaveAccessibleName(/.+/);
    await expect(heart).toHaveAttribute('aria-pressed', String(p.liked));
    await heart.click();
    await expect(heart).toHaveAttribute('aria-pressed', String(!p.liked));
    await heart.click();
    await expect(heart).toHaveAttribute('aria-pressed', String(p.liked));
  }
});

for (const vp of viewports) {
  test(`${vp.width}px: kart ve içeriği taşmıyor, hedefler yeterince büyük`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');

    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(pageOverflow).toBeLessThanOrEqual(0);

    // Her kartın içindeki hiçbir öğe kartın dışına taşmamalı (uzun isim dahil)
    const escaped = await page.evaluate(() => {
      const out: string[] = [];
      for (const card of document.querySelectorAll('article')) {
        const c = card.getBoundingClientRect();
        for (const el of card.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.left < c.left - 1 || r.right > c.right + 1) {
            out.push(`${el.tagName.toLowerCase()}: ${(el.textContent ?? '').trim().slice(0, 30)}`);
          }
        }
      }
      return out;
    });
    expect(escaped).toEqual([]);

    // WCAG 2.2 AA: etkileşimli hedefler en az 24x24 CSS px
    const small: string[] = [];
    for (const el of await page.locator('button, a[href]').all()) {
      const box = await el.boundingBox();
      if (box && (box.width < 24 || box.height < 24)) small.push((await el.innerText()).trim() || 'ikon buton');
    }
    expect(small).toEqual([]);
  });
}

test('ekran görüntüleri alınıyor', async ({ page }) => {
  await page.goto('/');
  mkdirSync('screenshots', { recursive: true });
  await page.getByRole('article').first().screenshot({ path: 'screenshots/card-1.png' });
  await page.screenshot({ path: 'screenshots/page-1280.png', fullPage: true });
});

test('tüm görsellerde alt özniteliği var', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('img:not([alt])').count()).toBe(0);
});

test('erişilebilirlikte ciddi ihlal yok (axe)', async ({ page }) => {
  await page.goto('/');
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test('bileşenlerde sabit renk yok, renkler token üzerinden geliyor', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx|ts)$/.test(name)) files.push(p);
    }
  };
  walk('src');

  const hardcoded = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/;
  const offenders = files.filter((f) => hardcoded.test(readFileSync(f, 'utf8')));
  expect(offenders).toEqual([]);
});
