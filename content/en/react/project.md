---
title: "Product page"
description: "A product detail page with Suspense, Context, Actions, Activity and ViewTransition."
lastVerified: "2026-10-21"
translationKey: "react/project"
---

## Scenario

You are going to build a shop's product detail page. The page:

- Loads the product from a fake API; it shows a skeleton while loading and "Try again" on an error.
- Puts the product in the cart with **Add to cart**; the **Cart** button at the top opens a drawer that slides in.
- Fills in the heart with the **Add to favorites** button without waiting for the server.
- Keeps a review draft when you move between the **Details** and **Reviews** tabs.
- Shows an error message in the review form; a submitted review appears faded in the list before the answer arrives.

The goal is not the design but the pieces from the lessons working together. Where each piece comes from:

| Part | File | Lesson |
| :-- | :-- | :-- |
| The promise cache, `use`, `Suspense`, `ErrorBoundary` | `cache.ts`, `App.tsx`, `ProductPage.tsx` | Suspense and error boundaries |
| `useReducer` + two contexts + a custom hook | `cart.tsx` | State, Context, Custom hooks |
| `useOptimistic`, `startTransition` after an `await` | `FavoriteButton.tsx` | Actions and async updates |
| `useActionState`, `useFormStatus`, a form action | `Reviews.tsx` | Actions and async updates |
| Tabs with `<Activity>` | `ProductPage.tsx` | View Transition and Activity |
| The drawer with `<ViewTransition>` | `CartDrawer.tsx`, `styles.css` | View Transition and Activity |
| Resetting state with `key`, the `initial` prefix | `ProductPage.tsx` | Props and composition |

