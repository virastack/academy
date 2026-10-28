// Pure function tests that need no browser. In a real project, move these
// to a unit test runner such as Vitest; they live in Playwright here to keep one tool.
import { expect, test } from "@playwright/test";
import { isInRollout, rolloutBucket } from "../lib/rollout";

const ids = Array.from({ length: 10_000 }, (_, index) => `user-${index}`);

test("the same user always lands in the same bucket", () => {
  expect(rolloutBucket("u1", "order-summary")).toBe(rolloutBucket("u1", "order-summary"));
});

test("0 percent includes nobody and 100 percent everybody", () => {
  expect(ids.some((id) => isInRollout(id, "order-summary", 0))).toBe(false);
  expect(ids.every((id) => isInRollout(id, "order-summary", 100))).toBe(true);
});

test("30 percent includes roughly 30 percent of users", () => {
  const share = ids.filter((id) => isInRollout(id, "order-summary", 30)).length / ids.length;

  expect(share).toBeGreaterThan(0.27);
  expect(share).toBeLessThan(0.33);
});

test("raising the percentage never drops anyone already included", () => {
  const at10 = ids.filter((id) => isInRollout(id, "order-summary", 10));

  expect(at10.every((id) => isInRollout(id, "order-summary", 30))).toBe(true);
});
