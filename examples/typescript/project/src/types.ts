export const CATEGORIES = ["audio", "computer", "accessory"] as const;

export type Category = (typeof CATEGORIES)[number];

export type Product = {
  id: number;
  name: string;
  price: number;
  category: Category;
  inStock: boolean;
};

export type CartItem = Pick<Product, "id" | "name" | "price"> & {
  quantity: number;
};

export type FetchState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };
