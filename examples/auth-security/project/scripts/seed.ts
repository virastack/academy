import { auth } from "../lib/auth";
import { db } from "../lib/db";

const users = [
  { email: "admin@example.com", role: "admin" },
  { email: "editor@example.com", role: "editor" },
  { email: "customer@example.com", role: "customer" },
] as const;

const password = "password-1234";

db.exec(`
  CREATE TABLE IF NOT EXISTS product (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0
  );
  DELETE FROM product;
`);

const insertProduct = db.prepare(
  "INSERT INTO product (id, name, price, description) VALUES (?, ?, ?, ?)",
);
insertProduct.run("keyboard", "Mechanical Keyboard", 2499, "<b>US</b> layout");
insertProduct.run("mouse", "Wireless Mouse", 899, "<i>Silent</i> click");
insertProduct.run(
  "monitor",
  "27-inch Monitor",
  7999,
  '<b>4K</b> panel<img src="x" onerror="window.__xss = true">',
);

async function main() {
  for (const user of users) {
    const existing = db.prepare("SELECT id FROM user WHERE email = ?").get(user.email);

    if (!existing) {
      await auth.api.signUpEmail({ body: { email: user.email, password, name: user.role } });
    }

    db.prepare("UPDATE user SET role = ? WHERE email = ?").run(user.role, user.email);
  }

  console.log("Seed done:", users.map((user) => user.email).join(", "));
}

main();
