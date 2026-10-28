---
title: "Server and Client Components"
description: "The 'use client' boundary, composition, serialisation and server-only."
lastVerified: "2026-10-21"
translationKey: "nextjs/server-and-client-components"
---

## Two environments, one tree

In the App Router, layouts and pages are **Server Components** by default. They run on the server, can reach the database directly and send no JavaScript to the browser. When you need interaction, you add a **Client Component** to the tree.[^1]

| Server Component | Client Component |
| :-- | :-- |
| Fetching data, using the database and API keys | `useState`, `onClick`, `onChange` |
| Reducing the JavaScript sent to the browser | `useEffect` and custom hooks |
| Streaming content from the server | Browser APIs such as `localStorage` and `window` |

[Josh W. Comeau](https://www.joshwcomeau.com/)'s mental model helps: Server Components run **only on the server and only once**, and are never re-rendered. That is why they have no state and no Effects. Client Components are the React you have been writing all along; they are rendered once on the server for the HTML, and then live in the browser.[^2]

## 'use client' is a door

`"use client"` marks not a component but a **module boundary**. It goes at the top of the file; that file, everything it imports and the components it renders directly all go into the client bundle.[^1]

```tsx
// components/like-button.tsx
"use client";

import { useState } from "react";

export function LikeButton({ initialLikes }: { initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes);
  return <button onClick={() => setLikes(likes + 1)}>{likes} likes</button>;
}
```

```tsx
// app/products/[slug]/page.tsx
import { LikeButton } from "@/components/like-button";

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProduct(slug);

  return (
    <article>
      <h1>{product?.name}</h1>
      <LikeButton initialLikes={12} />
    </article>
  );
}
```

[Dan Abramov](https://overreacted.io/) sums the two directives up like this: `"use client"` is a typed `<script>` tag, `"use server"` is a typed `fetch` call. Both say how a module should look from the other environment.[^3]

> [!DO]
>
> - Put `"use client"` at the **leaves** of the tree: the search box, the like button, the cart drawer.
> - Leave the rest of the page as Server Components; the client bundle stays small.[^1]

> [!DONT]
>
> - Writing `"use client"` at the top of `page.tsx` because you got a hook error. The whole page and everything it imports move to the client.

## Composition: putting the server inside the client

A Client Component **cannot import** a Server Component; everything it imports becomes client code. But it can **receive** one as `children` or as another prop. The Server Component is rendered on the server and the Client Component only places the finished result.[^1]

```tsx
// components/drawer.tsx
"use client";

import { useState } from "react";

export function Drawer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(!open)}>Cart</button>
      {open && <div role="dialog">{children}</div>}
    </>
  );
}
```

```tsx
// inside app/layout.tsx
<Drawer>
  <CartItems /> {/* Server Component: reads the cart on the server */}
</Drawer>
```

[Aurora Scharff](https://aurorascharff.no/) recommends this as a design rule: move the interaction *(opening and closing, animation, scrolling)* into small client wrappers and leave the data and the content on the server side. The wrapper becomes reusable and the data fetching does not drift to the client.[^4]

## What crosses the boundary

Props that go from the server to the client travel over the network, so they have to be **serialisable**.[^5]

| Crosses | Does not cross |
| :-- | :-- |
| string, number, boolean, `null` | An ordinary function *(`onClick={() => ...}`)* |
| Plain objects and arrays, `Map`, `Set`, `Date` | A class instance |
| JSX *(the result of a component)* | `Symbol()` |
| A promise *(read with `use` on the client)* | |
| A Server Function *(`"use server"`)* | |

Because a function cannot cross, you write event handlers inside the Client Component. When you need work done on the server, you use [Server Actions](/academy/nextjs/server-actions).

## Context and third-party components

There is no Context in a Server Component. For shared state such as the theme or the cart, put the provider in a Client Component and use it in the layout. Putting the provider **as deep as possible** in the tree makes it easier for Next.js to optimise the static parts.[^1]

```tsx
// components/theme-provider.tsx
"use client";

import { createContext } from "react";

export const ThemeContext = createContext<"light" | "dark">("light");

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext value="dark">{children}</ThemeContext>;
}
```

A library component that uses `useState` but has no `"use client"` in its file fails in a Server Component. The fix is to re-export it from a file of your own with `"use client"`.[^1]

## Keeping server code on the server

The same module can be imported in both environments. To stop a function that reads an API key from ending up on the client by accident, put `server-only` at the top of the file; the build then fails if a Client Component imports it.[^1]

```ts
// lib/products.ts
import "server-only";

export async function getProduct(slug: string) {
  // process.env.API_KEY is safe here
}
```

Environment variables work by the same rule: only the ones starting with `NEXT_PUBLIC_` go into the client bundle, and the rest are an empty string on the client.[^1]

> [!CAUTION]
>
> Do not pass a whole database row from a Server Component to a Client Component as a prop. Props are visible in the page source. The Next.js security guide recommends returning small objects *(DTOs)* that carry only the fields the client needs.[^6]

## Try it yourself

- Delete `"use client"` from `LikeButton`. Read the error message.
- Pass an `onLike={() => {}}` prop from `ProductPage` to `LikeButton`. Which error appears?
- Add a `console.log` to a Server Component. Is the output in the terminal or in the browser console? Try the same in `LikeButton`.
- Import and use `CartItems` inside `Drawer`'s file, then pass it as `children`. What happens in the first case?
- Add `import "server-only"` to `lib/products.ts` and import it from a Client Component.

## Going deeper

- **Article:** [Josh W. Comeau](https://www.joshwcomeau.com/), "Making Sense of React Server Components"; one of the plainest accounts of why Server Components exist.[^2]
- **Article:** [Dan Abramov](https://overreacted.io/), "What Does 'use client' Do?" and "Impossible Components"; how the directives relate to the module system, and components that join the two environments.[^3][^7]
- **Article:** [Aurora Scharff](https://aurorascharff.no/), "Server and Client Component Composition in Practice"; composition examples from real interfaces.[^4]
- **Official docs:** the "The Server and Client Boundary" guide; it walks through where each kind of component runs and how the boundary works.[^8]

## Sources

1. [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) *(doc)* — Which one when, the `"use client"` boundary, composition, context providers, third-party components and `server-only`.
2. [Josh W. Comeau](https://www.joshwcomeau.com/): [Making Sense of React Server Components](https://www.joshwcomeau.com/react/server-components/) *(article)* — 2023, updated November 2024. Server Components running only on the server and never being re-rendered.
3. [Dan Abramov](https://overreacted.io/): [What Does "use client" Do?](https://overreacted.io/what-does-use-client-do/) *(article)* — April 25, 2025. What `"use client"` and `"use server"` mean in terms of the module system.
4. [Aurora Scharff](https://aurorascharff.no/): [Server and Client Component Composition in Practice](https://aurorascharff.no/posts/server-client-component-composition-in-practice/) *(article)* — August 5, 2025. Composition patterns with client wrappers and Suspense.
5. [React: 'use client'](https://react.dev/reference/rsc/use-client) *(doc)* — The module boundary and the serialisable prop types.
6. [Next.js: Data Security](https://nextjs.org/docs/app/guides/data-security) *(doc)* — The Data Access Layer, DTOs, tainting and not leaking data to the client.
7. [Dan Abramov](https://overreacted.io/): [Impossible Components](https://overreacted.io/impossible-components/) *(article)* — April 22, 2025. Joining server data and client interaction in a single component.
8. [Next.js: The Server and Client Boundary](https://nextjs.org/docs/app/guides/server-and-client-boundary) *(doc)* — Where each kind of component runs and how the boundary works.
