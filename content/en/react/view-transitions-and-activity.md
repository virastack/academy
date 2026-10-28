---
title: "View Transition and Activity"
description: "Animating transitions and keeping the state of a hidden screen."
lastVerified: "2026-10-21"
translationKey: "react/view-transitions-and-activity"
---

## Two new components

React 19.2 made `<Activity>` stable and React 19.3 did the same for `<ViewTransition>`.[^1][^2] Both answer the same question: what should happen as the interface moves from one state to another? `ViewTransition` **animates** the change, `Activity` **keeps the state** of the part being hidden.

## ViewTransition

`<ViewTransition>` connects the browser's View Transition API to React. Wrapping the part you want animated is enough:[^2][^3]

```tsx
import { startTransition, useState, ViewTransition } from "react";

function SizeGuideToggle() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => startTransition(() => setIsOpen((open) => !open))}>
        Size guide
      </button>
      {isOpen && (
        <ViewTransition>
          <SizeGuide />
        </ViewTransition>
      )}
    </>
  );
}
```

> [!WARNING]
>
> The animation only runs when the update is a **Transition**: `startTransition`, a Suspense boundary revealing, or `useDeferredValue`. A plain `setState` is urgent and is applied without animation.[^3] This is the most common cause of "the animation doesn't work".

React looks at how the tree changed and picks the kind of animation itself:[^3]

| Kind | When |
| :-- | :-- |
| `enter` | When a `ViewTransition` is added |
| `exit` | When a `ViewTransition` is removed |
| `update` | When its content or size changes |
| `share` | When one with the same `name` is removed and another added |

The default animation is the browser's cross-fade. To customise it, you give the kind a **View Transition Class** and style it in CSS with the view transition pseudo-elements:[^3]

```tsx
<ViewTransition enter="slide-up" exit="slide-down">
  <CartDrawer />
</ViewTransition>
```

```css
::view-transition-new(.slide-up) {
  animation: 250ms ease-out both slide-from-bottom;
}
::view-transition-old(.slide-down) {
  animation: 200ms ease-in both slide-to-bottom;
}
```

A few rules:

- **Give a `name` for a shared element transition.** When the product image on the list page and the large image on the detail page carry the same `name`, React moves the image from its place and grows it as one disappears and the other arrives. A `name` has to be unique in the application at any one time; use a prefix such as `` name={`product-${id}`} ``. In other cases do not give a name and React assigns one.[^3]
- **State the direction with `addTransitionType`.** In a gallery, forward and back change the same state but should slide in different directions; you add a type to the transition and pick the class by that type.[^2][^3]
- **`enter`/`exit` only work at the top.** If there is a DOM element above the `ViewTransition`, the enter and exit animations are not triggered.[^3]
- **Do not call `startViewTransition` yourself.** React calls it, and it interrupts any other View Transition.[^3]

### With Suspense

When a `<ViewTransition>` wraps a Suspense boundary, React animates the move from the skeleton to the content. With 19.3, React waits up to 500 ms for visible images and new fonts before the reveal animation; the content image appears in place and the text does not flash in the wrong font.[^2][^4]

```tsx
<ViewTransition>
  <Suspense fallback={<ProductSkeleton />}>
    <ProductDetails id={id} />
  </Suspense>
</ViewTransition>
```

### Accessibility

React **does not turn animations off by itself** for users who want less motion. The documentation's advice: always turn them off, or soften them, with `prefers-reduced-motion`.[^3]

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

The detail on the subject is in the [Colour, contrast and motion](/academy/performance-accessibility/color-contrast-and-motion) lesson.

## Activity

`<Activity>` **hides** a part without removing it from the screen. With `mode="hidden"`, React hides the children with `display: none` and tears down their Effects. Back on `visible`, the state and the DOM come back as they were and the Effects are set up again.[^5]

```tsx
import { Activity, useState } from "react";

function ProductTabs() {
  const [tab, setTab] = useState<"details" | "reviews">("details");

  return (
    <>
      <TabBar value={tab} onChange={setTab} />
      <Activity mode={tab === "details" ? "visible" : "hidden"}>
        <ProductDescription />
      </Activity>
      <Activity mode={tab === "reviews" ? "visible" : "hidden"}>
        <ReviewList />
      </Activity>
    </>
  );
}
```

How it differs from conditional rendering:

| | `{isOpen && <Panel />}` | `<Activity mode>` |
| :-- | :-- | :-- |
| State when hidden | Discarded | Kept |
| DOM when hidden | Removed | `display: none` |
| Effects when hidden | Torn down | Torn down |
| Reopening | Mounted from scratch | Instant, where it left off |

The typical uses: a review draft the user typed should not be lost when the tab changes, a side menu that was closed should remember its scroll position. You can also pre-render a screen the user will **probably** open in hidden mode and have its data ready; a hidden part is rendered at a lower priority.[^5][^6]

> [!TIP]
>
> If the hidden part contains video, audio or a timer, stop it in the Effect cleanup. Activity tears the Effects down, but the `<video>` element stays in the DOM and may carry on playing by itself.[^5]

## Try it yourself

- Remove `startTransition` from `SizeGuideToggle`; what happened to the animation?
- Write the `slide-up`/`slide-down` classes and the `@keyframes` for `CartDrawer`, then turn on "reduce motion" in your operating system and try again.
- Give the image on the product card and the one on the detail page the same `name` and watch the page transition.
- Type something into the review form in `ProductTabs`, switch tabs and come back. Then use `&&` instead of `Activity` and try again.

## Going deeper

- **Official docs:** the `<ViewTransition>` reference; examples of entering and exiting, shared elements, list ordering, Suspense and animating with JavaScript.[^3]
- **Video:** [Chance Strickland](https://chance.dev/)'s "View Transitions and Activity" talk, prepared together with the React team *(React Conf 2025, day 1)*.[^7]
- **Official docs:** React Labs' April 2025 post; why and how the two features were designed.[^6]

## Sources

1. [React Blog: React 19.2](https://react.dev/blog/2025/10/01/react-19-2) *(doc)* — October 1, 2025. The stable release of `<Activity>`.
2. [React Blog: React 19.3](https://react.dev/blog/2026/09/09/react-19-3) *(doc)* — September 9, 2026. `<ViewTransition>`, `addTransitionType`, and waiting for images and fonts with Suspense.
3. [React: ViewTransition](https://react.dev/reference/react/ViewTransition) *(doc)* — The triggers, View Transition Classes, `name`, the top-level rule and the `prefers-reduced-motion` note.
4. [React: Suspense, What activates a Suspense boundary](https://react.dev/reference/react/Suspense#what-activates-a-suspense-boundary) *(doc)* — The 500 ms wait for images and fonts when a ViewTransition is present.
5. [React: Activity](https://react.dev/reference/react/Activity) *(doc)* — `display: none` in hidden mode, Effects being torn down, state being kept, and the warning about media.
6. [React Blog: React Labs, View Transitions, Activity, and more](https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more) *(doc)* — April 23, 2025. The experimental announcement of the two features and the reasoning behind them.
7. [Chance Strickland](https://chance.dev/): [View Transitions and Activity (React Conf 2025)](https://www.youtube.com/watch?v=zyVRg2QR6LA&t=4870s) *(video)* — Day 1 stream. Animations that feel natural with `<Activity>` and `<ViewTransition>`.
