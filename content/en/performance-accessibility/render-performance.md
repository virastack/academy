---
title: "Render performance in React"
description: "Unnecessary renders and expensive updates."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/render-performance"
---

## What a render is

In React, a **render** is React calling your component functions and working out what should be on screen. Every screen update goes through three steps: something **triggers** the render (the first load, or a state update), React **renders** the components, then **commits** the differences to the DOM. React only touches the DOM if there is a difference between two renders.[^1]

So a component re-rendering does not always mean the DOM changes; most re-renders are fast. The problem is usually the expensive work done during the render. As Kent C. Dodds puts it, even if all your renders are necessary, the user still has a bad experience if they are slow.[^2]

## Why React re-renders

Every re-render starts with a **state change**. The component whose state changed re-renders, and React re-renders **all** the components below it as well; whether or not they receive that state as a prop makes no difference.[^3] A component renders for four reasons: its own **state** changed, its **parent** rendered (rendering flows top-down; a child rendering does not render the parent), the value of a **context** it uses changed, or the state of a **hook** it uses changed.[^4]

> [!WARNING]
>
> "A component renders when its props change" is a common piece of misinformation. A component that does not use `memo` renders along with its parent even when its props stay the same. Props only start to matter once memoization is in play.[^3][^4]

## Don't optimise without measuring

### The React DevTools profiler

In the **Profiler** tab of the React Developer Tools extension you start a recording, perform the interaction that feels slow, and stop the recording. The result is split into **commits**; in each commit's **flame chart**, yellow bars show long renders and blue bars short ones, while grey ones did not render at all in that commit. The **ranked chart**, meanwhile, sorts the components by render time.[^5]

Two settings are especially useful:

- **Highlight updates:** the "Highlight updates when components render" option in the DevTools settings shows the components that rendered with a flashing outline on screen.[^3][^6] If the whole page flashes while you type into an input, you see at once that the state sits too high up.
- **The reason for a render:** the "Record why each component rendered while profiling" option in the Profiler settings records which prop or state caused a component to render.[^3]

> [!TIP]
>
> The milliseconds in development mode do not reflect reality. For an accurate result, take a production build and imitate a slow device with the CPU throttling in DevTools; your computer is most likely faster than your users'.[^3][^7]

### Performance tracks

With React 19.2, React adds its own tracks to the browser's **Performance** panel.[^8] When you record in the Performance panel you saw in the Measuring lesson, the **Scheduler** track shows at which priority the work was done (Blocking for a user interaction, Transition for `startTransition`) and the **cascading updates** that cause work to be redone from the start. The **Components** track gives the render times as a flamegraph; in a development build, clicking a render shows you the props that changed. The tracks are on in a development build and off in a production build, because they add overhead.[^9]

## React Compiler

**React Compiler** is a tool that analyses your code at build time and adds the memoization automatically. Its first stable release, v1.0, came out in October 2025.[^10] It does what the `memo`, `useMemo` and `useCallback` you write by hand do, on code that follows the Rules of React; you do not have to rewrite anything.[^11]

In Next.js 16 the `reactCompiler` option is stable; you install the package and turn it on in the config:[^12]

```command
npm install -D babel-plugin-react-compiler
```

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = { reactCompiler: true };
export default nextConfig;
```

There are official setup paths for Vite and Expo too; in Expo SDK 54 and later the compiler is on by default.[^10] To leave a component out of the compiler, write `"use no memo"` at the top of the function.[^12]

> [!DO]
>
> - In new code, leave the memoization to the compiler; use `useMemo`/`useCallback` only where you need fine control.[^10]
> - Do not delete your existing `useMemo`/`useCallback` calls in bulk when you turn the compiler on; deleting them can change the compiled result, so test first.[^10]

## When memo, useMemo and useCallback

If you do not use the compiler, or you need the escape hatch, there are three tools:

| Tool | What it stores | When |
| :-- | :-- | :-- |
| `memo` | The component's last render result | Components that render often with the same props and whose render is expensive |
| `useMemo` | The result of a calculation | A noticeably slow calculation, a prop for a `memo`-wrapped child, or another hook's dependency |
| `useCallback` | A function | When passing a function to a `memo`-wrapped child |

`memo` is a performance optimisation, not a guarantee. If there is no noticeable delay in the render, it is unnecessary.[^13] You can measure whether a calculation is expensive with `console.time`: if it takes 1ms or more in total, it is worth memoizing.[^7]

If you pass a `memo`-wrapped component an object or a function recreated on every render, `memo` does nothing at all; this is why `useMemo` and `useCallback` are usually used together with `memo`.[^13] Memoization is fragile for that reason: the moment someone else passes the component an inline object or JSX `children`, its effect is silently lost.[^14]

## Moving state down, and children

Before reaching for `memo`, changing the component structure is often enough.[^15][^13]

**Move the state down:** put the state in the smallest component that actually uses it. Then, when the state changes, only that component renders and the expensive tree next to it is unaffected. For example, if you move an input's state from the page's root into a small `Form` component containing the input, `<ExpensiveTree />` does not render while you type.[^15]

**Pass the content as children:** if the state has to sit above the expensive tree, move the stateful part into a wrapper that takes `children`. Because `children` is created in the parent, React does not re-render it when the wrapper's state changes.[^15][^13]

```tsx
function ColorPicker({ children }: { children: React.ReactNode }) {
  const [color, setColor] = useState("red");
  return (
    <div style={{ color }}>
      <input value={color} onChange={(e) => setColor(e.target.value)} />
      {children}
    </div>
  );
}

