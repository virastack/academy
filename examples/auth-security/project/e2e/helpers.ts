export const PASSWORD = "parola-1234";

export const ROLES = ["admin", "editor", "customer"] as const;

export function storageState(role: (typeof ROLES)[number]) {
  return `e2e/.auth/${role}.json`;
}
