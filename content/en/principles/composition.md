---
title: "Composition over Inheritance"
description: "Why composition, not inheritance, is used in React."
lastVerified: "2026-10-24"
translationKey: "principles/composition"
---

If you have done object-oriented programming in another language, you may be used to sharing common behaviour through inheritance. This guide answers a single question for [!react]: how do you share shared code? The answer: not with inheritance but with composition.

## Composition, not inheritance

**Inheritance** is a class deriving from another class and taking over its behaviour. **Composition** is a component building itself by using other components.

The React team's official position is clear: composition is recommended for sharing code. According to the documentation, React was used in thousands of components at Facebook and no case was found that required a component inheritance hierarchy. Props and composition give enough flexibility to customise a component's look and behaviour explicitly and safely.[^1]

```tsx
// ❌ Customising with inheritance
class DangerButton extends Button {}

// ✅ Composition: a new component that uses Button
function DangerButton(props: ButtonProps) {
  return <Button {...props} variant="danger" />
}
```

## Two patterns: containment and specialization

In the documentation, composition is explained with two patterns.[^1]

| Pattern | When? | How? |
| --- | --- | --- |
| **Containment** | When the component does not know what will be put inside it (`Dialog`, `Sidebar`) | The `children` prop, or a named prop (`left`, `right`) |
| **Specialization** | When a special case of a generic component is needed | The special component renders the generic one and configures it with props |

```tsx
function Dialog({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section role="dialog" aria-label={title}>
      {children}
    </section>
  )
}

// Specialization: a special case of Dialog
function ConfirmDeleteDialog() {
  return (
    <Dialog title="Delete this?">
      <p>This action cannot be undone.</p>
    </Dialog>
  )
}
```

The details of `children` and named slots are in the [Props and composition](/academy/react/props-and-composition) guide. The large-scale pattern, the compound component, is in the [Component and code organisation](/academy/architecture/component-organization) guide. We are not repeating either here.

## Sharing logic: mixins, HOCs, hooks

Composition is needed not only for the look but for sharing **logic** too. In React that job has been done three ways over time.

**A mixin.** It was a structure that mixed shared behaviour into a component from outside. The React team found mixins problematic: the component and the mixin become implicitly coupled to each other's methods, two mixins using the same method name cannot work together, and the complexity grows over time.[^2]

**A higher-order component (HOC).** A function that takes a component and returns a new one. Instead of changing the original, it wraps it in a container.[^3] According to the documentation, HOCs should not be applied inside a render, because a new component type is created on every render and the subtree's state is lost.[^3] The same page also notes that HOCs are not widely used in modern React code.[^3]

**A custom hook.** Sharing logic with HOCs and render props requires rearranging the component tree, and that leads to nested wrappers ("wrapper hell") in DevTools. Hooks let you share logic without changing the hierarchy.[^4]

```tsx
import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine, // the value on the client
    () => true, // the value on the server
  )
}
```

Two components such as `StatusBar` and `SaveButton` make the same `useOnlineStatus()` call and know nothing about the detail of watching the browser event.[^5] A hook shares **logic**, not state: every caller gets its own state.[^5] The name starting with `use` is a convention too: from the call site you see that state or an Effect may be hidden inside.[^5]

## When you don't need it

> [!CAUTION]
>
> Composition does not mean breaking everything apart.
>
> - **Do not extract every repetition into a hook.** According to the documentation, a little repetition is not a problem. Wrapping a single `useState` is usually unnecessary.[^5]
> - **Do not write generic "lifecycle" hooks such as `useMount`.** The documentation does not recommend them: the linter checks direct `useEffect` calls and not a wrapped one, so a missing dependency error goes unnoticed.[^5]
> - **A hook may not be needed.** In the documentation's example, a fade-in animation is solved more simply and more efficiently with plain CSS animation than with a hook.[^5]
> - **If you see a HOC in old code**, do not rewrite it right away. If it works, leave it, and prefer a hook in new code.

## Sources

1. [React: Composition vs Inheritance](https://legacy.reactjs.org/docs/composition-vs-inheritance.html) *(doc)* — Containment (`children`, a named prop), specialization, and the finding that no case required inheritance. The legacy version of the documentation, under legacy.reactjs.org.
2. [Dan Abramov: Mixins Considered Harmful](https://legacy.reactjs.org/blog/2016/07/13/mixins-considered-harmful.html) *(article)* — On the React team's blog. The implicit coupling, name clashes and growing complexity of mixins. July 13, 2016.
3. [React: Higher-Order Components](https://legacy.reactjs.org/docs/higher-order-components.html) *(doc)* — The definition of a HOC, not changing the original, and the warning about applying one inside a render. The page notes that HOCs are not common in modern React code and points to react.dev.
4. [React: Introducing Hooks](https://legacy.reactjs.org/docs/hooks-intro.html) *(doc)* — The motivation for hooks: the "wrapper hell" caused by render props and HOCs, and sharing logic without changing the hierarchy. The legacy version of the documentation, under legacy.reactjs.org.
5. [React: Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) *(doc)* — Hooks sharing logic and not state, the `use` prefix, not extracting every repetition, and the `useMount` warning.
