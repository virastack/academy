---
title: "Utility types"
description: "Deriving types with keyof, typeof, Partial, Pick, Omit and Record."
lastVerified: "2026-10-17"
translationKey: "typescript/utility-types"
---

## Why derive types

You have a `Product` type in the shop. For the product edit form you will want "the same fields but all optional", and for the cart "a few of the product's fields plus a quantity". Write those by hand and you will forget to update them the day you add a field to `Product`.

The answer is to derive types from **a single source**. TypeScript offers operators that produce a new type from an existing type or value, along with ready-made **utility types**.[^1][^2] Everything in this lesson works off this one type:

```ts
const categories = ["electronics", "books", "home"] as const;
type Category = (typeof categories)[number]; // "electronics" | "books" | "home"

type Product = {
  id: number;
  name: string;
  price: number;
  category: Category;
  description: string;
};
```

The first two lines are unpacked step by step below.

## keyof, typeof and indexed access

### keyof

`keyof` gives you an object type's keys as a union of string literals:[^3]

```ts
type ProductKey = keyof Product; // "id" | "name" | "price" | "category" | "description"

const key: ProductKey = "nmae";
// Error: Type '"nmae"' is not assignable to type 'keyof Product'.
```

A `sortBy(products, key)` function whose parameter is `keyof Product` now only accepts field names that really exist.

### typeof (in a type position)

JavaScript's `typeof` returns a string at runtime. TypeScript gives a `typeof` written **in a type position** a second meaning: it takes the type of a variable.[^4] That lets you produce a type from a value:

```ts
const defaultFilters = {
  category: "electronics",
  maxPrice: 5000,
  inStockOnly: true,
};

type Filters = typeof defaultFilters;
// { category: string; maxPrice: number; inStockOnly: boolean }
```

`typeof` only works with variable names and their fields; you cannot put a function call inside it.[^4]

### Indexed access

`Product["price"]` reads the type of a field. You can also put a union inside the square brackets:[^5]

```ts
type Price = Product["price"]; // number
type NameOrPrice = Product["name" | "price"]; // string | number
```

On an array, using `number` as the index gives you the element type. The line at the start of this lesson is these three pieces combined: `as const` fixes the array's elements as literal types, `typeof` takes the array's type, and `[number]` produces the union of its elements.[^5][^2]

```ts
const categories = ["electronics", "books", "home"] as const;
type Category = (typeof categories)[number];
```

Add a new category to the array and the `Category` type updates itself; the same array is also used at runtime to produce the options of a `<select>`.

## The built-in utility types

The ones TypeScript provides globally, and that you will reach for most:[^1]

| Type | What it does | Example |
| :-- | :-- | :-- |
| `Partial<T>` | Makes every field optional | An edit form |
| `Required<T>` | Makes every field required | After the defaults are filled in |
| `Readonly<T>` | Makes the fields `readonly` | Data that must not change |
| `Pick<T, K>` | Takes only the chosen fields | A cart item |
| `Omit<T, K>` | Removes the chosen fields | A new product without an `id` |
| `Record<K, V>` | An object keyed by `K` with values of `V` | Stock per category |
| `Exclude<U, M>` | Removes members from a union | The open order statuses |
| `Extract<U, M>` | Takes the matching members of a union | The closed order statuses |
| `NonNullable<T>` | Removes `null` and `undefined` | A checked value |
| `ReturnType<F>` | Gives a function's return type | A helper's result |
| `Parameters<F>` | Gives the parameter types as a tuple | A wrapper around a function |
| `Awaited<T>` | Unwraps the type inside a `Promise` | The result of an `async` function |

### Partial, omit and pick

Utility types nest. In a product update the `id` does not change and every other field is optional:

```ts
type ProductUpdate = Partial<Omit<Product, "id">>;

function updateProduct(id: number, changes: ProductUpdate) {
  // ...
}

updateProduct(1, { price: 1199 }); // OK
updateProduct(1, { id: 2 });
// Error: Object literal may only specify known properties, and 'id' does not exist in type 'Partial<Omit<Product, "id">>'.
```

