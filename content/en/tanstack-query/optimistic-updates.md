---
title: "Optimistic updates"
description: "Optimistic updates through variables and through the cache, rolling back, and concurrency."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/optimistic-updates"
---

## When you need it

An **optimistic update** means assuming the mutation will succeed and showing the result before the server answers. When the answer arrives you swap in the real data; if it fails, you roll back.[^1]

[TkDodo](https://tkdodo.eu/) thinks the technique is overused. The two conditions he suggests:[^2]

- The mutation should **rarely** fail. Rolling back is a poor experience for the user.
- Instant feedback should **really** be needed. Small changes such as a favourite button or a to-do checkbox are good candidates.

Make a dialog that closes, or a form that navigates away, optimistic, and rolling back on an error is very hard. Imitating the server's logic on the client is not easy either: where will the new record's id come from, and where will it land in a sorted list?[^2] In most cases disabling the button and showing a loading state is enough.

The documentation suggests two ways: through the interface and through the cache.[^1]

## Through the interface: variables

The simplest way is not to touch the cache at all. While the mutation is in flight you still have the `variables`, so you show them as a temporary row:[^1]

```tsx
function ReviewList({ productId }: { productId: number }) {
  const queryClient = useQueryClient();
  const reviews = useQuery(reviewQueries.list(productId));

  const addReview = useMutation({
    mutationFn: (text: string) => postReview(productId, text),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: reviewQueries.list(productId).queryKey }),
  });

  return (
    <ul>
      {reviews.data?.map((review) => <li key={review.id}>{review.text}</li>)}
      {addReview.isPending && <li style={{ opacity: 0.5 }}>{addReview.variables}</li>}
      {addReview.isError && (
        <li>
          {addReview.variables}{" "}
          <button onClick={() => addReview.mutate(addReview.variables)}>Try again</button>
        </li>
      )}
    </ul>
  );
}
```

Because `onSettled` returns the invalidation's promise, the mutation stays `pending` until the refreshed list arrives. The real row therefore takes the faded row's place the moment it disappears. On an error the `variables` are not discarded, and the "Try again" button sends the same value again.[^1] You never write any rollback code.

When the mutation and the list are in different components, give the mutation a `mutationKey` and read it in the list with `useMutationState`:[^1]

```ts
const pendingReviews = useMutationState({
  filters: { mutationKey: ["add-review", productId], status: "pending" },
  select: (mutation) => mutation.state.variables as string,
});
```

`useMutationState` returns an array; more than one review may be in flight at once.[^1]

## Through the cache: onMutate

When the optimistic value will appear in more than one place on screen *(the list, a counter, the detail)*, update the cache directly. The pattern has four steps:[^1]

```ts
useMutation({
  mutationFn: toggleFavorite,
  onMutate: async (productId: number, context) => {
    const queryKey = productQueries.detail(productId).queryKey;

    // 1. Cancel the in-flight requests so they do not overwrite the optimistic value
    await context.client.cancelQueries({ queryKey });

    // 2. Keep the current value so it can be rolled back
    const previous = context.client.getQueryData(queryKey);

    // 3. Write the optimistic value
    context.client.setQueryData(queryKey, (old) =>
      old ? { ...old, isFavorite: !old.isFavorite } : old,
    );

    return { previous, queryKey };
  },
  // 4a. Roll back on an error
  onError: (_error, _productId, onMutateResult, context) => {
    if (onMutateResult) {
      context.client.setQueryData(onMutateResult.queryKey, onMutateResult.previous);
    }
  },
  // 4b. Sync with the server either way
  onSettled: (_data, _error, productId, _onMutateResult, context) =>
    context.client.invalidateQueries({ queryKey: productQueries.detail(productId).queryKey }),
});
```

The object `onMutate` returns arrives in the other callbacks as `onMutateResult`. `context.client` is the same `QueryClient`, so you do not have to call `useQueryClient()` in the component.[^1][^3] Because you are using the key from `queryOptions`, the types of `getQueryData` and `setQueryData` come out right too.

## The two ways compared

| | With `variables` | With the cache |
| :-- | :-- | :-- |
| Amount of code | Little | More |
| Rolling back | Not needed | By hand in `onError` |
| Where the optimistic value appears | Only where the mutation is read | Everywhere the query is used |
| When | The value appears in a single place | More than one part of the screen is affected |

The documentation comes to the same conclusion: `variables` for a single place, the cache for more than one.[^1]

## Concurrent mutations

If the user presses the favourite button three times in a row, three mutations run at once. TkDodo describes an **inconsistency window** here: when the first mutation finishes and starts an invalidation, if the second has not finished yet and the refetch comes back faster than it, the interface flips back to the old value for a moment.[^4]

Two measures remove that flicker:[^4]

- `cancelQueries` in `onMutate`: the in-flight queries are cancelled when the mutation starts.
- In `onSettled`, only the **last** mutation invalidates. Because your own mutation still counts, the check is `=== 1`:

```ts
useMutation({
  mutationKey: ["toggle-favorite"],
  mutationFn: toggleFavorite,
  onSettled: (_data, _error, productId, _onMutateResult, context) => {
    if (context.client.isMutating({ mutationKey: ["toggle-favorite"] }) === 1) {
      return context.client.invalidateQueries({
        queryKey: productQueries.detail(productId).queryKey,
      });
    }
  },
});
```

Make that check with `isMutating` at that moment rather than with the `useIsMutating` hook; the hook's value can be stale inside a callback.[^4]

## How it differs from React's useOptimistic

React 19's `useOptimistic` writes a temporary value into React state for the duration of an Action *(see [Actions and async updates](/academy/react/actions))*. If your server state is in the TanStack Query cache, keep the optimistic value there too; two separate optimistic copies of the same data can fall out of sync.

## Try it yourself

- Write the favourite button without the optimistic update first and add a one-second delay to the API. How does pressing the button feel?
- Apply the `variables` approach to a review list. Make the API fail on every third request and try "Try again".
- Set up the cache approach and delete the `cancelQueries` line. Try to catch the flicker by coming back to the tab and pressing the button straight away.

## Going deeper

- **Official docs:** "Optimistic Updates"; `variables`, `useMutationState`, and rollback examples with the cache.[^1]
- **Article:** [TkDodo](https://tkdodo.eu/), "Concurrent Optimistic Updates in React Query"; the inconsistency window, cancellation and limited invalidation.[^4]
- **Article:** [TkDodo](https://tkdodo.eu/), "Mastering Mutations in React Query"; when an optimistic update is not needed.[^2]

## Sources

1. [TanStack Query: Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) *(doc)* — The interface and cache approaches, `useMutationState`, rolling back, and which one to use when.
2. [TkDodo](https://tkdodo.eu/): [Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query) *(article)* — October 9, 2021. Optimistic updates being overused, and the cases that are hard to roll back.
3. [TanStack Query: Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations) *(doc)* — The callback signatures, `onMutateResult` and `context.client`.
4. [TkDodo](https://tkdodo.eu/): [Concurrent Optimistic Updates in React Query](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) *(article)* — April 28, 2025. The inconsistency window, `cancelQueries`, and limited invalidation with `isMutating`.
