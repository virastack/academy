---
title: "Refs and the DOM"
description: "Reaching the DOM, the ref prop, ref callback cleanup and Fragment refs."
lastVerified: "2026-10-21"
translationKey: "react/refs-and-dom"
---

## What a ref is

A **ref** is a box that is kept between renders but **does not trigger** a render when it changes. `useRef` returns an object whose value is in the `current` field.[^1]

| | State | Ref |
| :-- | :-- | :-- |
| When it changes | Triggers a render | Triggers no render |
| Changing it | Through a setter | `ref.current = ...` |
| Reading during render | Allowed | Should not be read |
| Used for | Data shown on screen | A timer id, a DOM element, a previous value |

The React documentation describes a ref as an **escape hatch**: it is for talking to something outside React. If your application's logic flows through refs, reconsider the approach.[^1]

> [!WARNING]
>
> Do not read or write `ref.current` during render. If the value decides something on screen, it should be state. `eslint-plugin-react-hooks`'s `refs` rule catches this.[^2][^1]

## Reaching a DOM element

Most work is done declaratively, but some things have no JSX equivalent: focusing, scrolling somewhere, playing a video, measuring an element. For that you pass the ref to the `ref` attribute in the JSX, and React puts the DOM element into `current`.[^3]

```tsx
import { useRef } from "react";

export function SearchBox() {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input ref={inputRef} type="search" placeholder="Search products" />
      <button onClick={() => inputRef.current?.focus()}>Search</button>
    </>
  );
}
```

`current` is `null` on the first render; React attaches the ref during the commit, after it has updated the DOM. That is why refs are reached in event handlers or in Effects.[^3]

## Giving a ref to your own component

Since React 19, `ref` is an ordinary prop on function components. `forwardRef` is no longer needed and will be removed in future.[^4]

```tsx
function TextField({ ref, ...props }: React.ComponentProps<"input">) {
  return <input ref={ref} className="text-field" {...props} />;
}

<TextField ref={inputRef} placeholder="Email" />;
```

If you want the parent to reach only a few methods rather than the whole DOM element, you can expose a small API with `useImperativeHandle`. Use it sparingly; a prop such as `isOpen` is usually better than methods such as `open()` and `close()`.[^3][^5]

> [!DONT]
>
> - Changing the DOM React manages through a ref: removing the element, adding children to it. React tries to put the DOM back the way it believes it should be on the next render, and raises an error. Use a ref only for things React does not touch *(focus, scrolling, measuring)*.[^3]

## Ref callbacks and cleanup

You can also pass a function to `ref` instead of an object. React calls the function with the element once it has been added to the DOM. In React 19 that function can return a **cleanup**, which is called when the element is removed.[^6][^4]

```tsx
function measure(node: HTMLElement) {
  const observer = new ResizeObserver(([entry]) => {
    console.log("Card width:", entry.contentRect.width);
  });
  observer.observe(node);
  return () => observer.disconnect();
}

<article ref={measure}>...</article>;
```

