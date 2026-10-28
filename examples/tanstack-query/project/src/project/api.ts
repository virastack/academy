export type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  isFavorite: boolean;
};

export type ProductPage = { items: Product[]; hasMore: boolean };

export type Review = { id: number; productId: number; text: string };

export type ReviewPage = { items: Review[]; nextCursor: number | null };

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const PAGE_SIZE = 5;
const REVIEW_PAGE_SIZE = 3;

const names = [
  "Canvas Sneaker", "Linen Shirt", "Wool Beanie", "Leather Belt", "Denim Jacket",
  "Running Shoe", "Cotton Tee", "Rain Coat", "Silk Scarf", "Hiking Boot",
  "Chino Pants", "Knit Sweater", "Sun Hat",
];

const products: Product[] = names.map((name, index) => ({
  id: index + 1,
  name,
  price: 250 + index * 75,
  stock: (index * 7) % 12,
  isFavorite: false,
}));

const reviews: Review[] = products.flatMap((product) =>
  Array.from({ length: 7 }, (_, index) => ({
    id: product.id * 100 + index,
    productId: product.id,
    text: `Review ${index + 1} for ${product.name}`,
  })),
);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchProductPage(page: number, search: string): Promise<ProductPage> {
  await delay(500);
  const matches = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const start = (page - 1) * PAGE_SIZE;
  return {
    items: matches.slice(start, start + PAGE_SIZE).map((p) => ({ ...p })),
    hasMore: start + PAGE_SIZE < matches.length,
  };
}

export async function fetchProduct(id: number): Promise<Product> {
  await delay(400);
  const product = products.find((p) => p.id === id);
  if (!product) throw new HttpError(404, "Product not found");
  return { ...product };
}

export async function updateStock({ id, stock }: { id: number; stock: number }): Promise<Product> {
  await delay(600);
  if (stock < 0) throw new HttpError(422, "Stock cannot be negative");
  const product = products.find((p) => p.id === id);
  if (!product) throw new HttpError(404, "Product not found");
  product.stock = stock;
  return { ...product };
}

export async function toggleFavorite(id: number): Promise<Product> {
  await delay(800);
  // Yaklaşık dört istekten biri başarısız olsun; geri almayı görmek için
  if (Math.random() < 0.25) throw new HttpError(500, "Favorite could not be saved");
  const product = products.find((p) => p.id === id);
  if (!product) throw new HttpError(404, "Product not found");
  product.isFavorite = !product.isFavorite;
  return { ...product };
}

export async function fetchReviews(productId: number, cursor: number): Promise<ReviewPage> {
  await delay(500);
  const all = reviews.filter((r) => r.productId === productId);
  const items = all.slice(cursor, cursor + REVIEW_PAGE_SIZE);
  const next = cursor + REVIEW_PAGE_SIZE;
  return { items, nextCursor: next < all.length ? next : null };
}

export async function addReview({ productId, text }: { productId: number; text: string }): Promise<Review> {
  await delay(700);
  const review = { id: Date.now(), productId, text };
  reviews.unshift(review);
  return review;
}