<ColorPicker>
  <ExpensiveTree />
</ColorPicker>;
```

The same list has two more rules: do not put temporary state such as an input's value or a hover into a global store or at the top of the tree, and keep renders pure. According to React, most performance problems come out of chains of Effects that update state.[^13]

> [!DONT]
>
> - Do not define a component inside another component. A new component is created on every render and React mounts it from scratch; that is slower than a re-render and it resets the state.[^4]

## Virtualization for long lists

In a list of thousands of rows the problem is not each row itself but the size of the DOM: the bigger the DOM, the bigger the browser's rendering work, and both the first load and the interactions get slower.[^16] **Virtualization** is the technique of putting only the rows visible on screen into the DOM and swapping them as you scroll.

The common choice in React is **TanStack Virtual**. It produces no markup (it is headless) and only works out which row goes where; it supports lists, grids and horizontal scrolling.[^17][^18] The setup is a single package:[^19]

```command
npm install @tanstack/react-virtual
```

```tsx
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

function LongList({ items }: { items: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
  });

  return (
    <div ref={parentRef} style={{ height: 400, overflow: "auto" }}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div key={row.key} style={{ position: "absolute", width: "100%", transform: `translateY(${row.start}px)` }}>
            {items[row.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

`count` is the total number of rows, `getScrollElement` the box that scrolls, and `estimateSize` a row's estimated height.[^17] If the page itself scrolls, `useWindowVirtualizer` is used.[^17]

## INP with useTransition and useDeferredValue

**Interaction to Next Paint (INP)** measures how long the screen takes to update after a click or a key press. The latency has three parts: the wait caused by the main thread being busy, the event handlers running, and the new frame being painted.[^16] In 2025, 77% of sites got a good INP on mobile and 97% on desktop.[^20]

A large render blocks the main thread and delays typing and clicking. React's concurrent features can pause a non-urgent render and give way to the browser, so typing stays smooth.[^21]

### useTransition

State updates inside `startTransition` are marked as a **transition**. Transitions do not block and can be interrupted: if the user clicks something else, React handles that first. With `isPending` you can show the waiting state.[^22]

```tsx
const [isPending, startTransition] = useTransition();

function selectTab(next: Tab) {
  startTransition(() => setTab(next));
}
```

> [!WARNING]
>
> Do not update a controlled text input's state inside a transition; the character typed has to appear immediately. Keep a separate, normal state for the input.[^22]

### useDeferredValue

It gives you a "lagging" copy of a value: React renders quickly with the old value first and tries the render with the new value in the background.[^23]

```tsx
const [text, setText] = useState("");
const deferredText = useDeferredValue(text);

<input value={text} onChange={(e) => setText(e.target.value)} />
<SlowList text={deferredText} /> {/* SlowList is wrapped in memo */}
```

This does not make `SlowList` faster; it only keeps it from blocking the key presses. `SlowList` has to be wrapped in `memo`, otherwise it renders on every key again and the gain is lost. The difference from debouncing is that you do not pick a fixed delay, and the work can be interrupted.[^23]

These two APIs do not help when a single component is expensive in itself, and they add CPU work; look at making the render faster first.[^21]

## Going deeper

- **Talk:** Nadia Makarevich's 23-minute talk on the reasons for re-renders and the composition techniques (React Summit 2022).[^24]
- **Talk:** Ivan Akulov's 23-minute talk explaining `startTransition` through a slow filter example (React Summit 2023).[^21]
- **Talk:** Ruslan Lesiutin's roughly 21-minute session showing how to profile with Performance Tracks (React Conf 2025, day 1 stream).[^25]
- **Article:** Nadia Makarevich's re-render guide; it collects the reasons, the patterns and the anti-patterns on one page.[^4]
- **Official docs:** React Compiler's installation, incremental adoption and troubleshooting pages.[^11]

## Sources

1. [React: Render and Commit](https://react.dev/learn/render-and-commit) *(doc)* — The trigger, render and commit steps, and React changing the DOM only when there is a difference.
2. [Kent C. Dodds: Fix the slow render before you fix the re-render](https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render) *(article)* — Finding and fixing the slow render before reducing re-renders.
3. [Josh W. Comeau: Why React Re-Renders](https://joshwcomeau.com/react/why-react-re-renders) *(article)* — Re-renders starting with state, the props myth, `memo` and the Profiler settings.
4. [Nadia Makarevich: React re-renders guide: everything, all at once](https://www.developerway.com/posts/react-re-renders-guide) *(article)* — The four reasons for a re-render, the composition patterns and the anti-patterns.
5. [React Blog, Brian Vaughn: Introducing the React Profiler](https://legacy.reactjs.org/blog/2018/09/10/introducing-the-react-profiler.html) *(doc)* — Recording in the Profiler, the commits, the flame chart colours and the ranked chart.
6. [react/react: Issue #17935](https://github.com/react/react/issues/17935) *(repo)* — A bug report about the "Highlight updates when components render" setting in DevTools.
7. [React: useMemo](https://react.dev/reference/react/useMemo) *(doc)* — Storing a calculation, measuring how expensive it is, and the CPU throttling recommendation.
8. [React Blog: React 19.2](https://react.dev/blog/2025/10/01/react-19-2) *(doc)* — The announcement of Performance Tracks and Activity.
9. [React: React Performance tracks](https://react.dev/reference/dev-tools/react-performance-tracks) *(doc)* — The Scheduler and Components tracks, and their use per build type.
10. [React Blog: React Compiler v1.0](https://react.dev/blog/2025/10/07/react-compiler-1) *(doc)* — The compiler's stable release, its setup and the recommendations about existing memoization.
11. [React: Introduction to React Compiler](https://react.dev/learn/react-compiler/introduction) *(doc)* — What the compiler does, a before/after example and the related documents.
12. [Next.js: reactCompiler](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler) *(doc)* — Turning the compiler on in Next.js 16, the annotation mode and `"use no memo"`.
13. [React: memo](https://react.dev/reference/react/memo) *(doc)* — When `memo` helps, and the principles that make memoization unnecessary.
14. [TkDodo: The Uphill Battle of Memoization](https://tkdodo.eu/the-uphill-battle-of-memoization) *(article)* — Why `memo` breaks so easily, and why composition should come first.
15. [Dan Abramov: Before You memo()](https://overreacted.io/before-you-memo/) *(article)* — Moving state down, and lifting content up as `children`.
16. [web.dev: Optimize Interaction to Next Paint](https://web.dev/articles/optimize-inp) *(doc)* — INP's three phases, yielding to the main thread and the effect of the DOM size.
17. [TanStack Virtual: React Virtual](https://tanstack.com/virtual/latest/docs/framework/react/react-virtual) *(doc)* — The `useVirtualizer` and `useWindowVirtualizer` options.
18. [GitHub: TanStack/virtual](https://github.com/TanStack/virtual) *(repo)* — The headless, framework-agnostic virtualization library.
19. [TanStack Virtual: Installation](https://tanstack.com/virtual/latest/docs/installation) *(doc)* — Installing the React package `@tanstack/react-virtual`.
20. [HTTP Archive: Web Almanac 2025, Performance](https://almanac.httparchive.org/en/2025/performance) *(research)* — The share of sites with a good INP on mobile and desktop.
21. [Ivan Akulov: React Concurrency, Explained (React Summit 2023)](https://gitnation.com/contents/react-concurrency-explained/video) *(video)* — 23 minutes. A filter that does not block typing with `startTransition`, and the cost of concurrency.
22. [React: useTransition](https://react.dev/reference/react/useTransition) *(doc)* — Transitions, `isPending` and the controlled input warning.
23. [React: useDeferredValue](https://react.dev/reference/react/useDeferredValue) *(doc)* — Deferring a value, the `memo` requirement and the difference from debouncing.
24. [Nadia Makarevich: Let's Talk about Re-renders (React Summit 2022)](https://gitnation.com/contents/lets-talk-about-re-renders) *(video)* — 23 minutes. The re-render triggers, the `memo` traps and composition.
25. [Ruslan Lesiutin: Profiling with React Performance Tracks (React Conf 2025)](https://www.youtube.com/watch?v=zyVRg2QR6LA&t=8276s) *(video)* — A roughly 21-minute session in the day 1 stream; debugging with Performance Tracks.