[TkDodo](https://tkdodo.eu/)'s rules for choosing between a ref callback and an Effect:[^7]

- **When you need the DOM element**, prefer a ref callback; it is shorter than `useRef` + `useEffect`, and it is tied to the element's render rather than the parent's. When the function does not depend on the component, move it outside the component as above; it is then not recreated on every render.
- **For a side effect that has nothing to do with the element** *(`document.title`, for instance)* do not use a ref; an Effect is clearer.
- **For asynchronous work**, neither of them; a data-fetching library.

In development, Strict Mode also sets up and tears down ref callbacks one extra time; a missing cleanup shows up here.[^6]

## Fragment refs

With React 19.3 a `<Fragment>` can take a ref. Without adding a wrapping `<div>`, you work with all the sibling elements a component renders as a group. The `FragmentInstance` you get back offers methods for focus *(`focus`, `focusLast`, `blur`)*, for adding event listeners and for attaching an `IntersectionObserver` or a `ResizeObserver`.[^8][^9]

```tsx
import { Fragment, useEffect, useRef } from "react";

function FocusTrap({ children }: { children: React.ReactNode }) {
  const fragmentRef = useRef<React.FragmentInstance>(null);

  useEffect(() => {
    fragmentRef.current?.focus(); // focus the first focusable child
  }, []);

  return <Fragment ref={fragmentRef}>{children}</Fragment>;
}
```

It is especially useful for adding behaviour to components you do not control *(a library's list, say)*; you do not have to change the component's internals.[^8] The accessibility side of focus management is in the [Keyboard and focus management](/academy/performance-accessibility/keyboard-and-focus) lesson.

## Portals

Elements such as a modal, a tooltip and a toast should sit visually at the top of the page, while in the component tree they live next to the component that opens them. `createPortal` renders JSX somewhere else in the DOM *(usually `document.body`)*; events and context keep working according to its position in the React tree.[^10] For simple dialogs, look at the built-in `<dialog>` element first; the [HTML](/academy/web-fundamentals/html) lesson covers it.

## Try it yourself

- Make `SearchBox` focus the input when the page opens. Write it first with `useEffect`, then with a ref callback.
- Write the ref callback that measures a product card's width with a `ResizeObserver`; delete the cleanup and hide and show the card a few times.
- Try printing `inputRef.current?.value` to the screen during render and read the linter's warning.
- Remove the `<div>` wrapping a list and add "log when it becomes visible" behaviour with a Fragment ref instead.

## Going deeper

- **Official docs:** "Referencing Values with Refs" and "Manipulating the DOM with Refs"; together they are the whole subject.[^1][^3]
- **Article:** [TkDodo](https://tkdodo.eu/) reassessing ref callbacks in the light of React 19 and the compiler.[^7]
- **Official docs:** the Fragment Refs section of the React 19.3 announcement; the `InView` example.[^8]

## Sources

1. [React: Referencing Values with Refs](https://react.dev/learn/referencing-values-with-refs) *(doc)* — The difference between a ref and state, when to use one, and not reading it during render.
2. [React: refs lint](https://react.dev/reference/eslint-plugin-react-hooks/lints/refs) *(doc)* — The rule that catches reading and writing `ref.current` during render.
3. [React: Manipulating the DOM with Refs](https://react.dev/learn/manipulating-the-dom-with-refs) *(doc)* — Focus, scrolling, when the ref is attached, and not changing React's DOM.
4. [React v19](https://react.dev/blog/2024/12/05/react-19) *(doc)* — `ref` as a prop, `forwardRef` being removed in future, and ref callback cleanup.
5. [React: useImperativeHandle](https://react.dev/reference/react/useImperativeHandle) *(doc)* — Exposing a limited ref API, and not putting into a ref what a prop can express.
6. [React: Common components, ref callback](https://react.dev/reference/react-dom/components/common#ref-callback) *(doc)* — When a ref callback is called, the cleanup, and the Strict Mode behaviour.
7. [TkDodo](https://tkdodo.eu/): [Ref Callbacks, React 19 and the Compiler](https://tkdodo.eu/blog/ref-callbacks-react-19-and-the-compiler) *(article)* — December 8, 2024. Cleanup with a `ResizeObserver`, and choosing between a ref callback and an Effect.
8. [React Blog: React 19.3](https://react.dev/blog/2026/09/09/react-19-3) *(doc)* — September 9, 2026. Fragment Refs becoming stable, and the `FragmentInstance` methods.
9. [React: Fragment](https://react.dev/reference/react/Fragment) *(doc)* — The `<Fragment ref>` and `FragmentInstance` reference.
10. [React: createPortal](https://react.dev/reference/react-dom/createPortal) *(doc)* — Rendering somewhere else in the DOM, and the event and context behaviour.
