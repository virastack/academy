---
title: "Interface, type and union"
description: "Object shapes, type aliases, unions and literal types."
lastVerified: "2026-10-17"
translationKey: "typescript/interfaces-types-and-unions"
---

## Naming object types

In the previous lesson you wrote an object type right next to the parameter: `product: { name: string; price: number }`. The same shape comes up again in the product list, in the cart and in the order summary. Rather than writing it out each time, you give the shape a name. [!typescript] has two ways of doing that: `type` and `interface`.[^1]

A **type alias** is a name given to any type.[^1]

```ts
type Product = {
  readonly id: number;
  name: string;
  price: number;
  description?: string;
};

const headset: Product = { id: 1, name: "Wireless Headphones", price: 1299.9 };
```

An **interface** is also a way of naming an object type. There is no equals sign and no trailing semicolon; the rest is the same.[^1]

```ts
interface Product {
  readonly id: number;
  name: string;
  price: number;
  description?: string;
}
```

TypeScript compares types by their **shape**, not by their name *(structural typing)*: any object that has the properties `Product` asks for can stand in for a `Product`.[^1]

## Optional and readonly

A `?` after a property name makes it **optional**; when you read it you have to allow for `undefined`. `readonly` stops a property from being reassigned.[^2]

```ts
headset.price = 1199.9; // fine
headset.id = 2;
// Error: Cannot assign to 'id' because it is a read-only property.
headset.description.toUpperCase();
// Error: 'headset.description' is possibly 'undefined'.
```

> [!NOTE]
>
> `readonly` protects the property itself, not the object inside it. It also only applies during type checking; it does not freeze the object at runtime.[^2]

## Nested objects and arrays

Types can be used inside one another. An order carries an array of its items and an address.[^2]

```ts
type OrderItem = {
  product: Product;
  quantity: number;
};

type Order = {
  id: string;
  items: OrderItem[];
  shippingAddress: {
    city: string;
    district: string;
  };
};
```

A shape used in only one place, such as `shippingAddress`, can stay inline. If you need it elsewhere, give it a name too.

## Union types

A **union** says a value can be **one of** several types, and is written with `|`.[^1] A product id might be a number in some places and a stock code in others:

```ts
type ProductId = number | string;

function findProduct(id: ProductId) {
  console.log(id.toString()); // exists on both types
  console.log(id.toFixed(0));
  // Error: Property 'toFixed' does not exist on type 'ProductId'.
}

findProduct("SKU-42");
findProduct(true);
// Error: Argument of type 'boolean' is not assignable to parameter of type 'ProductId'.
```

TypeScript only allows operations that are valid on **every** member of the union.[^1] Checking whether `id` is a number or a string, and narrowing it, comes in the next lesson.

### Literal unions

A union built from literal types lists the options a value can take, one by one. It is the most used pattern for fixed lists such as an order status, a size or a sort option, and the editor autocompletes the values.[^3]

```ts
type OrderStatus = "pending" | "shipped" | "delivered";

function updateStatus(orderId: string, status: OrderStatus) {
  console.log(`${orderId}: ${status}`);
}

updateStatus("ORD-1001", "shipped");
updateStatus("ORD-1001", "cancelled");
// Error: Argument of type '"cancelled"' is not assignable to parameter of type 'OrderStatus'.
```

### Literal unions instead of enum

TypeScript also has an `enum` construct. But an `enum` is more than type information: it produces code at runtime.[^1] The Handbook says that in modern TypeScript an object with `as const` is usually enough.[^4]

```ts
enum OrderStatus {
  // Error: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
  Pending = "pending",
  Shipped = "shipped",
}
```

The `erasableSyntaxOnly` setting turns constructs that cannot be erased into JavaScript, `enum` among them, into errors.[^5] It arrived in TypeScript 5.8 and comes on in [!vite]'s React template.[^6] [Matt Pocock](https://www.mattpocock.com/) also says he would not add an `enum` to a new project.[^7] In short: write a literal union for a fixed set of options.

## Intersection types

An **intersection** joins several types with `&`, and the result has the properties of all of them.[^2] You can define a cart item as a `Product` plus a quantity. On an interface, `extends` does the same job.[^2]

```ts
type CartItem = Product & { quantity: number };

interface DigitalProduct extends Product {
  downloadUrl: string;
}

const cartItem: CartItem = { ...headset, quantity: 2 };
```

## interface or type?

Either works in most situations. The differences are these:[^1][^2][^8]

| | `type` | `interface` |
| :-- | :-- | :-- |
| Object shapes | Yes | Yes |
| Unions and literal types | Yes | No |
| Extending | With `&` | With `extends` |
| Declaring the same name twice | Error *(`Duplicate identifier`)* | They merge *(declaration merging)* |

**Declaration merging** is two interfaces written with the same name quietly becoming one interface:

```ts
interface Customer {
  id: number;
}

interface Customer {
  email: string;
}

const customer: Customer = { id: 1 };
// Error: Property 'email' is missing in type '{ id: number; }' but required in type 'Customer'.
```

It is useful when extending a library's types, and it can also happen without you noticing.[^9] The sources diverge on which one to pick:

