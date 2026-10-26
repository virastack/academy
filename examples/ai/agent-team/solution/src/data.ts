export type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export const cartItems: CartItem[] = [
  { id: 1, name: "Kablosuz kulaklık", price: 750, quantity: 1 },
  { id: 2, name: "Telefon kılıfı", price: 125, quantity: 2 },
];
