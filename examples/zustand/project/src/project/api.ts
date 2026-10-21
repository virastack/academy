export type Category = "shoes" | "clothing" | "accessories";

export type Product = {
  id: number;
  name: string;
  category: Category;
  price: number;
  stock: number;
};

export type ProductFilters = { category: Category | "all"; search: string };

const products: Product[] = [
  { id: 1, name: "Canvas Sneaker", category: "shoes", price: 1200, stock: 5 },
  { id: 2, name: "Running Shoe", category: "shoes", price: 2100, stock: 3 },
  { id: 3, name: "Hiking Boot", category: "shoes", price: 2800, stock: 0 },
  { id: 4, name: "Linen Shirt", category: "clothing", price: 850, stock: 8 },
  { id: 5, name: "Denim Jacket", category: "clothing", price: 1650, stock: 2 },
  { id: 6, name: "Knit Sweater", category: "clothing", price: 1100, stock: 6 },
  { id: 7, name: "Wool Beanie", category: "accessories", price: 300, stock: 10 },
  { id: 8, name: "Leather Belt", category: "accessories", price: 450, stock: 4 },
  { id: 9, name: "Silk Scarf", category: "accessories", price: 600, stock: 1 },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchProducts({ category, search }: ProductFilters): Promise<Product[]> {
  await delay(300);
  return products
    .filter((p) => category === "all" || p.category === category)
    .filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    .map((p) => ({ ...p }));
}
