---
title: "Keyboard and focus management"
description: "Navigating with the keyboard, and visible focus."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/keyboard-and-focus"
---

## What keyboard accessibility is

A great many people use your page without a mouse: screen reader users, and people with a motor disability navigating with a keyboard, a switch device or a mouth stick. For them, how many key presses an action takes is directly a question of access.[^1]

The basic rule on the keyboard is simple: `Tab` and `Shift + Tab` move the focus from one component to the next, while the arrow keys move within a component such as a menu or a radio group.[^2] The element receiving the keyboard input at that moment is said to have **focus**. As you saw in the HTML lesson, `<button>`, `<a href>` and the form fields get this behaviour from the browser for free; in this lesson we look at the focus order, its visibility and where to move it with JavaScript.

## Tab order and DOM order

The tab order is, by default, the elements' **order in the DOM**. Because the DOM order is also the screen reader's reading order, the two have to stay consistent, sensible and predictable.[^2] The focus order should match the page's visual order too.[^3]

If you need to change the order, change the order in the HTML. Moving focusable elements with CSS (reversing the visual order with flex or grid, for example) pulls apart what the keyboard user sees and where the focus goes.[^4]

> [!TIP]
>
> Try using your page from start to finish without touching the mouse, with only `Tab`, `Shift + Tab`, `Enter`, `Space` and `Esc`. If you can see where the focus is at every moment and its order feels sensible, you are on a good path.

## tabindex: 0 and -1

`tabindex` decides whether an element can be focused with the keyboard.[^4]

| Value | What it does | Where it is used |
| :-- | :-- | :-- |
| `0` | Adds the element to the tab order at its place in the DOM | The container of a custom widget that has to take focus |
| `-1` | Cannot be reached with Tab but can be given `focus()` with JavaScript | An error message, heading or panel to focus when it appears |
| `1` and above | Orders the element before everything else, by number | Do not use |

Elements such as `<button>`, `<a href>` and `<input>` already behave as if they had `tabindex="0"`; do not add `tabindex` to them unless you are changing the behaviour.[^4] Positive values break the page's natural order and make navigating harder for a keyboard user; use only `0` and `-1`.[^4][^3] Even so, in 2025, 3.7% of desktop pages had a positive `tabindex`.[^5]

`tabindex="0"` does not turn a `<div>` into a button: it takes focus, but its role, its Enter/Space behaviour and its place in the accessibility tree are still missing.[^4] Use a real `<button>` first.

The most common use of `-1` is giving focus to the error summary when a form is submitted:

```tsx
"use client";

import { useEffect, useRef } from "react";

export function ErrorSummary({ errors }: { errors: string[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errors.length > 0) ref.current?.focus();
  }, [errors]);

  if (errors.length === 0) return null;

  return (
    <div ref={ref} tabIndex={-1}>
      <h2>There are {errors.length} errors in the form</h2>
      <ul>
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Visible focus and :focus-visible

`:focus` always selects the focused element. `:focus-visible`, on the other hand, only matches when the browser decides the user needs to see the focus: a button clicked with the mouse usually gets no ring, while one reached with the keyboard, or a focused text box, does.[^6] That way you leave **when** the focus ring appears to the browser and only change **how** it looks.[^6]

The trap is `outline: none`. Removing the default ring because it is "ugly" makes the page unusable for sighted keyboard users.[^6] This is very common: in 2025, 67% of sites explicitly removed the default focus ring, while only around 25% used `:focus-visible`.[^5]

In WCAG 2.2, **2.4.7 Focus Visible** (AA) asks for a mode of operation where the focus indicator is visible in every interface that can be used with a keyboard, and does not allow the indicator to disappear after a while. Removing the ring or making it invisible counts as a failure of this criterion (F78).[^7]

```css
/* Give your own indicator instead of deleting the default */
:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
```

Making the indicator with `outline` rather than with a `border` or a background colour has two benefits: it does not shift the layout, and it is preserved in the **forced colors** (high contrast) mode on Windows, where `box-shadow` and background colours are usually overridden.[^8] If you are going to use a `dashed` ring, roughly double its thickness to compensate for the gaps.[^8]

The stricter **2.4.13 Focus Appearance** is at AAA level: the indicator's area has to be as large as a 2 CSS pixel border around the component, and it has to create a contrast difference of at least 3:1 between the focused and unfocused states.[^9] The simplest way to meet the area requirement is a plain 2px `outline`.[^9] The indicator's contrast against the background is the subject of the "Colour, contrast and motion" lesson.

## Skip link

Tabbing one by one through the menu that repeats on every page is tiring. A **skip link** is a link that is the page's first focusable item and jumps straight to the main content.[^1][^3] It is usually hidden until it receives focus; but not with `display: none` or `hidden`, rather by moving it off screen, because those two remove the link from the keyboard as well.[^1] The link text should say where it goes: "Skip to main content".[^3]

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <header>{/* logo, nav */}</header>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
```

