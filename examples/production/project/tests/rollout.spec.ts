// Tarayıcı gerektirmeyen saf fonksiyon testleri. Gerçek bir projede bunları
// Vitest gibi bir birim test aracına taşıyın; burada tek araçla kalmak için Playwright'ta.
import { expect, test } from "@playwright/test";
import { isInRollout, rolloutBucket } from "../lib/rollout";

const ids = Array.from({ length: 10_000 }, (_, index) => `user-${index}`);

test("aynı kullanıcı her zaman aynı kovaya düşer", () => {
  expect(rolloutBucket("u1", "order-summary")).toBe(rolloutBucket("u1", "order-summary"));
});

test("yüzde 0 kimseyi, yüzde 100 herkesi içerir", () => {
  expect(ids.some((id) => isInRollout(id, "order-summary", 0))).toBe(false);
  expect(ids.every((id) => isInRollout(id, "order-summary", 100))).toBe(true);
});

test("yüzde 30 kullanıcıların yaklaşık yüzde 30'unu içerir", () => {
  const share = ids.filter((id) => isInRollout(id, "order-summary", 30)).length / ids.length;

  expect(share).toBeGreaterThan(0.27);
  expect(share).toBeLessThan(0.33);
});

test("yüzde artınca önceden dahil olan kimse dışarıda kalmaz", () => {
  const at10 = ids.filter((id) => isInRollout(id, "order-summary", 10));

  expect(at10.every((id) => isInRollout(id, "order-summary", 30))).toBe(true);
});
