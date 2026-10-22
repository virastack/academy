export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  isFavorite: boolean;
};

export type Review = { id: number; author: string; text: string };

const products: Record<string, Product> = {
  "1": {
    id: "1",
    name: "Kablosuz kulaklık",
    price: 1499,
    description: "40 saat pil, aktif gürültü engelleme.",
    isFavorite: false,
  },
};

const reviews: Record<string, Review[]> = {
  "1": [{ id: 1, author: "Ayşe", text: "Sesi çok net." }],
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getProduct(id: string): Promise<Product> {
  await wait(800);
  const product = products[id];
  if (!product) throw new Error("Ürün bulunamadı.");
  return { ...product };
}

export async function getReviews(productId: string): Promise<Review[]> {
  await wait(1500);
  return [...(reviews[productId] ?? [])];
}

export async function setFavorite(id: string, value: boolean) {
  await wait(600);
  products[id] = { ...products[id], isFavorite: value };
}

export async function postReview(productId: string, review: Omit<Review, "id">) {
  await wait(700);
  const saved = { ...review, id: Date.now() };
  reviews[productId] = [...(reviews[productId] ?? []), saved];
  return saved;
}
