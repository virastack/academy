import { getProduct, getReviews, type Product, type Review } from "./api.ts";

const productCache = new Map<string, Promise<Product>>();
const reviewCache = new Map<string, Promise<Review[]>>();

export function fetchProduct(id: string) {
  let promise = productCache.get(id);
  if (!promise) {
    promise = getProduct(id);
    productCache.set(id, promise);
  }
  return promise;
}

export function fetchReviews(productId: string) {
  let promise = reviewCache.get(productId);
  if (!promise) {
    promise = getReviews(productId);
    reviewCache.set(productId, promise);
  }
  return promise;
}

export function clearProduct(id: string) {
  productCache.delete(id);
  reviewCache.delete(id);
}