A cart item is a few of the product's fields combined with a quantity:

```ts
type CartItem = Pick<Product, "id" | "name" | "price"> & { quantity: number };
```

> [!WARNING]
>
> `Pick` checks that the key you give it really exists; `Omit` does not. `Omit<Product, "nmae">` returns a copy of `Product` without complaining. `Pick` and `Omit` are for object types, `Exclude` and `Extract` for unions; using one where the other belongs is a common mistake.[^2]

### Record, exclude and extract

`Record<Category, number>` requires **every** key in the union to be written:[^1]

```ts
const stock: Record<Category, number> = { electronics: 12, books: 40 };
// Error: Property 'home' is missing in type '{ electronics: number; books: number; }' but required in type 'Record<"books" | "electronics" | "home", number>'.
```

`Exclude` and `Extract` filter a union:[^1]

```ts
type OrderStatus = "pending" | "shipped" | "delivered" | "cancelled";

type OpenStatus = Exclude<OrderStatus, "delivered" | "cancelled">; // "pending" | "shipped"
type ClosedStatus = Extract<OrderStatus, "delivered" | "cancelled">; // "delivered" | "cancelled"
```

### ReturnType, parameters and awaited

These three derive from a function's type. The function itself is a value, so you have to take its type with `typeof` first; write `ReturnType<fetchProduct>` and you get `'fetchProduct' refers to a value, but is being used as a type here. Did you mean 'typeof fetchProduct'?`.[^4]

```ts
async function fetchProduct(id: number) {
  const response = await fetch(`/api/products/${id}`);
  const data: unknown = await response.json();
  return { data, fetchedAt: new Date() };
}

type FetchArgs = Parameters<typeof fetchProduct>; // [id: number]
type FetchResult = ReturnType<typeof fetchProduct>; // Promise<{ data: unknown; fetchedAt: Date }>
type FetchData = Awaited<ReturnType<typeof fetchProduct>>; // { data: unknown; fetchedAt: Date }
```

The return type of an `async` function is wrapped in a `Promise`; `Awaited` unwraps it.[^1][^2]

## satisfies

For the times when you want to check that an object matches a particular type and **keep its narrower type as well**, TypeScript 4.9 brought the `satisfies` operator.[^6]

```ts
type Route = { path: string; title: string };

// A type annotation: the type wins
const routes: Record<string, Route> = {
  home: { path: "/", title: "Home" },
  cart: { path: "/cart", title: "Cart" },
};
routes.wishlist.path; // no error, blows up at runtime

// satisfies: the value wins
const checkedRoutes = {
  home: { path: "/", title: "Home" },
  cart: { path: "/cart", title: "Cart" },
} satisfies Record<string, Route>;
checkedRoutes.wishlist;
// Error: Property 'wishlist' does not exist on type '{ home: { path: string; title: string; }; cart: { path: string; title: string; }; }'.
```

In both cases every route's `path` and `title` are checked. The difference is the resulting type: with the annotation the type widens to `Record<string, Route>` and which keys exist is forgotten, while with `satisfies` `keyof typeof checkedRoutes` is still `"home" | "cart"`. As [Matt Pocock](https://www.mattpocock.com/) puts it: with a colon "the type beats the value", with `satisfies` "the value beats the type".[^7]

Unlike `as`, `satisfies` does not force the type; it really checks. Misspell a category name and it catches you:

```ts
const categoryLabels = {
  electronics: "Electronics",
  books: "Books",
  hom: "Home",
} satisfies Record<Category, string>;
// Error: Object literal may only specify known properties, but 'hom' does not exist in type 'Record<"books" | "electronics" | "home", string>'. Did you mean to write 'home'?
```

<details>
<summary>In depth: mapped and conditional types</summary>

Most of the utility types are written with two underlying features, and you can write your own with them too.

