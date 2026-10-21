import { create, type StateCreator } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { Product } from "./api";

export type CartItem = Pick<Product, "id" | "name" | "price"> & { quantity: number };

type CartSlice = {
  items: Record<number, CartItem>;
  addItem: (product: Product) => void;
  setQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
};

type UiSlice = {
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

type SharedSlice = {
  addToCart: (product: Product) => void;
};

type ShopState = CartSlice & UiSlice & SharedSlice;

type Mutators = [["zustand/devtools", never], ["zustand/persist", unknown]];

const createCartSlice: StateCreator<ShopState, Mutators, [], CartSlice> = (set) => ({
  items: {},
  addItem: (product) =>
    set(
      (state) => {
        const quantity = (state.items[product.id]?.quantity ?? 0) + 1;
        const { id, name, price } = product;
        return { items: { ...state.items, [id]: { id, name, price, quantity } } };
      },
      undefined,
      "cart/addItem",
    ),
  setQuantity: (id, quantity) =>
    set(
      (state) => {
        const item = state.items[id];
        if (!item) return {};
        if (quantity < 1) {
          const { [id]: _removed, ...rest } = state.items;
          return { items: rest };
        }
        return { items: { ...state.items, [id]: { ...item, quantity } } };
      },
      undefined,
      "cart/setQuantity",
    ),
  removeItem: (id) =>
    set(
      (state) => {
        const { [id]: _removed, ...rest } = state.items;
        return { items: rest };
      },
      undefined,
      "cart/removeItem",
    ),
  clearCart: () => set({ items: {} }, undefined, "cart/clearCart"),
});

const createUiSlice: StateCreator<ShopState, Mutators, [], UiSlice> = (set) => ({
  isCartOpen: false,
  openCart: () => set({ isCartOpen: true }, undefined, "ui/openCart"),
  closeCart: () => set({ isCartOpen: false }, undefined, "ui/closeCart"),
});

const createSharedSlice: StateCreator<ShopState, Mutators, [], SharedSlice> = (_set, get) => ({
  addToCart: (product) => {
    get().addItem(product);
    get().openCart();
  },
});

const useShopStore = create<ShopState>()(
  devtools(
    persist(
      (...a) => ({
        ...createCartSlice(...a),
        ...createUiSlice(...a),
        ...createSharedSlice(...a),
      }),
      {
        name: "shop-cart",
        version: 1,
        partialize: (state) => ({ items: state.items }),
      },
    ),
    { name: "ShopStore" },
  ),
);

export const useCartItemIds = () =>
  useShopStore(useShallow((state) => Object.keys(state.items).map(Number)));
export const useCartItem = (id: number) => useShopStore((state) => state.items[id]);
export const useCartQuantity = (id: number) =>
  useShopStore((state) => state.items[id]?.quantity ?? 0);
export const useCartCount = () =>
  useShopStore((state) =>
    Object.values(state.items).reduce((sum, item) => sum + item.quantity, 0),
  );
export const useCartTotal = () =>
  useShopStore((state) =>
    Object.values(state.items).reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
export const useIsCartOpen = () => useShopStore((state) => state.isCartOpen);

export const useShopActions = () =>
  useShopStore(
    useShallow((state) => ({
      addToCart: state.addToCart,
      setQuantity: state.setQuantity,
      removeItem: state.removeItem,
      clearCart: state.clearCart,
      openCart: state.openCart,
      closeCart: state.closeCart,
    })),
  );
