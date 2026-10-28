---
title: "Narrowing and type guards"
description: "Narrowing a union, discriminated unions and safe type checks."
lastVerified: "2026-10-17"
translationKey: "typescript/narrowing-and-type-guards"
---

## What narrowing is

A value with a union type can be one of several things. TypeScript only allows you the operations they **all have in common**:

```ts
function formatPrice(price: number | string) {
  return price.toFixed(2);
  // Error: Property 'toFixed' does not exist on type 'string | number'.
}
```

The answer is to check the value with an `if`. TypeScript follows the flow of the code and works out the narrowest type the value can have in each branch. Coming down from the declared type to a narrower one is **narrowing**, and the checks that get you there are **type guards**.[^1]

```ts
function formatPrice(price: number | string) {
  if (typeof price === "string") {
    return price; // price: string
  }
  return price.toFixed(2); // price: number
}
```

After the `return` there is no chance of a `string` left, so TypeScript treats `price` as a `number` on the line below. This is called **control flow analysis**.[^1] There is no extra syntax: the ordinary JavaScript checks you write are what narrow the type.

## The built-in checks

| Check | When |
| :-- | :-- |
| `typeof x === "string"` | Telling primitive types apart |
| `if (x)` / `if (!x)` | Ruling out `null`, `undefined` and empty values |
| `x === "shipped"`, `x != null` | Splitting on a particular value or on `null` |
| `"weight" in x` | Telling objects apart by a field they have |
| `x instanceof Date` | Telling class instances *(`Date`, `Error`)* apart |

`typeof` has one trap: in JavaScript, `typeof null` also returns `"object"`. TypeScript knows this; in a `typeof x === "object"` branch `x` can still be `null`, and it warns you with `'x' is possibly 'null'`.[^1]

A truthiness check *(`if (value)`)* is short but needs care: `0` and `""` are falsy too.[^1] For values that can be `0`, such as stock, compare explicitly:

```ts
function showStock(stock: number | undefined) {
  if (stock === undefined) {
    return "No information";
  }
  return stock === 0 ? "Sold out" : `${stock} in stock`; // stock: number
}
```

Had you written `if (!stock)`, a stock of `0` would have shown "No information" as well. `x != null` rules out both `null` and `undefined` in one go.[^1]

With `in` you tell objects apart by the presence of a field:[^1]

```ts
type PhysicalProduct = { name: string; weight: number };
type DigitalProduct = { name: string; downloadUrl: string };

function shippingLabel(product: PhysicalProduct | DigitalProduct) {
  if ("weight" in product) {
    return `${product.weight} kg`; // PhysicalProduct
  }
  return "A download link is sent by email"; // DigitalProduct
}
```

## Discriminated unions

This is the pattern that will serve you most in real projects. You give every member of the union a field with the same name and a **literal type** *(usually `status`, `type` or `kind`)*. That shared field is called the **discriminant**; checking it narrows the union to a single member.[^1][^2]

Say a screen that loads a product list from an API has three states:

```ts
type ProductsState =
  | { status: "loading" }
  | { status: "success"; data: Product[] }
  | { status: "error"; message: string };

function renderProducts(state: ProductsState): string {
  switch (state.status) {
    case "loading":
      return "Loading...";
    case "success":
      return `${state.data.length} products found`; // only here is there data
    case "error":
      return `Error: ${state.message}`; // only here is there a message
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}
```

A type built from optional fields, such as `{ isLoading: boolean; data?: Product[]; error?: string }`, allows impossible states like "loading and errored at once", and pushes you into writing `!` everywhere. A discriminated union makes those states impossible at the type level.[^1] `useReducer` actions in React are written with the same pattern, which you will see in the Types in React lesson.

### Exhaustive checks with never

The line in the `default` branch is a safety net. If every case has been handled, no possibility is left, the type of `state` becomes `never`, and the assignment is valid.[^1] Add `{ status: "idle" }` to the union later and forget the `case "idle":`, and TypeScript names the case you forgot:

```ts
const exhaustiveCheck: never = state;
// Error: Type '{ status: "idle"; }' is not assignable to type 'never'.
```

## Your own type guard

Once a check gets long or starts repeating, you pull it out into a function. Write `value is Product` as the return type and the function becomes a **type predicate**: if it returns `true`, TypeScript treats the value as a `Product`.[^1]

```ts
function isProduct(value: unknown): value is Product {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "name" in value &&
    typeof value.name === "string" &&
    "price" in value &&
    typeof value.price === "number" &&
    "stock" in value &&
    typeof value.stock === "number"
  );
}
```

> [!WARNING]
>
> TypeScript does **not** verify that the check inside the function matches the `value is Product` claim. Write the check incompletely and the type is narrowed wrongly. Your own type guard needs as much care as an `as`.[^3]

Since TypeScript 5.5 it infers the predicate itself for simple functions *(inferred type predicates)*. It helps most with `filter`:[^4]

```ts
const cartProducts = cartIds
  .map((id) => products.find((p) => p.id === id))
  .filter((product) => product !== undefined);
// TS 5.5+: Product[] (previously (Product | undefined)[])
```

`filter((x) => !!x)` does not work on numbers, because returning `false` can mean either `undefined` or `0`; write the explicit comparison.[^4]

### Assertion functions

A type guard returns a `boolean` and needs an `if`. An **assertion function** throws when the condition does not hold, and the type is narrowed on the lines after the call. The return type is written as `asserts value is ...`.[^5]