A **mapped type** walks over a type's keys with `keyof` and produces a new field for each one. `?` and `readonly` can be added, or removed by putting `-` in front.[^8]

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] };
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
```

A **conditional type** is a ternary operator at the type level: `A extends B ? X : Y`. With `infer` you can pull a piece out of a type. Applied to a union, it is applied to each member separately.[^9]

```ts
type MyNonNullable<T> = T extends null | undefined ? never : T;
type ElementOf<T> = T extends (infer Item)[] ? Item : never;

type A = MyNonNullable<string | null>; // string
type B = ElementOf<Product[]>; // Product
```

You rarely need these in application code; they come in useful when writing a library and when reading complicated types.

</details>

## Try it yourself

- Add `"toys"` to the `categories` array in the TS Playground and look at the error the `Record<Category, number>` variable `stock` now gives.
- Define `type NewProduct = Omit<Product, "id">` and write a product object without an `id`.
- Delete `title` from one of the routes in `checkedRoutes` and read the error message. Then compare the types `keyof typeof routes` and `keyof typeof checkedRoutes` by hovering over them.

## Going deeper

- **Official docs:** the Utility Types page of the TypeScript Handbook; every type with its description, an example and the version it arrived in.[^1]
- **Book:** the "Deriving Types" chapter of [Matt Pocock](https://www.mattpocock.com/)'s Total TypeScript Essentials; when to derive and when to write a separate type.[^2]
- **Article:** [Matt Pocock](https://www.mattpocock.com/)'s "Clarifying the `satisfies` Operator"; annotations, `satisfies` and `as` compared.[^7]
- **Talk:** [Luca Del Puppo](https://delpuppo.net/) rewriting types such as `Partial`, `Pick` and `Omit` with mapped and conditional types *(JSNation 2025, 23 min)*.[^10]

## Sources

1. [TypeScript Handbook: Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html) *(doc)* — `Partial`, `Pick`, `Omit`, `Record`, `Exclude`, `ReturnType`, `Awaited` and the rest; the version each one arrived in.
2. [Matt Pocock](https://www.mattpocock.com/): [Total TypeScript Essentials: Deriving Types](https://www.totaltypescript.com/books/total-typescript-essentials/deriving-types) *(article)* — `keyof`, `typeof`, a union from `as const`, `Awaited`, and how `Pick`/`Omit` differ from `Exclude`/`Extract`.
3. [TypeScript Handbook: Keyof Type Operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html) *(doc)* — Producing a literal union from an object type's keys.
4. [TypeScript Handbook: Typeof Type Operator](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html) *(doc)* — `typeof` in a type position, `ReturnType<typeof f>` and its limits.
5. [TypeScript Handbook: Indexed Access Types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html) *(doc)* — `Type["key"]`, indexing with a union, and `typeof arr[number]`.
6. [Announcing TypeScript 4.9](https://devblogs.microsoft.com/typescript/announcing-typescript-4-9/) *(article)* — November 15, 2022. The `satisfies` operator, and checking a value without widening its type.
7. [Matt Pocock](https://www.mattpocock.com/): [Clarifying the `satisfies` Operator](https://www.totaltypescript.com/clarifying-the-satisfies-operator) *(article)* — When to use an annotation, `satisfies`, `as` and inference.
8. [TypeScript Handbook: Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html) *(doc)* — `[K in keyof T]`, the `readonly` and `?` modifiers, and renaming keys with `as`.
9. [TypeScript Handbook: Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) *(doc)* — The `extends ? :` syntax, `infer`, and conditional types distributing over a union.
10. [Luca Del Puppo](https://delpuppo.net/): [TypeScript Gymnastics: Why Are They So Powerful for You?](https://gitnation.com/contents/typescript-gymnastics-why-are-they-so-powerful-for-you) *(video)* — JSNation 2025, 23 minutes. Conditional and mapped types, `infer`, and writing the utility types from scratch.
