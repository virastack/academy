---
title: "JavaScript"
description: "The basics of the language, the DOM and asynchronous flow."
lastVerified: "2026-10-17"
translationKey: "web-fundamentals/javascript"
---

## What JavaScript is

[!javascript] is the programming language that makes web pages interactive. [!html] defines the content and [!css] the appearance; when a page does more than show fixed information *(a menu opens, a form is validated, data arrives from a server)*, JavaScript is behind it.[^1] The same language also runs outside the browser with [!nodejs]; the development server, the build tools and the packages in a [!react] project are JavaScript too.

This lesson does not cover the whole language. It touches briefly on what you need before moving to React, and points to a source for going deeper on each topic.

JavaScript is added to a page with a `<script>` tag. The modern way is `type="module"`; module scripts wait until the HTML has been parsed, which makes them safe to put in the `<head>`.[^1]

```html
<script type="module" src="main.js"></script>
```

The quickest way to try something is the browser's DevTools console: open it on any page and type `console.log("hello")`.

## Variables and types

There are three ways to declare a variable. `var` is old and has error-prone behaviour, so it is no longer used.[^2]

```js
const site = "ViraStack"; // cannot be reassigned
let count = 0; // can be reassigned
count = count + 1;
```

MDN's rule is short: *"Use `const` when you can, and use `let` when you have to."*[^2] `const` stops the variable from being reassigned; it does not stop the object inside it from changing.

JavaScript is a **dynamically typed** language: you do not declare a variable's type, and the same variable can hold values of different types. The basic *(primitive)* types are `string`, `number`, `boolean`, `null`, `undefined`, `bigint` and `symbol`; everything else *(arrays and functions included)* is an **object**.[^3]

The language converts between types on its own when it has to. That is why comparisons use `===`; `==` converts first, and the result is hard to predict.[^4]

```js
0 == "0"; // true
0 === "0"; // false
```

> [!NOTE]
>
> To catch type errors before the code runs, most JavaScript projects now use TypeScript. In State of JS 2025, 40% of respondents said they write TypeScript only.[^5] TypeScript gets its own section later in this roadmap.

## Functions

A function is a reusable block of code. Two ways of writing one are common: the classic **function declaration** and the shorter **arrow function**.[^6]

```js
function add(a, b) {
  return a + b;
}

const multiply = (a, b = 1) => a * b; // b is 1 when nothing is passed
```

React components and event handlers are mostly written as arrow functions.

### Closure

A function **remembers** the variables where it was defined, even after that scope has finished. This is called a **closure**.[^6][^7]

```js
function createCounter() {
  let count = 0;
  return () => ++count;
}

const increment = createCounter();
increment(); // 1
increment(); // 2
```

Closures are the basis for understanding how hooks and event handlers work in React: a function inside a component "remembers" the state from the render it was created in.

## Objects and arrays

An **object** is made of key and value pairs, an **array** of ordered values. Data from a server is nearly always a combination of the two.

```js
const user = { name: "Jane", age: 28 };
const products = [
  { name: "Pen", price: 20 },
  { name: "Notebook", price: 45 },
];
```

### Destructuring and spread

**Destructuring** pulls values out of an object or an array into variables in a single line. **Spread** *(`...`)* unpacks an object or an array inside another one.[^8][^9]

```js
const { name, age } = user;
const updatedUser = { ...user, age: 29 }; // a new object; the original is untouched
const allProducts = [...products, { name: "Eraser", price: 10 }];
```

Spread makes a **shallow copy**: nested objects are not copied, and the same reference is shared.[^9] In React you build a new copy this way instead of changing state in place.

### Array methods

These are the methods you will use most:[^10]

| Method | What it does |
| :-- | :-- |
| `map` | Transforms every item and returns a **new** array |
| `filter` | Returns a **new** array of the items that match a condition |
| `find` | Returns the first item that matches a condition |
| `reduce` | Reduces the array to a single value *(a total, for instance)* |

```js
const names = products.map((p) => p.name); // ["Pen", "Notebook"]
const cheapProducts = products.filter((p) => p.price < 30);
const total = products.reduce((sum, p) => sum + p.price, 0); // 65
```

> [!WARNING]
>
> `sort`, `reverse` and `splice` change the original array.[^10] Copy it before using them on React state: `[...items].sort()`.

Two short operators help with values that may be missing: `user.address?.city` returns `undefined` instead of throwing when there is no `address`, and `value ?? "default"` uses the right-hand side when the value is `null` or `undefined`.[^11]

## The DOM and events

The browser reads your HTML and turns it into a tree called the **DOM** *(Document Object Model)*. JavaScript can reach into that tree to read and change the content.[^12]

```js
const heading = document.querySelector("h1");
heading.textContent = "New title";
heading.classList.add("active");
```

**Events** are things that happen in the system and that your code can react to: a click, a key press, a form being submitted. To react to one, use `addEventListener`.[^13]

```js
const form = document.querySelector("form");

form.addEventListener("submit", (e) => {
  e.preventDefault(); // stops the page from reloading
  console.log("Form submitted");
});
```

> [!TIP]
>
> In React you do not change the DOM by hand like this; you update state and React updates the DOM for you. Knowing what happens underneath still makes it easier to see why React does what it does.

## Asynchronous flow

Work such as fetching data from a server takes time. Rather than waiting, JavaScript carries on and continues once the result arrives. That wait is represented by a **Promise**: an object carrying the result of an operation that will either complete or fail later.[^14]

The readable way to work with promises is `async`/`await`. `await` makes the code read from top to bottom like synchronous code, and errors are caught with `try`/`catch`.[^15]

