import { findProductById } from './products';

export type CartItem = { productId: string; quantity: number };

const carts = new Map<string, CartItem[]>();

export function getCart(userId: string): CartItem[] {
  return carts.get(userId) ?? [];
}

export function addItem(userId: string, productId: string, quantity: number): CartItem[] {
  const product = findProductById(productId);
  if (!product) throw new Error(`Ürün bulunamadı: ${productId}`);
  if (!product.inStock) throw new Error(`Ürün stokta yok: ${productId}`);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5) throw new Error('Adet 1 ile 5 arasında olmalı.');

  const cart = [...getCart(userId)];
  const existing = cart.find((i) => i.productId === productId);
  if (existing) existing.quantity += quantity;
  else cart.push({ productId, quantity });
  carts.set(userId, cart);
  return cart;
}

export function resetCarts() {
  carts.clear();
}
