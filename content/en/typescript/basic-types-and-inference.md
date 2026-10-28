---
title: "Basic types and inference"
description: "Primitive types, arrays, function types, any and unknown, with type inference."
lastVerified: "2026-10-17"
translationKey: "typescript/basic-types-and-inference"
---

## Writing a type

In [!typescript], the type of a variable, a parameter or a return value is written after its name, following a colon. This is called a **type annotation**.[^1]

```ts
let productName: string = "Wireless Headphones";
let price: number = 1299.9;
let inStock: boolean = true;

price = "1299";
// Error: Type 'string' is not assignable to type 'number'.
```

The three basic *(primitive)* types are `string`, `number` and `boolean`. `number` does not separate integers from decimals; in JavaScript both are the same type. Always write the types in lowercase: `String`, `Number` and `Boolean` are something else.[^1] There are also the rarer `bigint` and `symbol`.

## Type inference

The types in the example above did not need to be written. TypeScript works out a variable's type from its first value, which is called **type inference**.[^1][^2] Write `let price = 1299.9;` and `price` is still a `number`, and `price = "1299"` still gives the same error. Hover over the variable in your editor and you see the inferred type. The Handbook's advice is clear: when you are starting out, *"try using fewer type annotations than you think"*.[^1]

| Where | Write the type? |
| :-- | :-- |
| Local variables | No, leave it to inference |
| Function parameters | Yes, TypeScript does not infer a parameter from how it is used |
| Callback parameters *(`map`, `onClick`)* | No, they come from the context |
| The return type of an exported function | Worth considering |