- **The TypeScript Handbook:** it is mostly personal preference; if you want a rule, use `interface` until you need the features of `type`.[^1]
- **[Matt Pocock](https://www.mattpocock.com/):** use `type` by default; it is more flexible and less surprising. Reach for `interface extends` when you need object inheritance, since it catches clashing properties at the declaration and is faster for the compiler.[^8][^10]

This roadmap uses `type`, [!react] component props included. What matters is being consistent within a project.

## Excess property checks

When you assign an object literal straight to a typed variable, or pass one to a function, TypeScript treats properties that are not in the type as errors. This is called an **excess property check**, and it mostly catches typos.[^2]

```ts
const product: Product = {
  id: 1,
  name: "Wireless Headphones",
  price: 1299.9,
  colour: "black",
  // Error: Object literal may only specify known properties, and 'colour' does not exist in type 'Product'.
};
```

> [!WARNING]
>
> The check only applies to **fresh** object literals. Assign the same object to another variable first and then pass it as a `Product`, and the extra property raises nothing; types are compared by shape.[^2]

## Sharing types between files

Types are exported and imported like values. Mark imports that only contain types with `import type`, and in mixed ones put `type` in front of the type. Tools such as Vite can then remove those imports safely.[^11]

```ts
// types.ts
export type Product = { id: number; name: string; price: number };

export type OrderStatus = "pending" | "shipped" | "delivered";

export function formatPrice(price: number) {
  return `€${price.toFixed(2)}`;
}

// cart.ts
import { formatPrice, type Product } from "./types";
import type { OrderStatus } from "./types";
```

The `verbatimModuleSyntax` setting, which comes on in the Vite template, raises an error if you import a type without `type`: `'Product' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.`[^12][^6]

## Try it yourself

In the TypeScript Playground:

- Write the `Product` type as an `interface` and add a second `interface Product { stock: number }` with the same name; look at why the existing objects now fail.
- Try the same with `type` and see the `Duplicate identifier` error.
- Add `"cancelled"` to `OrderStatus` and watch the error in the `updateStatus` call disappear.
- Join `type A = { name: string }` and `type B = { name: number }` with `&`, and see that the type of `name` is `never`.

## Going deeper

- **Official docs:** the Object Types page of the TypeScript Handbook; optional, `readonly`, excess property checks, `extends` and intersections.[^2]
- **Book:** the "Objects" chapter of [Matt Pocock](https://www.mattpocock.com/)'s *Total TypeScript Essentials*, readable online; intersections against `interface extends`.[^10]
- **Article:** Matt Pocock's "Type vs Interface: Which Should You Use?".[^8]
- **Article:** [Stefan Baumgartner](https://oida.dev/)'s "Tidy TypeScript: Prefer type aliases over interfaces", on the surprises declaration merging leads to.[^9]
- **Practice:** Matt Pocock's free, interactive Beginner's TypeScript tutorial.[^13]

## Sources

1. [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) *(doc)* — Type aliases, interfaces, the differences between them and union types; the "`interface` until you need the features of `type`" advice.
2. [TypeScript Handbook: Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html) *(doc)* — Optional and `readonly` properties, excess property checks, `extends`, intersections and how clashes differ.
3. [Matt Pocock](https://www.mattpocock.com/): [Total TypeScript Essentials: Unions, Literals, and Narrowing](https://www.totaltypescript.com/books/total-typescript-essentials/unions-literals-and-narrowing) *(article)* — Union and literal types, and autocomplete.
4. [TypeScript Handbook: Enums](https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums) *(doc)* — "Objects vs Enums": an `as const` object usually being enough in modern TypeScript.
5. [TypeScript 5.8 Release Notes: --erasableSyntaxOnly](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html) *(doc)* — The setting that rejects `enum`, namespaces and parameter properties, and the Node.js type stripping behind it.
6. [create-vite: template-react-ts/tsconfig.app.json](https://github.com/vitejs/vite/blob/main/packages/create-vite/template-react-ts/tsconfig.app.json) *(repo)* — `erasableSyntaxOnly` and `verbatimModuleSyntax` being on in Vite's React template.
7. [Matt Pocock](https://www.mattpocock.com/): [Why I Don't Like Enums](https://www.totaltypescript.com/why-i-dont-like-typescript-enums) *(article)* — The oddities of numeric enums, and "I wouldn't add an enum to a new project".
8. [Matt Pocock](https://www.mattpocock.com/): [Type vs Interface: Which Should You Use?](https://www.totaltypescript.com/type-vs-interface-which-should-you-use) *(article)* — `type` by default, `interface extends` for inheritance; the risk of declaration merging.
9. [Stefan Baumgartner](https://oida.dev/): [Tidy TypeScript: Prefer type aliases over interfaces](https://oida.dev/tidy-typescript-prefer-type-aliases/) *(article)* — From 2020; an example of a global interface widening unnoticed.
10. [Matt Pocock](https://www.mattpocock.com/): [Total TypeScript Essentials: Objects](https://www.totaltypescript.com/books/total-typescript-essentials/objects) *(article)* — Intersections, `interface extends` and declaration merging; the author's `type` default.
11. [TypeScript Handbook: Modules](https://www.typescriptlang.org/docs/handbook/2/modules.html) *(doc)* — Exporting and importing types, `import type` and inline `type` imports.
12. [TSConfig Reference: verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html) *(doc)* — Imports marked `type` being erased and the rest left as they are.
13. [Matt Pocock](https://www.mattpocock.com/): [Beginner's TypeScript](https://totaltypescript.com/tutorials/beginners-typescript) *(video)* — A free, interactive 18-lesson tutorial.