The working version is on GitHub: [examples/react/project](https://github.com/virastack/academy/tree/main/examples/react/project). Compare against it when you get stuck.

## Step 1: Set up the project

Create a [!vite] project as in the [Setup and tooling](/academy/react/setup-and-tooling) lesson, and add the error boundary package:[^1]

```command
npm create vite@latest product-page -- --template react-ts
```

```command
npm install react-error-boundary
```

Delete `src/App.tsx`, `src/App.css` and `src/index.css`. You will write every file under `src/project/`. Add `eslint-plugin-react-hooks` to ESLint as in the [Setup and tooling](/academy/react/setup-and-tooling) lesson and make the `lint` script in `package.json` `oxlint && eslint .`; it will catch a mistake in step 5.

## Step 2: A fake API and a promise cache

Use delayed functions instead of a real server. Having the reviews arrive more slowly than the product lets you see the difference the Suspense boundaries make.

```ts
// src/project/api.ts
export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  isFavorite: boolean;
};

export type Review = { id: number; author: string; text: string };

const products: Record<string, Product> = {
  "1": {
    id: "1",
    name: "Wireless headphones",
    price: 1499,
    description: "40 hours of battery, active noise cancelling.",
    isFavorite: false,
  },
};

const reviews: Record<string, Review[]> = {
  "1": [{ id: 1, author: "Jane", text: "The sound is very clear." }],
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getProduct(id: string): Promise<Product> {
  await wait(800);
  const product = products[id];
  if (!product) throw new Error("No products found.");
  return { ...product };
}

export async function getReviews(productId: string): Promise<Review[]> {
  await wait(1500);
  return [...(reviews[productId] ?? [])];
}

export async function setFavorite(id: string, value: boolean) {
  await wait(600);
  products[id] = { ...products[id], isFavorite: value };
}

export async function postReview(productId: string, review: Omit<Review, "id">) {
  await wait(700);
  const saved = { ...review, id: Date.now() };
  reviews[productId] = [...(reviews[productId] ?? []), saved];
  return saved;
}
```

`use` has to see the same promise on every render; otherwise the fallback keeps coming back.[^2] Keep the cache in a module of its own. `clearProduct` is there so that "Try again" can send a fresh request after an error.

```ts
// src/project/cache.ts
import { getProduct, getReviews, type Product, type Review } from "./api.ts";

const productCache = new Map<string, Promise<Product>>();
const reviewCache = new Map<string, Promise<Review[]>>();

export function fetchProduct(id: string) {
  let promise = productCache.get(id);
  if (!promise) {
    promise = getProduct(id);
    productCache.set(id, promise);
  }
  return promise;
}

export function fetchReviews(productId: string) {
  let promise = reviewCache.get(productId);
  if (!promise) {
    promise = getReviews(productId);
    reviewCache.set(productId, promise);
  }
  return promise;
}

export function clearProduct(id: string) {
  productCache.delete(id);
  reviewCache.delete(id);
}
```

## Step 3: The cart context

The cart is data read from all over the page that changes rarely: a good candidate for Context. The state and the `dispatch` sit in separate contexts, so the "Add to cart" button, which only uses `dispatch`, does not render when the cart changes.[^3]

```tsx
// src/project/cart.tsx
import { createContext, use, useReducer } from "react";
import type { Product } from "./api.ts";

type CartItem = { id: string; name: string; price: number; quantity: number };
type CartAction = { type: "add"; product: Product } | { type: "remove"; id: string };

function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add": {
      const existing = items.find((item) => item.id === action.product.id);
      if (existing) {
        return items.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      const { id, name, price } = action.product;
      return [...items, { id, name, price, quantity: 1 }];
    }
    case "remove":
      return items.filter((item) => item.id !== action.id);
  }
}

const CartContext = createContext<CartItem[] | null>(null);
const CartDispatchContext = createContext<React.Dispatch<CartAction> | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  return (
    <CartContext value={items}>
      <CartDispatchContext value={dispatch}>{children}</CartDispatchContext>
    </CartContext>
  );
}

export function useCartItems() {
  const items = use(CartContext);
  if (items === null) throw new Error("useCartItems must be used within CartProvider.");
  return items;
}

export function useCartDispatch() {
  const dispatch = use(CartDispatchContext);
  if (dispatch === null) throw new Error("useCartDispatch must be used within CartProvider.");
  return dispatch;
}
```

## Step 4: The favourite button

`useOptimistic` fills the heart in at once while the Action runs. When the Action finishes the value falls back to the real state; if the request fails, the heart returns to how it was on its own.[^4]

```tsx
// src/project/FavoriteButton.tsx
import { startTransition, useOptimistic, useState } from "react";
import { setFavorite } from "./api.ts";

type FavoriteButtonProps = { productId: string; initialFavorite: boolean };

export function FavoriteButton({ productId, initialFavorite }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(isFavorite);

  function toggle() {
    const next = !optimisticFavorite;
    startTransition(async () => {
      setOptimisticFavorite(next);
      await setFavorite(productId, next);
      startTransition(() => setIsFavorite(next));
    });
  }

  return (
    <button type="button" aria-pressed={optimisticFavorite} onClick={toggle}>
      {optimisticFavorite ? "♥ In favorites" : "♡ Add to favorites"}
    </button>
  );
}
```

Two details to notice:

- The prop is called `initialFavorite`: the value is only read on the first render. `ProductPage` gives the button `key={product.id}`, so the button is built again if the product changes.[^5]
- The `setIsFavorite` after the `await` is wrapped in `startTransition` again. The `useTransition` documentation asks for updates after an `await` to be wrapped this way; otherwise they are not marked as part of the transition.[^6]

## Step 5: Reviews

The review list is loaded with `use`; the form is submitted with `useActionState`, `useOptimistic` shows the new review before the answer arrives, and `useFormStatus` locks the button.[^7][^4][^8]

```tsx
// src/project/Reviews.tsx
import { use, useActionState, useOptimistic } from "react";
import { useFormStatus } from "react-dom";
import { postReview, type Review } from "./api.ts";
import { fetchReviews } from "./cache.ts";

type ReviewState = { reviews: Review[]; error: string | null };

export function Reviews({ productId }: { productId: string }) {
  const initialReviews = use(fetchReviews(productId));

  const [state, dispatchReview] = useActionState(
    async (previous: ReviewState, text: string): Promise<ReviewState> => {
      if (text.length < 3) {
        return { ...previous, error: "The review must be at least 3 characters." };
      }
      const saved = await postReview(productId, { author: "You", text });
      return { reviews: [...previous.reviews, saved], error: null };
    },
    { reviews: initialReviews, error: null },
  );

  const [optimisticReviews, addOptimisticReview] = useOptimistic(
    state.reviews,
    (reviews: Review[], pending: Review) => [...reviews, pending],
  );

  function submitReview(formData: FormData) {
    const text = String(formData.get("text")).trim();
    if (text.length >= 3) {
      addOptimisticReview({ id: -1, author: "You", text });
    }
    dispatchReview(text);
  }

  return (
    <section>
      <ul>
        {optimisticReviews.map((review) => (
          <li key={review.id} style={{ opacity: review.id === -1 ? 0.5 : 1 }}>
            <strong>{review.author}:</strong> {review.text}
          </li>
        ))}
      </ul>
      <form action={submitReview}>
        <textarea name="text" aria-label="Your review" />
        {state.error && <p role="alert">{state.error}</p>}
        <SubmitButton />
      </form>
    </section>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "Submitting..." : "Write a review"}</button>;
}
```

> [!WARNING]
>
> On a first attempt you may want to call `addOptimisticReview` directly inside the function given to `useActionState`. `eslint-plugin-react-hooks` catches that with the error *"Cannot access variable before it is declared"*: the function is defined before `useOptimistic`. The Oxlint in the template flags the same line with a `react(immutability)` warning. The fix is the one above: add the optimistic value in the form's `action` first, then call `dispatchReview`.

When the form action succeeds, React clears the `textarea` by itself.[^9]

## Step 6: The product page and the tabs

```tsx
// src/project/ProductPage.tsx
import { Activity, Suspense, use, useState } from "react";
import { fetchProduct } from "./cache.ts";
import { useCartDispatch } from "./cart.tsx";
import { FavoriteButton } from "./FavoriteButton.tsx";
import { Reviews } from "./Reviews.tsx";

type Tab = "details" | "reviews";

export function ProductPage({ id }: { id: string }) {
  const product = use(fetchProduct(id));
  const dispatch = useCartDispatch();
  const [tab, setTab] = useState<Tab>("details");

  return (
    <article>
      <h1>{product.name}</h1>
      <p>€{product.price.toLocaleString("en-US")}</p>
      <button type="button" onClick={() => dispatch({ type: "add", product })}>
        Add to cart
      </button>
      <FavoriteButton
        key={product.id}
        productId={product.id}
        initialFavorite={product.isFavorite}
      />

      <div role="tablist">
        <button role="tab" aria-selected={tab === "details"} onClick={() => setTab("details")}>
          Details
        </button>
        <button role="tab" aria-selected={tab === "reviews"} onClick={() => setTab("reviews")}>
          Reviews
        </button>
      </div>
      <Activity mode={tab === "details" ? "visible" : "hidden"}>
        <p>{product.description}</p>
      </Activity>
      <Activity mode={tab === "reviews" ? "visible" : "hidden"}>
        <Suspense fallback={<p>Loading reviews...</p>}>
          <Reviews productId={product.id} />
        </Suspense>
      </Activity>
    </article>
  );
}
```

The tabs are written with `<Activity>` instead of conditional rendering. That has two consequences:[^10]

- A draft typed into the review form is not lost when you move to the **Details** tab and back.
- The reviews tab is rendered at a lower priority even while hidden. The `Reviews` component starts fetching the reviews while hidden; by the time the user clicks the tab, the data is usually ready.

## Step 7: The sliding cart drawer

```tsx
// src/project/CartDrawer.tsx
import { startTransition, useState, ViewTransition } from "react";
import { useCartDispatch, useCartItems } from "./cart.tsx";

export function CartButton() {
  const items = useCartItems();
  const [isOpen, setIsOpen] = useState(false);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <button type="button" onClick={() => startTransition(() => setIsOpen(!isOpen))}>
        Cart ({count})
      </button>
      {isOpen && (
        <ViewTransition enter="slide-in" exit="slide-out">
          <CartDrawer />
        </ViewTransition>
      )}
    </>
  );
}

function CartDrawer() {
  const items = useCartItems();
  const dispatch = useCartDispatch();
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <aside className="cart-drawer" aria-label="Cart">
      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              {item.name} × {item.quantity}
              <button type="button" onClick={() => dispatch({ type: "remove", id: item.id })}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <p>Total: €{total.toLocaleString("en-US")}</p>
    </aside>
  );
}
```

```css
/* src/project/styles.css */
@keyframes slide-from-right {
  from { transform: translateX(100%); }
}
@keyframes slide-to-right {
  to { transform: translateX(100%); }
}
::view-transition-new(.slide-in) {
  animation: 250ms ease-out both slide-from-right;
}
::view-transition-old(.slide-out) {
  animation: 200ms ease-in both slide-to-right;
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

Because the drawer is opened with `startTransition`, the `<ViewTransition>` animation runs; with a plain `setIsOpen` it would not.[^11] The `prefers-reduced-motion` block turns the animation off for users who want less motion.

## Step 8: Put the pieces together

```tsx
// src/project/App.tsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { CartButton } from "./CartDrawer.tsx";
import { clearProduct } from "./cache.ts";
import { CartProvider } from "./cart.tsx";
import { ProductPage } from "./ProductPage.tsx";

const PRODUCT_ID = "1";

export default function App() {
  return (
    <CartProvider>
      <header>
        <CartButton />
      </header>
      <ErrorBoundary
        onReset={() => clearProduct(PRODUCT_ID)}
        fallbackRender={({ resetErrorBoundary }) => (
          <div role="alert">
            <p>Product could not be loaded.</p>
            <button onClick={resetErrorBoundary}>Try again</button>
          </div>
        )}
      >
        <Suspense fallback={<p>Loading product...</p>}>
          <ProductPage id={PRODUCT_ID} />
        </Suspense>
      </ErrorBoundary>
    </CartProvider>
  );
}
```

Update the imports in `src/main.tsx`:

```tsx
import App from "./project/App.tsx";
import "./project/styles.css";
```

Open it with `npm run dev`. Try this sequence: the skeleton while the page loads, "Add to cart" twice, open the cart, favourite it, the reviews tab, a two-letter review *(an error)*, then a real one *(faded first, then normal)*.

Finally, check:

```bash
npm run lint
npm run build
```

> [!TIP]
>
> In React DevTools' Profiler, look at which components render as you add a product to the cart. You should see that `ProductPage` does not render when the cart changes; it only reads `dispatch`.

## Try it yourself

- Change `getProduct` in `api.ts` so that it throws on the first call; see that "Try again" works on the second attempt thanks to `clearProduct`. Then delete `onReset` and try again.
- Change `setFavorite` so that it always throws. What does the heart do? What would you add to show the error to the user?
- Use `{tab === "reviews" && ...}` instead of `<Activity>` for the tabs; what happened to the review draft and to the loading time?
- Add a `+` button in the cart drawer that raises an item's quantity: write an `increment` action in the reducer.
- Add the product image and animate a shared element from the product list to the detail page with `` <ViewTransition name={`product-${id}`}> ``.

## Sources

1. [react-error-boundary](https://github.com/bvaughn/react-error-boundary) *(repo)* — `fallbackRender`, `onReset` and `resetKeys`.
2. [React: use](https://react.dev/reference/react/use) *(doc)* — Promises having to be cached, and a module-level cache example.
3. [React: Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context) *(doc)* — Putting the state and `dispatch` in separate contexts.
4. [React: useOptimistic](https://react.dev/reference/react/useOptimistic) *(doc)* — The optimistic value for the duration of an Action, and use with a reducer.
5. [React: Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure) *(doc)* — Deliberately taking a prop into state with the `initial` prefix.
6. [React: useTransition](https://react.dev/reference/react/useTransition) *(doc)* — Wrapping updates after an `await` in `startTransition` again.
7. [React: useActionState](https://react.dev/reference/react/useActionState) *(doc)* — The Action's result and error state through an async reducer.
8. [React: useFormStatus](https://react.dev/reference/react-dom/hooks/useFormStatus) *(doc)* — Reading the parent form's pending state.
9. [React: form](https://react.dev/reference/react-dom/components/form) *(doc)* — Uncontrolled fields resetting after a successful form action.
10. [React: Activity](https://react.dev/reference/react/Activity) *(doc)* — A hidden part keeping its state and being pre-rendered.
11. [React: ViewTransition](https://react.dev/reference/react/ViewTransition) *(doc)* — The animation only being triggered by a Transition, and View Transition Classes.
