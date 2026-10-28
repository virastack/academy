---
title: "Component and code organisation"
description: "Splitting components, separating shared code and keeping the boundaries."
lastVerified: "2026-10-15"
translationKey: "architecture/component-organization"
---

In [the previous guide](/academy/architecture/folder-structure) we set the folder structure up. This guide answers three questions inside that structure: when a component is split, where state and logic go, and how the boundaries stay unbroken.

## When should you split a component?

Writing a whole React application as a single component is technically possible. The problems [Kent C. Dodds](https://kentcdodds.com) lists are the reason for splitting: the whole application re-rendering on every state change, sharing code getting harder, confusion about which state belongs to which JSX, tests that cannot be isolated, and merge conflicts in team work.[^1] His advice is clear: split when you hit one of those problems, not before. Every split is an abstraction and has a cost. A long piece of JSX comes cheaper than an early split that leads to prop drilling.[^1]

The React documentation gives a criterion too: a component should ideally deal with a single thing, and should be split into child components as it grows. Whether to separate parts such as a table header is a matter of preference; once the header gets complicated with features such as sorting, it moves into its own component.[^2]

| Split | Don't split |
| --- | --- |
| The component started dealing with more than one thing[^2] | Just because the JSX is long |
| The same part will be used in more than one place[^1] | For a three-line part used in one place |
| You want to test a part in isolation[^1] | If splitting will cause prop drilling[^1] |

## Composition instead of adding a prop

Adding a prop to a component for every new need is easy. As booleans such as `showPrice`, `compact` and `onSale` multiply, so do the conditions inside. Composition, on the other hand, spreads the responsibility across small components that work together.[^3]

```tsx
// ❌ Every need is a new prop
<ProductCard showPrice showBadge compact onSale />

// ✅ The caller picks the parts it needs
<ProductCard>
  <ProductCard.Image src={product.image} alt={product.name} />
  <ProductCard.Title>{product.name}</ProductCard.Title>
  <ProductCard.Price value={product.price} />
</ProductCard>
```

This pattern is called a **compound component**: the root component holds the shared state and context, and the inner parts use it.[^3]

The pattern has two implementations, with different trade-offs. With `React.Children.map` the root passes props to its children through `cloneElement`. That is simple, but only the direct children get props, it breaks if you put a wrapper in between, and props with the same name can be silently overridden. The context-based route lets you place the children at any depth, and that is the route recommended after React 18. Memoizing or splitting the context value prevents unnecessary renders.[^4] React's `children` prop is the basis of all this. It leaves a fillable *"hole"* in a component, and the component does not have to know what is put inside.[^5]

[Fernando Rojo](https://fernandorojo.co) explains why this pattern is better than boolean props at React Universe Conf 2025, through Slack's message composer. Managing scenarios such as a channel message, a DM, forwarding and editing in a single component with booleans such as `isDMThread` and `isEditingMessage` piles the conditions up and turns the component into a monolith that is hard to maintain. His fix is splitting the component into parts such as `Header`, `Input` and `Footer`, and writing only the parts each screen needs into the JSX. The shared data and actions live in a `ComposerProvider` context. You say what should appear with JSX, not what to hide with a boolean. [Rojo](https://fernandorojo.co) also notes that a pile of booleans raises the risk of mistakes for developers and AI tools alike.[^6]

> [!WARNING]
>
> **Use spread sparingly.** According to the React documentation, if `{...props}` turns up in every second component, something is wrong. Most of the time you need to split the components up and pass `children`.[^5]

## Keep the state close

Global state is one of the most common causes of slow React applications, especially fast-changing state. The higher the state sits in the tree, the more every update makes the whole tree be checked. The lower you take it, the less React has to check.[^7] If more than one component needs the same state, its place is their closest common parent.[^2][^7]

| Who uses the state? | Where does it live? |
| --- | --- |
| Only this component | Inside the component |
| Only one child | Move it to that child |
| Siblings or the parent | Lift it to the closest common parent |
| There is a prop drilling problem | A Context provider if the child can work without the parent, composition if it cannot |
| Really application-wide | A global store |

This is [Kent C. Dodds](https://kentcdodds.com)'s decision tree.[^7] The text of the search box in a product list, for example, lives in the closest component wrapping the box and the list, and does not go to a global store. Only data that really is application-wide enters a global store.[^7]

The emphasis in [Rojo](https://fernandorojo.co)'s talk does not contradict this, it completes it: keeping state *close* means putting it in the common parent of the things that use it. [Rojo](https://fernandorojo.co) says he solved many problems by moving the state up the tree. Elements outside the box, such as a "Forward" button elsewhere on the page, then reach the same state and actions without prop drilling.[^6] The criterion is the same: keep the state at the closest common point of the things that use it, and no lower.

## Separate the logic into a hook

A hook shares logic, not state. If you call the same hook in two components, two independent states are created. If you need shared state, lift it up and pass it down.[^8]

- **If you are writing an Effect, consider wrapping it in a hook.** The data flow becomes clear, and the component says "what", not "how".[^8]
- **Do not write a hook just to wrap a single `useState`.** A little repetition is not a problem.[^8]
- **Give the `use` prefix only to a function that calls another hook inside it.** If it does not, write a normal function such as `getSorted`.[^8]
- **Do not write lifecycle hooks.** Instead of `useMount` and `useEffectOnce`, write hooks with a concrete purpose, such as `useData(url)` and `useChatRoom(options)`.[^8]

A hook used by a single feature stays under `features/[feature]/hooks/`, and moves to the global `hooks/` folder once two features use it. The rule for moving it is the one from [the previous guide](/academy/architecture/folder-structure).

## The server and client boundary (Next.js)

In the [!nextjs] App Router, layouts and pages are Server Components by default. A Client Component is used when state, an event handler, a browser API or a custom hook is needed.[^9] The splitting decision also affects the JavaScript size here:

- **`'use client'` goes on the interactive leaf.** When a file takes that directive, everything it imports and the components it renders directly enter the client bundle. In a layout, for example, only the search box becomes client, and the logo and the links stay on the server.[^9]
- **Pass a Server Component to a client component as `children`.** `<CartModal>` opens and closes with client state, while the `<CartItems />` inside it is rendered on the server.[^9]
- **Render the providers as low in the tree as possible.** Write a client component that takes `children` for that.[^9]
- **Add `import 'server-only'` to a file that uses a secret key.** If it is imported into the client by accident, the build fails.[^9]

```tsx
// app/cart/page.tsx (a Server Component)
<CartModal>
  <CartItems /> {/* rendered on the server */}
</CartModal>
```

## While separating shared code

You saw the rule for separating shared code in [the previous guide](/academy/architecture/folder-structure). Three questions before you move it:

1. Do the two uses share the same rule, or do they resemble each other by coincidence?
2. After you move it, will you have to add a parameter and a condition for every new use? If so the abstraction may be wrong, and copying comes cheaper.[^1]
3. Does the code in the shared layer import from the features? It should not: the flow is one-way, shared code → features → the application.[^10]

These questions line up with [Dan Abramov](https://overreacted.io)'s *The Wet Codebase* talk. In the talk's story, the shared abstraction extracted to prevent copying accumulates special cases over time, becomes generic and ends up incomprehensible. His advice: inline a bad abstraction again, test the concrete business behaviour rather than the inner abstraction, avoid deduplicating early, and pick architectures that make inlining easy, such as a one-way component tree.[^11]

## Keeping the boundaries

A written rule gets broken; a lint rule does not. There are two boundaries you have to keep: features do not import each other, and the direction shared code → features → the application is not reversed.[^10] Even a talk explaining Feature-Sliced Design counts cross-imports between modules among the common problems.[^12]

```js
// the rules inside eslint.config.js (eslint-plugin-import has to be installed and registered)
'import/no-restricted-paths': ['error', {
  zones: [
    // features do not import each other
    { target: './src/features/cart', from: './src/features', except: ['./cart'] },
    { target: './src/features/products', from: './src/features', except: ['./products'] },

    // the flow is one-way: shared code → features → the application
    { target: './src/features', from: './src/app' },
    {
      target: ['./src/components', './src/hooks', './src/lib', './src/helpers', './src/types'],
      from: ['./src/features', './src/app'],
    },
  ],
}],
```

- `target` is the folder the rule applies to, `from` is the folder that cannot be imported from there, and `except` is an exception relative to `from`. The rule matches the resolved file path, not the import text.[^13]
- **bulletproof-react** writes a separate zone for every feature, so the list grows as the number of features does.[^10]
- If you use TanStack Start, write `./src/routes` instead of `./src/app`.

If you want a feature to be reachable from outside only through its root (a public API), you can forbid the deep paths with `no-restricted-imports`:[^14]

```js
{
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/features/**'], // a feature's own files import each other by deep path
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/features/*/*'],
        message: "Access a feature only through its root: '@/features/<name>'",
      }],
    }],
  },
}
```

The third rule is for circular imports: `import/no-cycle`. It is a comparatively expensive rule; if your lint time becomes a problem, you can tune the cost against the benefit with `maxDepth`.[^15]

If the zone list starts to be unmanageable, **eslint-plugin-boundaries** lets you describe the architecture in one place: you define the folders as element types, then make the default `disallow` and write the dependencies you allow.[^16]

> [!TIP]
>
> A lint error is feedback for the agent too: code that violates a boundary goes red immediately and the agent corrects itself. That is the architectural version of the *"a check the agent can use"* idea from the [Agentic coding](/academy/ai/agentic-coding) guide.

## Try it yourself

1. Open the largest component in your project. Are you hitting one of the problems [Kent C. Dodds](https://kentcdodds.com) lists? If not, do not split it.
2. Find a state that lives in a global store but is used by only one component, and move it to that component.
3. Wrap a `useEffect` you have in a hook named for its purpose (`useData`, for example).
4. Add the `import/no-restricted-paths` zones, then import `features/cart` from inside `features/products` on purpose and see the error.
5. Watch [Dan Abramov](https://overreacted.io)'s [The Wet Codebase](https://www.deconstructconf.com/2019/dan-abramov-the-wet-codebase) talk. Then inline an abstraction in your own code again and look at what happens.[^11]
6. Watch [Fernando Rojo](https://fernandorojo.co)'s [Composition Is All You Need](https://www.youtube.com/watch?v=4KvbVq3Eg5w) talk (22 min). Then try splitting a component of yours that grew with boolean props into a `Root` and inner parts.[^6]

## Sources

1. [Kent C. Dodds: When to break up a component into multiple components](https://kentcdodds.com/blog/when-to-break-up-a-component-into-multiple-components) *(article)* — The problems that call for splitting a component, and the cost of early abstraction. July 19, 2019.
2. [React: Thinking in React](https://react.dev/learn/thinking-in-react) *(doc)* — The criteria for splitting a UI into a component hierarchy, and putting state in the closest common parent.
3. [components.build: Composition](https://www.components.build/composition) *(article)* — Composition and the compound component pattern instead of a component with many props.
4. [Patterns.dev: Compound Pattern](https://www.patterns.dev/react/compound-pattern/) *(article)* — The two implementations of a compound component, with Context and with `React.Children.map`, their trade-offs and the React 18+ recommendation.
5. [React: Passing Props to a Component](https://react.dev/learn/passing-props-to-a-component) *(doc)* — The `children` prop and the warning about using spread.
6. [Fernando Rojo: Composition Is All You Need (React Universe Conf 2025)](https://www.youtube.com/watch?v=4KvbVq3Eg5w) *(video)* — Avoiding boolean props, the Slack message composer example, compound components and lifting state with context. The Callstack channel, 22 min, September 8, 2025.
7. [Kent C. Dodds: State Colocation will make your React app faster](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster) *(article)* — The speed and maintenance effect of keeping state close, and the decision tree. September 23, 2019.
8. [React: Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) *(doc)* — Hooks sharing logic, the naming and when to write one.
9. [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) *(doc)* — The `'use client'` boundary, nesting with `children`, the providers and `server-only`.
10. [bulletproof-react: Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) *(repo)* — The ban on imports between features, the one-way flow and the ESLint zones.
11. [Dan Abramov: The Wet Codebase (Deconstruct)](https://www.deconstructconf.com/2019/dan-abramov-the-wet-codebase) *(video)* — The cost of early abstraction, inlining, and the one-way component tree. The conference page lists it under 2019; the event date on the page is April 2020.
12. [Alexander Morgunov: Getting to Grips with Feature-Sliced Design (HolyJS 2024 Autumn)](https://holyjs.ru/en/archive/2024%20Autumn/talks/20005543/) *(video)* — Feature-Sliced Design's concepts and its common problems, cross-imports included.
13. [eslint-plugin-import: no-restricted-paths](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md) *(repo)* — The ban on imports between folders with `target`, `from` and `except`.
14. [ESLint: no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports) *(doc)* — Restricting import paths with `patterns` and `group`.
15. [eslint-plugin-import: no-cycle](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-cycle.md) *(repo)* — Detecting circular imports, `maxDepth` and the performance note.
16. [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries) *(repo)* — Enforcing architectural boundaries with element types and dependency policies.
