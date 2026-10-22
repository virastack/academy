import { http, HttpResponse } from "msw/http";
import type { Product } from "../types";

export const products: Product[] = [
  { id: 1, name: "Kablosuz Kulaklık", price: 1299, oldPrice: 1499, inStock: true },
  { id: 2, name: "Mekanik Klavye", price: 2199, inStock: true },
  { id: 3, name: "Oyuncu Faresi", price: 899, inStock: false },
];

export const handlers = [
  http.get("https://api.magaza.test/products", () =>
    HttpResponse.json(products),
  ),
];
