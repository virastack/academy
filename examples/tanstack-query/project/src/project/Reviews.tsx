import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addReview } from "./api";
import { reviewQueries } from "./queries";

export function Reviews({ productId }: { productId: number }) {
  const queryClient = useQueryClient();
  const { data, status, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
    useInfiniteQuery(reviewQueries.infinite(productId));

  const mutation = useMutation({
    mutationFn: addReview,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: reviewQueries.all(productId) }),
  });

  return (
    <section>
      <h3>Reviews</h3>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const text = String(new FormData(form).get("text")).trim();
          if (!text) return;
          mutation.mutate({ productId, text }, { onSuccess: () => form.reset() });
        }}
      >
        <input name="text" placeholder="Your review" />
        <button disabled={mutation.isPending}>Submit</button>
      </form>

      {mutation.isPending && <p style={{ opacity: 0.5 }}>{mutation.variables.text}</p>}
      {mutation.isError && (
        <p>
          {mutation.variables.text} could not be sent.{" "}
          <button onClick={() => mutation.mutate(mutation.variables)}>Try again</button>
        </p>
      )}

      {status === "pending" ? (
        <p>Loading reviews...</p>
      ) : status === "error" ? (
        <p>Reviews could not be loaded.</p>
      ) : (
        <>
          {data.pages.flatMap((page) => page.items).map((review) => (
            <p key={review.id}>{review.text}</p>
          ))}
          <button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetching}>
            {isFetchingNextPage ? "Loading..." : hasNextPage ? "Load more" : "That's all"}
          </button>
        </>
      )}
    </section>
  );
}
