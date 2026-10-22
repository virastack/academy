export type Role = "customer" | "editor" | "admin";

const permissions = {
  customer: [],
  editor: ["product:read", "product:update"],
  admin: ["product:read", "product:update", "product:archive", "user:manage"],
} as const satisfies Record<Role, readonly string[]>;

export type Permission = (typeof permissions)[Role][number];

export function hasPermission(role: Role, permission: Permission) {
  return (permissions[role] as readonly string[]).includes(permission);
}

export function isRole(value: unknown): value is Role {
  return value === "customer" || value === "editor" || value === "admin";
}