```css
.skip-link {
  position: absolute;
  left: -9999px;
}
.skip-link:focus {
  left: 1rem;
  top: 1rem;
}
```

The link's `href` value has to match the target's `id`.[^1] According to the 2025 data, only around 24% of pages had a skip link.[^5]

## Focus in a modal

Three things have to happen when a modal opens: the focus has to go inside the modal, the page behind it has to become unusable, and when the modal closes the focus has to return to the button that opened it.[^10][^11] A keyboard user expects to be able to close it with `Esc`.[^11]

The native `<dialog>` element gives you most of this for free. A dialog opened with `showModal()` makes the rest of the page **inert**, closes with `Esc` and moves the focus to the first focusable element inside it; to focus somewhere else, `autofocus` is used.[^11] When it closes, the browser gives the focus back to the opening element, if it is still on the page.[^12] Do not add `tabindex` to a `<dialog>`.[^11]

```tsx
"use client";

import { useRef } from "react";

export function DeleteDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()}>
        Delete account
      </button>
      <dialog ref={dialogRef} aria-labelledby="delete-title">
        <h2 id="delete-title">Delete your account?</h2>
        <form method="dialog">
          <button autoFocus>Dismiss</button>
          <button value="confirm">Delete</button>
        </form>
      </dialog>
    </>
  );
}
```

There is no single right answer for where the first focus goes. In a short informational message the close button is right; in an irreversible action, focus the most harmless option (the "Dismiss" in the example) so the user does not confirm by reflexively pressing Enter. In long content, focusing the dialog itself or its heading lets the user understand what it is first.[^13][^10]

If you write your own overlay (a side menu, a drawer), give the content behind it the `inert` attribute. `inert` removes a subtree from the tab order, from clicks and from the accessibility tree, and has been widely supported across browsers since April 2023.[^14] Because nothing changes visually, making the inert part obvious is up to you.[^14]

> [!DONT]
>
> - Do not write the modal with a `<div>` and leave the page behind it focusable.
> - Do not drop the focus to `<body>` when the modal closes; the user loses where they are on the page.[^2]

## Page changes in an SPA

On every page loaded from the server, the screen reader reads the new page's title. In client-side transitions made with `next/link`, the page is not reloaded; this is why Next.js adds a **route announcer** by default. It takes the name to announce from `document.title` first, then from the `<h1>`, and from the URL if there is neither; so give every page a unique and descriptive title.[^15]

```tsx
// app/pricing/page.tsx
export const metadata = { title: "Pricing | ViraStack" };
```

The announcement only helps a screen reader; users who magnify the screen or use voice control may not notice that the page changed.[^16] In the tests Marcy Sutton ran in 2019 with users of different assistive technologies, the best result for screen reader users came from focusing the new page's heading; resetting the focus to the very start of the application was found overwhelming.[^16] After the tests, the recommendation was to move the focus to a small, visible skip link when the page changes and to announce the page name with a live region.[^16] The live region itself is covered in the "WCAG and ARIA" lesson.

## Focus not obscured

**2.4.11 Focus Not Obscured (Minimum)** (AA), which arrived with WCAG 2.2, asks that the component receiving keyboard focus is not **entirely** hidden by content you added.[^17] The typical culprits are sticky headers and footers and cookie banners: as you press Tab, the focus moves down the page and disappears behind a fixed footer.[^17]

One fix is giving `scroll-padding` in CSS; the browser then leaves room for the fixed area while scrolling the focused element into view.[^17]

```css
html {
  scroll-padding-top: 5rem; /* the sticky header's height */
  scroll-padding-bottom: 4rem; /* the sticky footer or banner */
}
```

**2.4.12 Focus Not Obscured (Enhanced)**, at AAA level, asks that no part of the focused component is covered; aim for that where you can.[^17]