```js
async function fetchProducts() {
  try {
    const response = await fetch("/api/products");
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    const products = await response.json();
    console.log(products);
  } catch (error) {
    console.error(error);
  }
}
```

> [!CAUTION]
>
> `fetch` does not throw when the server returns a 404 or a 500; it only fails on a network error. That is why `response.ok` always has to be checked.[^16]

### The event loop

JavaScript runs on a single thread and finishes one piece of work before it moves to the next.[^17] Waiting work *(timers, settled promises, clicks)* lines up in a queue, and the **event loop** runs them in turn. The shortest way to see this is Lydia Hallie's 12-minute video.[^18]

## Modules

As a project grows, the code is split across files. Each file is a **module**: it hands out what it wants to share with `export` and takes what it needs from another file with `import`.[^19]

```js
// price.js
export const TAX_RATE = 0.2;
export default function addTax(amount) {
  return amount * (1 + TAX_RATE);
}

// main.js
import addTax, { TAX_RATE } from "./price.js";
```

The ones in curly braces are **named exports**, and there can be as many as you like. The one without braces is the **default export**, one per module.[^19] In a React project every component is a module, and you will see both forms constantly.

## Going deeper

- **Guide from start to finish:** javascript.info; the language and browser *(DOM, events)* sections, kept current.[^20]
- **Hands-on course:** MDN's Dynamic scripting with JavaScript module.[^21]
- **Free book:** the 4th edition of [Marijn Haverbeke](https://marijnhaverbeke.nl/)'s Eloquent JavaScript.[^22]
- **Checklist before React:** [Kent C. Dodds](https://kentcdodds.com/)'s "JavaScript to Know for React".[^11]
- **Talk:** [Philip Roberts](http://latentflip.com/) on the event loop *(JSConf EU 2014, 27 min)*.[^23]
- **Talk:** [Jake Archibald](https://jakearchibald.com/) on the browser's event loop *(JSConf.Asia 2018, 35 min)*.[^24]

## Sources

1. [MDN: What is JavaScript?](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/What_is_JavaScript) *(doc)* — What the language is and how to add a script to a page (`defer`, `async`, `type="module"`).
2. [MDN: Storing the information you need — Variables](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Variables) *(doc)* — The difference between `var`, `let` and `const`; "Use `const` when you can, and use `let` when you have to."
3. [MDN: JavaScript data types and data structures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures) *(doc)* — The primitive types, and the dynamic and weak type system.
4. [MDN: Equality comparisons and sameness](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness) *(doc)* — Using `===` almost always, and avoiding `==`.
5. [InfoQ: State of JavaScript 2025](https://www.infoq.com/news/2026/03/state-of-js-survey-2025) *(research)* — The share writing TypeScript only, and missing static types as the language's biggest pain point.
6. [MDN: Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions) *(doc)* — Declarations, expressions, arrow functions, default parameters and closures.
7. [javascript.info: Variable scope, closure](https://javascript.info/closure) *(article)* — Closures explained step by step, with diagrams.
8. [MDN: Destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring) *(doc)* — Object and array destructuring, default values and rest.
9. [MDN: Spread syntax (...)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax) *(doc)* — Spread in arrays and objects; the shallow copy.
10. [javascript.info: Array methods](https://javascript.info/array-methods) *(article)* — `map`, `filter`, `find` and `reduce`; which methods change the original and which return a new array.
11. [Kent C. Dodds](https://kentcdodds.com/): [JavaScript to Know for React](https://kentcdodds.com/blog/javascript-to-know-for-react) *(article)* — The JS features React needs: destructuring, spread, array methods, `?.`, `??` and async/await.
12. [MDN: DOM scripting introduction](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/DOM_scripting) *(doc)* — The DOM tree, `querySelector`, `textContent` and `classList`.
13. [MDN: Introduction to events](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Events) *(doc)* — `addEventListener`, the event object and `preventDefault`.
14. [MDN: Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) *(doc)* — What a promise is, chaining and `Promise.all`.
15. [MDN: How to use promises](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS/Promises) *(doc)* — The same `fetch` example, first as a promise chain and then with `async`/`await`.
16. [MDN: Using the Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) *(doc)* — `fetch` not rejecting on HTTP errors, and checking `response.ok`.
17. [MDN: JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model) *(doc)* — The job queue, the event loop and run-to-completion.
18. [Lydia Hallie: JavaScript Visualized - Event Loop, Web APIs, (Micro)task Queue](https://www.youtube.com/watch?v=eiC58R16hb8) *(video)* — About 12 minutes. The call stack and the task and microtask queues, animated.
19. [MDN: JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) *(doc)* — `export`/`import`, named and default exports, `type="module"`.
20. [javascript.info: The Modern JavaScript Tutorial](https://javascript.info/) *(doc)* — A JavaScript guide from start to finish, with language and browser sections.
21. [MDN: Dynamic scripting with JavaScript](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting) *(doc)* — A hands-on module from variables to the DOM, `fetch` and JSON.
22. [Marijn Haverbeke](https://marijnhaverbeke.nl/): [Eloquent JavaScript, 4th edition](https://eloquentjavascript.net/) *(article)* — A 2024 book, free to read, with language, browser and Node sections.
23. [Philip Roberts](http://latentflip.com/): [What the heck is the event loop anyway? (JSConf EU 2014)](https://www.youtube.com/watch?v=8aGhZQkoFbQ) *(video)* — 27 minutes. A visual walk through the call stack and the callback queue.
24. [Jake Archibald](https://jakearchibald.com/): [In The Loop (JSConf.Asia 2018)](https://www.youtube.com/watch?v=cCOL7MC4Pl0) *(video)* — 35 minutes. Tasks, microtasks, `requestAnimationFrame` and render order.
