import "server-only";

import { db } from "@/lib/db";
import type { Role } from "@/lib/permissions";

export type UserDTO = { id: string; email: string; role: Role };

export function listUsers(): UserDTO[] {
  return db.prepare("SELECT id, email, role FROM user ORDER BY email").all() as UserDTO[];
}

export function setRole(id: string, role: Role) {
  return db.prepare("UPDATE user SET role = ? WHERE id = ?").run(role, id).changes > 0;
}