## Roving tabindex

In components such as a toolbar, a tab list or a radio group, instead of putting every item in the tab order, only one takes `tabindex="0"` and the others are `-1`, with the `0` moving from item to item with the arrow keys; this is called **roving tabindex**.[^2] Rather than writing such components from scratch, look at the patterns in the APG and at the headless libraries in the "WCAG and ARIA" lesson.

## Going deeper

- **The basis of a keyboard interface:** W3C APG's "Developing a Keyboard Interface" guide; roving tabindex and `aria-activedescendant` are here.[^2]
- **Designing a focus indicator:** Sara Soueidan's guide to WCAG-conformant focus indicators.[^8]
- **Focus research in an SPA:** Marcy Sutton's user tests of client-side routing.[^16]
- **Talk:** Anuradha Kumari, "Making Interactions Accessible to All Users" (React Summit 2023, 30 min); keyboard interaction, the focus ring and focus in a dialog.[^18]

## Sources

1. [WebAIM: "Skip Navigation" Links](https://webaim.org/techniques/skipnav/) *(article)* — The purpose of a skip link, who it helps, it being visible on focus, and the target matching the `id`.
2. [W3C WAI-ARIA APG: Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/) *(doc)* — Tab order and DOM order, visible focus, the roles of Tab and the arrow keys, and roving tabindex.
3. [web.dev: Keyboard focus](https://web.dev/learn/accessibility/focus) *(doc)* — The focus order, the `tabindex` values, the focus indicator and the skip link.
4. [MDN: tabindex](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/tabindex) *(doc)* — `0`, `-1` and positive values, and the warning about positive values and reordering with CSS.
5. [HTTP Archive Web Almanac 2025: Accessibility](https://almanac.httparchive.org/en/2025/accessibility) *(research)* — The share of pages that remove the focus ring, use `:focus-visible`, a positive `tabindex` or a skip link.
6. [MDN: :focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:focus-visible) *(doc)* — The difference from `:focus`, when the browser shows the focus, and the effect of removing the ring.
7. [W3C: Understanding SC 2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) *(doc)* — The criterion's text, its purpose and the F78 failure.
8. [Sara Soueidan: A guide to designing accessible, WCAG-conformant focus indicators](https://sarasoueidan.com/blog/focus-indicators/) *(article)* — Preferring `outline`, forced colors, `outline-offset` and the thickness recommendations.
9. [W3C: Understanding SC 2.4.13 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) *(doc)* — The area and 3:1 contrast requirements for an AAA focus indicator.
10. [W3C WAI-ARIA APG: Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) *(doc)* — Keyboard interaction in a modal, the first focus on opening, and the focus returning on close.
11. [MDN: `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) *(doc)* — `showModal()`, the inert background, `Esc`, `autofocus` and the accessibility notes.
12. [W3C: H102 Creating modal dialogs with the HTML dialog element](https://www.w3.org/WAI/WCAG22/Techniques/html/H102) *(doc)* — The native dialog's inert, `Esc` and return-focus-to-the-opener behaviour.
13. [Adrian Roselli: Where to Put Focus When Opening a Modal Dialog](https://adrianroselli.com/2025/06/where-to-put-focus-when-opening-a-modal-dialog.html) *(article)* — Where to put the first focus in a modal, depending on the kind of content.
14. [MDN: inert](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert) *(doc)* — `inert`'s effect on focus, clicks and the accessibility tree, and its browser support.
15. [Next.js: Accessibility](https://nextjs.org/docs/architecture/accessibility) *(doc)* — What the route announcer announces on client-side transitions.
16. [Marcy Sutton: What we learned from user testing of accessible client-side routing techniques](https://www.gatsbyjs.com/blog/2019-07-11-user-testing-accessible-client-routing) *(research)* — Testing focus and announcement techniques on page change with assistive technology users.
17. [W3C: Understanding SC 2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) *(doc)* — Sticky content, cookie banners, the `scroll-padding` technique and the relationship with 2.4.12.
18. [Anuradha Kumari: Making Interactions Accessible to All Users (React Summit 2023)](https://gitnation.com/contents/making-interactions-accessible-to-all-users/video) *(video)* — 30 minutes. Keyboard interaction, the focus ring, focus in a dialog and the difference between a link and a button.
