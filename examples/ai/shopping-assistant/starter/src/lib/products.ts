import { products, type Category, type Product } from '../../data/products';

export function findProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function findProducts(input: { query?: string; maxPrice?: number; category?: Category }): Product[] {
  const q = input.query?.trim().toLocaleLowerCase('tr');
  return products.filter((p) => {
    if (input.category && p.category !== input.category) return false;
    if (input.maxPrice !== undefined && p.price > input.maxPrice) return false;
    if (!q) return true;
    return `${p.name} ${p.category} ${p.description}`.toLocaleLowerCase('tr').includes(q);
  });
}
