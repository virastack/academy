import { queryOptions } from "@tanstack/react-query";
import { fetchProducts, type ProductFilters } from "./api";

export const productQueries = {
  all: () => ["products"] as const,
  list: (filters: ProductFilters) =>
    queryOptions({
      queryKey: [...productQueries.all(), "list", filters],
      queryFn: () => fetchProducts(filters),
    }),
};
