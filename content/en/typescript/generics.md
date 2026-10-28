---
title: "Generics"
description: "Reusable functions and types that work with whatever type they are given."
lastVerified: "2026-10-17"
translationKey: "typescript/generics"
---

## Why generics

Imagine writing a function that returns the first item of a list. You want it to work with products, with cart items and with strings. The first thing that comes to mind is `any`:

```ts
function getFirst(items: any[]) {
  return items[0];
}

const first = getFirst(products); // any
first.nmae; // no error; the typo surfaces at runtime
```

The function works with every type, but the information about the type that went in is lost.[^1] The other option is a separate function per type *(`getFirstProduct`, `getFirstCartItem`…)*, which means repeating the same code.

**Generics** are the road between the two: the function works with every type, but remembers which type it was called with.

## A generic function

After the function name you write a **type parameter** inside angle brackets. `T` is a placeholder that gets filled with a real type at the call site:[^1]

```ts
function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}

const firstProduct = getFirst(products); // Product | undefined
const firstName = getFirst(["Headphones", "Keyboard"]); // string | undefined

firstProduct?.nmae;
// Error: Property 'nmae' does not exist on type 'Product'.
```

You do not have to write `getFirst<Product>(products)`: TypeScript looks at the argument and works out that `T` is `Product` *(type argument inference)*.[^1] In [Matt Pocock](https://www.mattpocock.com/)'s analogy, a generic function is a "type function" sitting on top of an ordinary one: the runtime argument `items` maps to `T` at the type level.[^2]

### Passing the type by hand

When inference is not enough, or you want a different type, you write the type argument out. An empty array, for instance, has no type to infer from:[^1][^3]

```ts
const none = getFirst<Product>([]); // Product | undefined

getFirst<string>(products);
// Error: Argument of type 'Product[]' is not assignable to parameter of type 'string[]'.
```

A type given by hand overrides inference, and the arguments are checked against it.[^3]

### More than one type parameter

Type parameters are separated by commas. A simplified version of `Array.prototype.map` sets up the relationship between two types:

```ts
function mapItems<TItem, TResult>(
  items: TItem[],
  fn: (item: TItem) => TResult,
): TResult[] {
  return items.map(fn);
}

const names = mapItems(products, (product) => product.name); // string[]
```

A single-letter `T` is a widespread convention. With more than one parameter, descriptive names such as `TItem` and `TResult` keep the code readable.

## Limiting with a constraint

Because `T` can be anything, you cannot reach a field specific to it inside the function:[^1]

```ts
function sortByPrice<T>(items: T[]) {
  return [...items].sort((a, b) => a.price - b.price);
  // Error: Property 'price' does not exist on type 'T'.
}
```

With `extends` you put a lower bound on `T`: "any type that has a `price` field".[^1]

```ts
function sortByPrice<T extends { price: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.price - b.price);
}

const sortedProducts = sortByPrice(products); // Product[]
const sortedCart = sortByPrice(cartItems); // CartItem[]

sortByPrice(["Headphones"]);
// Error: Type 'string' is not assignable to type '{ price: number; }'.
```

The difference is in the return type. Had you made the parameter `{ price: number }[]` directly, the result would be `{ price: number }[]` too and you would lose the other fields, `name` among them. The generic version hands back exactly what went in.

### Picking a key with keyof

One type parameter can be tied to another. `K extends keyof T` means "`K` has to be one of `T`'s keys":[^1]

```ts
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

const names = pluck(products, "name"); // string[]
const prices = pluck(products, "price"); // number[]

pluck(products, "nmae");
// Error: Argument of type '"nmae"' is not assignable to parameter of type 'keyof Product'.
```

The `keyof` and `T[K]` syntax is covered in detail in the Utility types lesson.

## Generic types

Type parameters are not only for functions; they work in `type` and `interface` declarations too. If the API's paginated response has the same shape for every resource, you write it once:[^4]

```ts
type Paginated<T> = {
  items: T[];
  page: number;
  totalPages: number;
};

type ProductPage = Paginated<Product>;
type CartPage = Paginated<CartItem>;
```

A type parameter can be given a **default value** with `=`. A parameter with a default is optional; one without is required:[^1][^4]

```ts
type ApiResponse<TData, TError = string> =
  | { ok: true; data: TData }
  | { ok: false; error: TError };

type ProductResponse = ApiResponse<Product[]>; // error: string
type CartResponse = ApiResponse<CartItem[], { code: number; message: string }>;

const page: Paginated = { items: [], page: 1, totalPages: 1 };
// Error: Generic type 'Paginated' requires 1 type argument(s).
```

### Generics you already use

You are using generics without noticing. `number[]` is shorthand for `Array<number>`. An `async` function returns `Promise<Product>`, and `new Map<number, number>()` takes a key and a value type. `useState<Product | null>(null)` in React is a generic call too; that, and writing a generic component, come in the Types in React lesson.

## A typed fetch helper

Every project has a `fetchJson<T>` helper somewhere:

```ts
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

const products = await fetchJson<Product[]>("/api/products"); // Product[]
```

It is handy, but to be honest it is an **unchecked type assertion**. `response.json()` returns `any`; writing `fetchJson<Product[]>` is no different from writing `as Product[]`. If the server returns something else, TypeScript cannot know.[^5]

> [!WARNING]
>
> `T` appears only in the return type of this function. A "return-only" generic like this, tied to no argument, is `any` in disguise.[^5]

The safer version takes the data as `unknown` and validates it with a type guard. The `isProduct` from the Narrowing and type guards lesson does the job here:

```ts
async function fetchJson<T>(
  url: string,
  isValid: (value: unknown) => value is T,
): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  const data: unknown = await response.json();
  if (!isValid(data)) {
    throw new Error("Unexpected response");
  }
  return data;
}

const product = await fetchJson("/api/products/1", isProduct); // Product
```

Now `T` appears in two places and is inferred from an argument; the type rests on a real check. In real projects `isValid` is usually a [!zod] schema instead.

## Don't write more generics than you need

Writing generics is enjoyable, and overdoing it is easy. The measure from the TypeScript Handbook, which [Dan Vanderkam](https://danvk.org/) calls "the golden rule of generics", is this:[^3][^5]

> [!TIP]
>
> If a type parameter appears in only one place in the signature, think again about whether you really need it. Type parameters are for **tying** the types of several values together.

```ts
// Unnecessary: T appears in one place and ties nothing together
function printName<T extends { name: string }>(item: T): void {
  console.log(item.name);
}
```

```ts
// Enough
function printName(item: { name: string }): void {
  console.log(item.name);
}
```

`getFirst<T>(items: T[]): T | undefined` passes the rule: `T` appears in both the parameter and the return, and ties them together. The Handbook also recommends using as few type parameters as you can.[^3] typescript-eslint's `no-unnecessary-type-parameters` rule checks this automatically; it is on in the `strict-type-checked` configuration.[^6]

## Try it yourself

- Hover over the `getFirst([1, "two"])` call in the TS Playground to see what `T` is inferred as.
- Check the type of `pluck(cartItems, "quantity")` by hovering over it.
- Produce a `ProductResponse` from `ApiResponse<TData, TError = string>` and narrow it with the `ok` field.

## Going deeper

- **Official docs:** the Generics page of the TypeScript Handbook; constraints, constraints with `keyof` and default type parameters.[^1]
- **Official docs:** the "Guidelines for Writing Good Generic Functions" section of the Handbook; three short rules.[^3]
- **Article:** [Matt Pocock](https://www.mattpocock.com/)'s "Building the Mental Model for Generics", where generics are a type function sitting on a function.[^2]
- **Article:** [Dan Vanderkam](https://danvk.org/)'s "The Golden Rule of Generics"; bad and good generics, side by side.[^5]
- **Book:** the "Designing Your Types" chapter of [Matt Pocock](https://www.mattpocock.com/)'s Total TypeScript Essentials; generic types, multiple parameters and defaults.[^4]

## Sources

1. [TypeScript Handbook: Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) *(doc)* — Losing information with `any`, type argument inference, constraints, constraints with `keyof` and default type parameters.
2. [Matt Pocock](https://www.mattpocock.com/): [Building the Mental Model for Generics](https://www.totaltypescript.com/mental-model-for-typescript-generics) *(article)* — Thinking of a generic function as a type function on top of an ordinary one.
3. [TypeScript Handbook: More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html) *(doc)* — Passing the type argument by hand, and the three rules for writing good generic functions.
4. [Matt Pocock](https://www.mattpocock.com/): [Total TypeScript Essentials: Designing Your Types](https://www.totaltypescript.com/books/total-typescript-essentials/designing-your-types-in-typescript) *(article)* — Generic type aliases, several type parameters, default values and constraints.
5. [Dan Vanderkam](https://danvk.org/): [The Golden Rule of Generics](https://effectivetypescript.com/2020/08/12/generics-golden-rule/) *(article)* — August 12, 2020. Type parameters that appear once, and return-only generics behaving like `any`.
6. [typescript-eslint: no-unnecessary-type-parameters](https://typescript-eslint.io/rules/no-unnecessary-type-parameters/) *(doc)* — A type-aware rule that catches type parameters used only once.
