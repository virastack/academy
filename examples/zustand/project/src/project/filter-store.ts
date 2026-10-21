import { create } from "zustand";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ProductFilters } from "./api";
import { productQueries } from "./queries";

type FilterState = ProductFilters & {
  actions: {
    setCategory: (category: ProductFilters["category"]) => void;
    setSearch: (search: string) => void;
    reset: () => void;
  };
};

const useFilterStore = create<FilterState>()((set, _get, store) => ({
  category: "all",
  search: "",
  actions: {
    setCategory: (category) => set({ category }),
    setSearch: (search) => set({ search }),
    reset: () => set(store.getInitialState()),
  },
}));

export const useCategory = () => useFilterStore((state) => state.category);
export const useSearch = () => useFilterStore((state) => state.search);
export const useFilterActions = () => useFilterStore((state) => state.actions);

export function useFilteredProducts() {
  const category = useCategory();
  const search = useSearch();
  return useQuery({
    ...productQueries.list({ category, search }),
    placeholderData: keepPreviousData,
  });
}