```ts
function assertIsDefined<T>(
  value: T,
  message: string,
): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

function getPrice(id: number) {
  const product = products.find((p) => p.id === id); // Product | undefined
  assertIsDefined(product, `Product not found: ${id}`);
  return product.price; // product: Product
}
```

The `<T>` and `NonNullable<T>` syntax comes in the Generics and Utility types lessons.

## Forcing a type with as and !

A **type assertion** *(`as`)* tells TypeScript "I know this value's type better than you do". It performs no runtime check; if you are wrong, the error surfaces while the application is running.[^6] The postfix `!` *(a non-null assertion)* claims a value is not `null` or `undefined` without checking.[^6]

```ts
const data = JSON.parse('{"id": 1}') as Product;
data.name.toUpperCase(); // compiles, blows up at runtime: name is undefined

const product = products.find((p) => p.id === 99)!;
product.price; // compiles, blows up at runtime if there is no such product
```

TypeScript only allows `as` between types that overlap. An unrelated conversion such as `"1299" as number` gives `Conversion of type 'string' to type 'number' may be a mistake...`.[^6]

The rule is simple: narrow with a real check first *(an `if`, a type guard, a discriminated union)*; use `as` and `!` not to silence an error message but only where TypeScript cannot know something that you know for certain.

## Narrowing unknown

Data from the outside world is data of unknown type. `response.json()` and `JSON.parse` return `any`, which turns the checking off entirely. Taking the value as `unknown` and narrowing it is safer: TypeScript will not let you use it without checking.[^2]

```ts
async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("/api/products");
  const data: unknown = await response.json();

  if (!Array.isArray(data) || !data.every(isProduct)) {
    throw new Error("Unexpected product data");
  }
  return data; // data: Product[]
}
```

The `"id" in value && typeof value.id === "number"` chain inside `isProduct` became possible with TypeScript 4.9: an `in` check now also makes a field that is not listed in the type accessible.[^7]

The error in a `catch` block is `unknown` too, because anything can be thrown in JavaScript. `useUnknownInCatchVariables`, which is on in `strict` mode, is what does it.[^8][^9]

```ts
try {
  await addToCart(productId);
} catch (error) {
  console.error(error.message);
  // Error: 'error' is of type 'unknown'.

  const message = error instanceof Error ? error.message : String(error);
  console.error(message); // safe
}
```

> [!TIP]
>
> In real projects you validate API responses with a schema library such as [!zod] rather than hand-written type guards. A schema checks the data at runtime and produces the type for you as well.[^10] The Zod lesson on the Forms track covers it in detail.

## Try it yourself

- Add `{ status: "empty" }` to `ProductsState` in the TS Playground and see which line the `never` check fails on.
- Remove the `stock` check from `isProduct`. Does TypeScript complain? Think about why it does not.
- Compare the types of `[1, 0, undefined].filter((x) => x !== undefined)` and `filter((x) => !!x)` by hovering over them.

## Going deeper

- **Official docs:** the Narrowing page of the TypeScript Handbook; every check in this lesson, with examples.[^1]
- **Book:** the "Unions, Literals, and Narrowing" chapter of [Matt Pocock](https://www.mattpocock.com/)'s Total TypeScript Essentials, readable online.[^2]
- **Article:** [Kent C. Dodds](https://kentcdodds.com/) on getting a message safely out of an `unknown` error in a `catch` block.[^9]
- **Article:** the "Inferred Type Predicates" section of the TypeScript 5.5 announcement, written by [Dan Vanderkam](https://danvk.org/), who built the feature.[^4]
- **Official docs:** Zod's introduction page; runtime validation with a schema.[^10]

## Sources

1. [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) *(doc)* — `typeof`, truthiness, equality, `in`, `instanceof`, type predicates, discriminated unions and exhaustive checks with `never`.
2. [Matt Pocock](https://www.mattpocock.com/): [Total TypeScript Essentials: Unions, Literals, and Narrowing](https://www.totaltypescript.com/books/total-typescript-essentials/unions-literals-and-narrowing) *(article)* — Narrowing, why `unknown` is safe, and modelling state with a discriminated union.
3. [Matt Pocock](https://www.mattpocock.com/): [Total TypeScript Essentials: Utility Folder Development](https://www.totaltypescript.com/books/total-typescript-essentials/utility-folder-development-in-typescript) *(article)* — The warning that your own type predicates and assertion functions can be as risky as `as`.
4. [Announcing TypeScript 5.5](https://devblogs.microsoft.com/typescript/announcing-typescript-5-5/) *(article)* — June 20, 2024. Inferred type predicates with `filter`, their conditions and the `!!x` limitation.
5. [TypeScript 3.7 Release Notes: Assertion Functions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html) *(doc)* — The `asserts condition` and `asserts val is Type` signatures.
6. [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) *(doc)* — Type assertions and non-null assertions; neither performing a runtime check.
7. [Announcing TypeScript 4.9](https://devblogs.microsoft.com/typescript/announcing-typescript-4-9/) *(article)* — Narrowing on unlisted fields with the `in` operator; an example of reading a field off `unknown` data.
8. [TypeScript 4.4 Release Notes: useUnknownInCatchVariables](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html) *(doc)* — The `catch` variable becoming `unknown` instead of `any`, and the flag turning on with `strict`.
9. [Kent C. Dodds](https://kentcdodds.com/): [Get a catch block error message with TypeScript](https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript) *(article)* — Anything being throwable, and a `getErrorMessage` helper.
10. [Zod](https://zod.dev/) *(doc)* — "TypeScript-first schema validation with static type inference"; validating data with a schema.