[Dan Vanderkam](https://danvk.org/) gives the same rule in *Effective TypeScript*: annotate function signatures, not local variables.[^3] Writing the return type stops a mistake inside a function from spreading to everywhere that calls it; the error shows up in the function itself.[^3] [Matt Pocock](https://www.mattpocock.com/) also recommends return types on top-level functions in a module, while leaving components that return JSX out of it.[^4]

```ts
export function getShippingCost(total: number): number {
  if (total >= 500) {
    return 0;
  }
  return "49.90";
  // Error: Type 'string' is not assignable to type 'number'.
}
```

### The difference between let and const

A variable declared with `let` can change later, so it gets the general type. A `const` will not change, so the exact value itself becomes the type. This is called a **literal type**.[^1]

```ts
let orderStatus = "pending"; // string, "shipped" can be assigned later
const currency = "EUR"; // "EUR"
```

## Arrays and tuples

An array type is written by adding `[]` after the element type. `Array<number>` means the same thing; you will meet that `<>` form in the Generics lesson.[^1]

When the elements have different types, TypeScript picks a type that covers all of them.[^2] A **tuple** is an array whose length is fixed and whose type at each position is known.[^5] The `[value, setValue]` pair `useState` returns in React is a tuple too.

```ts
const prices: number[] = [1299.9, 249];
const tags: Array<string> = ["audio", "wireless"];
const ids = [1, 2, 3]; // number[]
ids.push("4");
// Error: Argument of type 'string' is not assignable to parameter of type 'number'.

const mixed = [1, "two", null]; // (string | number | null)[]
const entry: [string, number] = ["Wireless Headphones", 2]; // tuple
```

## Functions

Parameter types go after the parameter name, and the return type after the closing parenthesis. Every argument passed to an annotated parameter is checked.[^1]

```ts
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

calculateTotal(1299.9);
// Error: Expected 2 arguments, but got 1.
```

### Optional and default parameters

Putting `?` after a parameter name makes it optional; inside the function its type becomes `string | undefined`. A parameter with a default value is optional too, and takes its type from that value.[^6]

```ts
function formatPrice(amount: number, currency?: string) {
  return `${amount.toFixed(2)} ${currency ?? "EUR"}`;
}

function applyDiscount(price: number, rate = 0.1) {
  return price * (1 - rate); // rate: number
}

formatPrice(249); // "249.00 EUR"
applyDiscount(1000, "0.2");
// Error: Argument of type 'string' is not assignable to parameter of type 'number'.
```

### void and arrow functions

A function that returns no value has the return type `void`.[^6] In an arrow function the types go in the same places. When a function is handed to somewhere that knows its type, such as `map`, the parameter type comes from the context; this is called **contextual typing**.[^1][^2]

```ts
function logOrder(orderId: string): void {
  console.log(`Order received: ${orderId}`);
}

const toUpper = (text: string) => text.toUpperCase(); // returns: string
const labels = [249, 89.5].map((p) => p.toFixed(2)); // p: number
```

### Function types

When you take a function as a parameter or pass one as a prop, you write its type as `(parameter: type) => returnType`. The parameter name is required.[^6]

```ts
type PriceFormatter = (amount: number) => string;

function renderPrice(amount: number, format: PriceFormatter) {
  return format(amount);
}

renderPrice(249, (amount) => `€${amount}`);
renderPrice(249, (amount) => amount * 2);
// Error: Type 'number' is not assignable to type 'string'.
```

Naming a type with `type` is covered in detail in the Interface, type and union lesson.

## null and undefined

With `strictNullChecks` on, `null` and `undefined` are types of their own; you cannot pass `null` where a `string` is expected.[^7] The setting comes with `strict`, and in TypeScript 7 `strict` is on by default.[^8] When a value may be absent, you say so in the type with `|`:

```ts
function formatCoupon(code: string | null) {
  code.toUpperCase();
  // Error: 'code' is possibly 'null'.

  if (code !== null) {
    return code.toUpperCase(); // here code: string
  }
  return "No coupon";
}
```

**Union** types written with `|` come in the next lesson, and narrowing a type with an `if` in the Narrowing and type guards lesson.

## any, unknown and never

**`any`** turns the type checking off: it accepts anything and allows any operation on it. That is why it is best avoided.[^1] TypeScript treats an untyped parameter such as the one in `function getTotal(items) {...}` as `any`; the `noImplicitAny` setting *(on with `strict`)* turns that into the error `Parameter 'items' implicitly has an 'any' type.`[^9]

**`unknown`** is the safe counterpart of `any`: any value can be assigned to it, but nothing can be done with it until its type has been checked.[^10] That makes it the right choice for values whose type you do not know, such as `JSON.parse` output or data from an API.[^11]

```ts
const fromAny: any = JSON.parse('{"price": 249}');
fromAny.prise.toFixed(2); // compiles, blows up at runtime

const fromUnknown: unknown = JSON.parse('{"price": 249}');
fromUnknown.price;
// Error: 'fromUnknown' is of type 'unknown'.
```

Before using an `unknown` value you confirm its type with checks such as `typeof`; that is the Narrowing and type guards lesson.

> [!TIP]
>
> `any` says "I don't care what this is", `unknown` says "I don't know what this is".[^11] When you are not sure, write `unknown`; TypeScript then makes you check first.

**`never`** is the type of a value that never occurs: the return type of a function such as `function fail(message: string): never`, which always throws.[^6]

## Literal types and as const

Combining literal types with `|` limits the values a variable can take: `let size: "S" | "M" | "L"` cannot be given `"XL"`.[^1] The next lesson covers this in detail.

The properties of an object can change, so they get the general type. Adding `as const` makes every value literal and `readonly`.[^1]

```ts
const config = { currency: "EUR", taxRate: 0.2 };
// { currency: string; taxRate: number }

const constConfig = { currency: "EUR", taxRate: 0.2 } as const;
// { readonly currency: "EUR"; readonly taxRate: 0.2 }
constConfig.taxRate = 0.1;
// Error: Cannot assign to 'taxRate' because it is a read-only property.
```

## A first look at object types

You can write an object's type directly, listing its properties inside curly braces. A missing property is an error.[^1]

```ts
function printProduct(product: { name: string; price: number }) {
  console.log(`${product.name}: €${product.price}`);
}

printProduct({ name: "Wireless Headphones" });
// Error: Property 'price' is missing in type '{ name: string; }' but required in type '{ name: string; price: number; }'.
```

That form is for one-off use. To use the same shape in more than one place you give it a name with `type` or `interface`, which is the next lesson.

## Try it yourself

Open the TypeScript Playground and:

- Write `const total = calculateTotal(249, 2)` and hover over `total` to see the inferred type.
- Remove the types from `calculateTotal`'s parameters and read the `implicitly has an 'any' type` error.
- Delete the `: number` return type from `getShippingCost`; watch the error disappear and the return type get inferred as `"49.90" | 0`.
- Assign the result of `JSON.parse` to a variable typed `unknown` and confirm with a `typeof` check that it is a `number`.

## Going deeper

- **Official docs:** the Everyday Types page of the TypeScript Handbook; the source for everything in this lesson.[^1]
- **Book:** the "Essential Types and Annotations" chapter of [Matt Pocock](https://www.mattpocock.com/)'s *Total TypeScript Essentials*, readable online.[^12]
- **Article:** the item "Avoid Cluttering Your Code with Inferable Types" from [Dan Vanderkam](https://danvk.org/)'s *Effective TypeScript*.[^3]
- **Talk:** [Stefan Baumgartner](https://oida.dev/)'s "The Lies We Tell Ourselves Using TypeScript", on `any`, `unknown` and what the type check misses *(TypeScript Congress 2023, 28 min)*.[^13]
- **Practice:** Matt Pocock's free, interactive Beginner's TypeScript tutorial *(18 lessons)*.[^14]

## Sources

1. [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) *(doc)* — Primitive types, arrays, `any`, type annotations, functions, literal types and `as const`.
2. [TypeScript Handbook: Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html) *(doc)* — The best common type and contextual typing.
3. [Dan Vanderkam](https://danvk.org/): [Item 19: Avoid Cluttering Your Code with Inferable Types](https://effectivetypescript.com/2020/04/28/avoid-inferable/) *(article)* — Annotating function signatures rather than local variables; what a return type buys you.
4. [Matt Pocock](https://www.mattpocock.com/): [Should You Declare Return Types?](https://www.totaltypescript.com/should-you-declare-return-types) *(article)* — Return types on top-level functions, components returning JSX excepted.
5. [TypeScript Handbook: Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html#tuple-types) *(doc)* — Tuple types, optional and `readonly` tuples.
6. [TypeScript Handbook: More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html) *(doc)* — Function types, optional and default parameters, `void`, `unknown` and `never`.
7. [TSConfig Reference: strictNullChecks](https://www.typescriptlang.org/tsconfig/#strictNullChecks) *(doc)* — `null` and `undefined` as separate types; on by default with `strict`.
8. [Daniel Rosenwasser: Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) *(article)* — July 8, 2026; `strict` defaulting to `true`.
9. [TSConfig Reference: noImplicitAny](https://www.typescriptlang.org/tsconfig/#noImplicitAny) *(doc)* — Turning a fall back to `any` into an error.
10. [TypeScript 3.0 Release Notes: The unknown type](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html) *(doc)* — `unknown` arriving as the type-safe counterpart of `any`.
11. [Matt Pocock](https://www.mattpocock.com/): [Total TypeScript Essentials: Unions, Literals, and Narrowing](https://www.totaltypescript.com/books/total-typescript-essentials/unions-literals-and-narrowing) *(article)* — The difference between `unknown` and `any`, `never`, and literal types.
12. [Matt Pocock](https://www.mattpocock.com/): [Total TypeScript Essentials: Essential Types and Annotations](https://www.totaltypescript.com/books/total-typescript-essentials/essential-types-and-annotations) *(article)* — Annotations, inference, arrays, tuples and function types, with exercises.
13. [Stefan Baumgartner](https://oida.dev/): [The Lies We Tell Ourselves Using TypeScript](https://gitnation.com/contents/the-lies-we-tell-ourselves-using-typescript) *(video)* — 28 minutes. `any`, `unknown`, `as` and the blind spots of the type system.
14. [Matt Pocock](https://www.mattpocock.com/): [Beginner's TypeScript](https://totaltypescript.com/tutorials/beginners-typescript) *(video)* — A free, interactive 18-lesson tutorial; variable, function and error types.
