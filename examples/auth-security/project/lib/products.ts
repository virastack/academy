import "server-only";

import DOMPurify from "isomorphic-dompurify";

import { db } from "@/lib/db";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  description: string;
  archived: number;
};

export type ProductDTO = {
  id: string;
  name: string;
  price: number;
  description: { __html: string };
};

export function listProducts(): ProductDTO[] {
  const rows = db
    .prepare("SELECT * FROM product WHERE archived = 0 ORDER BY name")
    .all() as ProductRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    price: row.price,
    description: { __html: DOMPurify.sanitize(row.description) },
  }));
}

export function updatePrice(id: string, price: number) {
  return db.prepare("UPDATE product SET price = ? WHERE id = ?").run(price, id).changes > 0;
}

export function archiveProduct(id: string) {
  return db.prepare("UPDATE product SET archived = 1 WHERE id = ?").run(id).changes > 0;
}
