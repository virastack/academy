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

// Demo data layer: held in memory instead of a database. Each session starts with
// its own copy of the orders, so an order one test cancels does not affect the others.
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
