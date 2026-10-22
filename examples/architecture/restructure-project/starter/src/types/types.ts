export type Product = {
  slug: string;
  name: string;
  price: number;
};

export type CartItem = Product & { quantity: number };
