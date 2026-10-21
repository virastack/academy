import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { fetchProduct, fetchProductPage, fetchReviews } from "./api";

export const productQueries = {
  all: () => ["products"] as const,
  lists: () => [...productQueries.all(), "list"] as const,
  list: (page: number, search: string) =>
    queryOptions({
      queryKey: [...productQueries.lists(), { page, search }],
      queryFn: () => fetchProductPage(page, search),
    }),
  details: () => [...productQueries.all(), "detail"] as const,
  detail: (id: number) =>
    queryOptions({
      queryKey: [...productQueries.details(), id],
      queryFn: () => fetchProduct(id),
    }),
};

export const reviewQueries = {
  all: (productId: number) => ["reviews", productId] as const,
  infinite: (productId: number) =>
    infiniteQueryOptions({
      queryKey: [...reviewQueries.all(productId), "infinite"],
      queryFn: ({ pageParam }) => fetchReviews(productId, pageParam),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
};
