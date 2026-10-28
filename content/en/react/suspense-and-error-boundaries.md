---
title: "Suspense and error boundaries"
description: "The loading state, reading a promise with use, and the Error Boundary."
lastVerified: "2026-10-21"
translationKey: "react/suspense-and-error-boundaries"
---

## Declaring the loading state in the tree

Instead of holding an `isLoading` state in every component and showing a spinner, you tell React *"show this until that part is ready"*. That line is called a **Suspense boundary**:[^1]

```tsx
<Suspense fallback={<ProductSkeleton />}>
  <ProductDetails id={productId} />
</Suspense>
```

If any component inside is not ready yet, React shows the nearest boundary's `fallback` and reveals the content once it is. These are what make a boundary wait:[^1]

- The code of a component loaded with `lazy`.
- A promise read with `use`; that includes data from Server Components, and a framework or library that supports Suspense *(TanStack Query's `useSuspenseQuery`, for instance)*.
- A stylesheet given a `precedence`.

> [!WARNING]
>
> Suspense **does not detect** data fetched inside an Effect. If you fetch with `useEffect` + `setState`, the boundary waits for nothing.[^1]

## Reading a promise with use

`use` reads the value of a promise during render. If the promise is pending, the component *suspends* and Suspense takes over; if it is rejected, it goes to the nearest Error Boundary.[^2]

```tsx
import { Suspense, use } from "react";

const cache = new Map<string, Promise<Product>>();

export function fetchProduct(id: string) {
  let promise = cache.get(id);
  if (!promise) {
    promise = fetch(`/api/products/${id}`).then((r) => r.json() as Promise<Product>);
    cache.set(id, promise);
  }
  return promise;
}

function ProductDetails({ id }: { id: string }) {
  const product = use(fetchProduct(id));
  return <h1>{product.name}</h1>;
}
```

The most important rule: the promise has to be **cached**. Write `use(fetch(...))` inside render and every render creates a new promise, so the fallback keeps coming back.[^2]

The `Map` above is enough to show the rule, but it is not a real cache: it does not retry a failed request, does not refresh the data and never removes anything. The React documentation also recommends letting the framework or a Suspense-aware library manage the promises.[^2][^1] In practice you mostly meet `use` when reading a promise a Server Component passed to a client component in Next.js, or inside a library.

## Where to put the boundaries

Boundaries are a design decision. The React documentation's advice: do not wrap every component separately; design the loading sequence you want the user to see, and place the boundaries accordingly.[^1]

```tsx
<Suspense fallback={<PageSkeleton />}>
  <ProductHeader id={id} />
  <ProductGallery id={id} />
  <Suspense fallback={<ReviewsSkeleton />}>
    <Reviews id={id} />
  </Suspense>
</Suspense>
```

The header and the gallery appear together; if the reviews are slower they do not hold up the page but show their own skeleton. Had each piece had its own boundary, the screen would have filled in bursts *(popcorn UI)*.

**Watch out for waterfalls.** In React 19, when a component suspends React shows the fallback immediately and prepares the siblings afterwards. [TkDodo](https://tkdodo.eu/) explains that with this change, in code where siblings in the same boundary start their own fetches during render, the requests can go sequentially rather than in parallel.[^3] The React team's advice is the same: start the data as early as possible rather than deep inside a component — in the route loader, on the server or in the parent.[^4]

**Do not hide content that is already visible.** If a skeleton suddenly replaces the page when the user clicks a tab, make the update with `startTransition`; React keeps the old content on screen while it prepares the new one. Routers already perform navigation as a transition.[^1]

## Code splitting: lazy

To load a component only when it is needed, use `lazy`; the nearest Suspense fallback appears while it loads:[^5]

```tsx
import { lazy, Suspense } from "react";

const SizeGuide = lazy(() => import("./SizeGuide.tsx"));

{isGuideOpen && (
  <Suspense fallback={<Spinner />}>
    <SizeGuide />
  </Suspense>
)}
```

`lazy` is always called outside the component, at module level. When splitting is worth it is covered in the [Bundle size](/academy/performance-accessibility/bundle-size) lesson.

## Error Boundary

An error thrown during render turns the whole application into a blank screen unless there is an **Error Boundary**. An Error Boundary can still only be written as a class component today; the React documentation recommends the `react-error-boundary` package instead.[^6]

```command
npm install react-error-boundary
```

```tsx
import { ErrorBoundary } from "react-error-boundary";

<ErrorBoundary
  fallbackRender={({ resetErrorBoundary }) => (
    <div role="alert">
      <p>Product could not be loaded.</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )}
  resetKeys={[productId]}
>
  <Suspense fallback={<ProductSkeleton />}>
    <ProductDetails id={productId} />
  </Suspense>
</ErrorBoundary>
```

When `resetKeys` changes *(the user moves to another product)*, the boundary resets itself.[^7] Place the Error Boundary by the design too, as you do with Suspense: the product page should not collapse when the reviews fail.

An Error Boundary does not catch every error. Errors thrown in event handlers, and in asynchronous code that runs after the render has finished, are outside it.[^6] Either write those into state and display them, or pass them to the boundary with `useErrorBoundary`'s `showBoundary` function.[^7] [Kent C. Dodds](https://kentcdodds.com/) covers the package and the `showBoundary` pattern in an article of its own.[^8] Errors thrown in Actions inside `startTransition` are the exception and do reach the Error Boundary; that comes in the next lesson.[^9]

> [!DONT]
>
> - Wrapping JSX in a `try/catch`. A render error is not caught there; `eslint-plugin-react-hooks`'s `error-boundaries` rule warns about it.[^10]

## Rendering in the browser only

In an application that uses server rendering, some components cannot produce anything meaningful on the server *(`localStorage`, the user's time zone)*. React 19.3 added `use(browser())` for this: the component suspends on the server, the nearest Suspense fallback goes into the HTML, and it renders normally in the browser. It replaces the old `mounted` state plus Effect pattern.[^11] In an SPA written with Vite there is no server render, so you will not need it.

## Try it yourself

- In `ProductDetails`, write `use(fetch(...).then(...))` instead of `use(fetchProduct(id))` and watch what happens.
- Add a 2-second delay to the fake API. Try the reviews in the same boundary first, then in a boundary of their own.
- Make the API return an error; compare the page with and without an Error Boundary.
- Why does the "Try again" button keep giving the same error? *(Hint: the cache.)* Write a fix that removes the failed promise from the cache.

## Going deeper

- **Official docs:** the `<Suspense>` reference; revealing boundaries together or nested, showing old content, and resetting on navigation.[^1]
- **Article:** [TkDodo](https://tkdodo.eu/)'s "A Drama in 3 Acts" on the Suspense change in React 19.[^3]
- **Video:** [Ricky Hanlon](https://github.com/rickhanlonii)'s "Async React" talk; how Suspense, transitions and optimistic state work together *(React Conf 2025, day 1)*.[^12]
- **Article:** [Kent C. Dodds](https://kentcdodds.com/)'s article on `react-error-boundary`.[^8]

## Sources

1. [React: Suspense](https://react.dev/reference/react/Suspense) *(doc)* — What activates Suspense, data in an Effect not being detected, boundary placement, and showing old content with a transition.
2. [React: use](https://react.dev/reference/react/use) *(doc)* — Reading a promise, the warning about an uncached promise, and showing errors with an Error Boundary.
3. [TkDodo](https://tkdodo.eu/): [React 19 and Suspense - A Drama in 3 Acts](https://tkdodo.eu/blog/react-19-and-suspense-a-drama-in-3-acts) *(article)* — June 16, 2024. Siblings no longer being pre-rendered, and parallel requests turning sequential.
4. [React: Build a React App from Scratch, Data Fetching](https://react.dev/learn/build-a-react-app-from-scratch#data-fetching) *(doc)* — Fetching inside a component leading to waterfalls; the advice to prefetch in a route loader or on the server.
5. [React: lazy](https://react.dev/reference/react/lazy) *(doc)* — Loading a component's code on first render, and defining it at module level.
6. [React: Component, Catching rendering errors with an Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) *(doc)* — An Error Boundary requiring a class, the errors it does not catch, and the `react-error-boundary` recommendation.
7. [react-error-boundary](https://github.com/bvaughn/react-error-boundary) *(repo)* — `fallbackRender`, `resetKeys` and `useErrorBoundary`. Checked against version 6.1.
8. [Kent C. Dodds](https://kentcdodds.com/): [Use react-error-boundary to handle errors in React](https://kentcdodds.com/blog/use-react-error-boundary-to-handle-errors-in-react) *(article)* — July 20, 2020. Using the package, and passing event handler errors to the boundary.
9. [React: useTransition](https://react.dev/reference/react/useTransition) *(doc)* — Errors inside a transition being shown by an Error Boundary.
10. [React: error-boundaries lint](https://react.dev/reference/eslint-plugin-react-hooks/lints/error-boundaries) *(doc)* — An Error Boundary rather than `try/catch` for errors in child components.
11. [React: browser](https://react.dev/reference/react-dom/browser) *(doc)* — `use(browser())` in React 19.3; suspending on the server and the Suspense requirement.
12. [Ricky Hanlon: Async React Part I (React Conf 2025)](https://www.youtube.com/watch?v=zyVRg2QR6LA&t=10907s) *(video)* — Day 1 stream. An async interface built with transitions, Suspense and optimistic updates.
