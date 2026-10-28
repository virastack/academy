export type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export const cartItems: CartItem[] = [
  { id: 1, name: "Wireless headphones", price: 750, quantity: 1 },
  { id: 2, name: "Phone case", price: 125, quantity: 2 },
];
