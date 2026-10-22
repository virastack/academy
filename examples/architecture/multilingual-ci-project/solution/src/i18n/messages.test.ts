import { expect, test } from "vitest";

import en from "../../messages/en.json";
import tr from "../../messages/tr.json";

function keys(messages: object, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === "object" ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

test("every locale has the same message keys", () => {
  expect(keys(en).sort()).toEqual(keys(tr).sort());
});
