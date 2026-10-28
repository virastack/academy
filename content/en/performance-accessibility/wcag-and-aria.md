---
title: "WCAG and ARIA"
description: "The rules to aim for, and ARIA where HTML is not enough."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/wcag-and-aria"
---

## What accessibility is

**Accessibility** (a11y for short) is a site being perceivable, operable and understandable by everyone, with or without a disability. The audience is not small: according to the World Health Organization, more than 1.3 billion people, about 16% of the world's population, live with a disability, and the number grows as the population ages.[^1]

Accessibility does not only cover permanent disabilities:[^2]

- **Permanent:** a visual, hearing, motor or cognitive disability.
- **Temporary:** short-lived limits caused by an accident, an operation or medication (a broken arm, eye surgery).
- **Situational:** limits that come from the surroundings; not being able to hear the sound in a noisy place, for example.

So captions, keyboard operation and clear labels help everybody.

## WCAG 2.2

The **Web Content Accessibility Guidelines (WCAG)** are the standard W3C publishes for the accessibility of web content. The current version is **WCAG 2.2**: published in October 2023, updated in December 2024, adding 9 new success criteria to 2.1. It is an ISO standard too (ISO/IEC 40500:2025).[^3]

Content that meets WCAG 2.2 also meets 2.1 and 2.0; the one exception is the 4.1.1 Parsing criterion, removed in 2.2.[^3]

### The four principles: POUR

The criteria are grouped under four principles.[^3] Their initials form the acronym **POUR**:

| Principle | The question | Example |
| :-- | :-- | :-- |
| **Perceivable** | Can the content be seen and heard? | `alt` on images, captions on video |
| **Operable** | Can everything be operated? | Keyboard access, enough time |
| **Understandable** | Are the content and the behaviour understandable? | The page language, clear error messages |
| **Robust** | Can assistive technologies read it? | The right role, name and state |

### A, AA, AAA

Every criterion is at one of three levels: **A** (the most basic), **AA** and **AAA** (the strictest).[^3] In practice the target is **AA**. The European and North American laws that reference WCAG almost always ask for AA; WCAG itself does not recommend AAA as a general policy for a whole site, because for some content it cannot be met.[^4]

> [!TIP]
>
> Do not throw the AAA criteria away: once you have hit AA, the answer to "what would be better than this" is usually there.[^4]

### The legal picture

The **European Accessibility Act (EAA)** is a directive setting common accessibility rules in the EU for products and services such as e-commerce, banking, e-books, transport services, smartphones and computers.[^5] It has applied since June 28, 2025; micro-enterprises with fewer than 10 employees and a turnover under 2 million euros are exempt from some obligations.[^6] W3C lists the version referenced for the EAA as WCAG 2.2; most organisations working towards EAA conformance use WCAG and the European standard that includes it, EN 301 549.[^7][^3] If you are building a site that sells a product or a service into the EU, this concerns you directly.

**WCAG 3**, meanwhile, is still a draft; it is not expected to be finished for several more years, and even then it will not replace WCAG 2 right away. W3C's recommendation for today is to meet WCAG 2.2.[^8]

## ARIA: when you need it

Remember the rule from the HTML lesson: if there is a native HTML element that gives the meaning and the behaviour, you use that, not ARIA. W3C's ARIA guide puts it more bluntly: "No ARIA is better than bad ARIA." Wrong ARIA tells a screen reader user about something that is not on the screen.[^9]

The problem is widespread: in 2026, 82.7% of a million home pages used ARIA, with an average of more than 133 ARIA attributes per page; that number rose by 27% in a year.[^10]

**ARIA** (WAI-ARIA) adds three things: a **role** (what the element is), **properties** (extra meaning, such as an associated label) and **states** (changing information, such as whether it is open or selected).[^11] It only changes the accessibility tree; it adds no keyboard behaviour, no focus and no clicking, and you have to write those with JavaScript yourself.[^11][^12]

## The accessible name

Every interactive element has to have an **accessible name**; the screen reader announces the element by that name. Most of the time the name already comes from the HTML: the button's text, a `<label>`. For the three cases where HTML is not enough, there are three attributes.

### aria-label

It defines a name for an element with no visible text. The typical example is a button containing only an icon.[^13]

```tsx
<button type="button" aria-label="Close" onClick={onClose}>
  <XIcon aria-hidden="true" />
</button>
```

`aria-label` only works reliably on interactive elements, widgets, landmarks and images; it does not give a name to a plain `<div>` or `<span>` (elements whose role is `generic`).[^13]

### aria-labelledby

It takes the name from text already visible on the page; the value is that text's `id`. Several `id`s can be written separated by spaces, and the name is joined in that order.[^14]

```tsx
<h2 id="cart-heading">Your cart</h2>
<ul aria-labelledby="cart-heading">…</ul>
```

### aria-describedby

In addition to the name, it attaches a longer **description**: a hint, a rule or an error message. The name should be short, and the description carries the detail.[^15]

```tsx
<label htmlFor="password">Password</label>
<input id="password" type="password" aria-describedby="password-hint" />
<p id="password-hint">At least 12 characters.</p>
```

### The order of priority

When there is more than one source, `aria-labelledby` overrides `aria-label` and `<label>`; and `aria-label` overrides the element's own text.[^14][^16] So do not write both on the same element.[^13]

> [!DO]
>
> - Give the name with native HTML first (`<label>`, the button's text).
> - If there is visible text, tie it to that with `aria-labelledby`.

> [!DONT]
>
> - Do not write `aria-label` over a visible label. It is invisible, it is not translated reliably by machine translation, and it overrides the other methods.[^17]

## The state attributes

A state you show on screen with a colour or an icon does not reach the screen reader by itself. In React you bind these attributes to state.

- **`aria-expanded`:** written on the control that opens and closes a panel (not on the panel), taking `true`/`false`. The controlled element can be pointed at with `aria-controls`.[^18]
- **`aria-pressed`:** turns a button into an on/off **toggle**. Do not change the label when the state changes: the label "Mute" stays the same, and the state is told through `aria-pressed`.[^19]
- **`aria-current`:** marks the current item within a group; in navigation, `aria-current="page"` for the current page's link. Only one item in a group is current.[^20]

```tsx
function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" aria-expanded={open} aria-controls="panel-1" onClick={() => setOpen(!open)}>
        {title}
      </button>
      <div id="panel-1" hidden={!open}>
        {children}
      </div>
    </>
  );
}
```

If you use Tailwind, you can bind the style to the same attribute with the `aria-expanded:` variant; the state and the appearance are then managed from one place.

## Live region

Content that changes without the page reloading (added to the cart, saved, 3 results found) is not announced to a screen reader. A **live region** is used for that.[^11]

- **`aria-live="polite"`:** the change is read once the user is idle. This is the default choice.[^21]
- **`aria-live="assertive"`:** it interrupts whatever is being read at that moment; only for urgent cases, and use it sparingly.[^21]
- **`role="status"`:** carries `aria-live="polite"` implicitly; it is for status messages that inform without interrupting. Do not move the focus there when the message arrives.[^22]

```tsx
<p role="status">{saved ? "Changes saved." : ""}</p>
```

> [!WARNING]
>
> A live region has to be on the page **before** the content changes. If you render the element together with the message, it is usually not announced; leave it empty in the initial markup and only change its content.[^21]

## aria-hidden

`aria-hidden="true"` removes an element and all its children from the accessibility tree while it stays visible on screen. It is ideal for decorative icons that have text next to them.[^23]

> [!DONT]
>
> - Do not give `aria-hidden="true"` to a focusable element, or to a container holding one; a keyboard user then focuses somewhere the screen reader cannot see.[^23]
> - Do not add `aria-hidden` to an element that is `hidden` or `display: none`; it is already hidden from everybody.[^23]

## Complex widgets

For components with no HTML equivalent, such as tabs, a combobox, a menu or a tree, the reference is the **WAI-ARIA Authoring Practices Guide (APG)**. For each of more than thirty patterns it says which role, state and keyboard behaviour is needed, and gives an example implementation.[^24] The APG examples are for learning; they have to be tested in browsers and screen readers before going to production.[^9]

Rather than writing these from scratch, most projects use a **headless** (unstyled) library:

- **Radix Primitives:** it follows the WAI-ARIA patterns and manages the roles, the states, the focus and the keyboard behaviour. Providing the labels is still your job.[^25]
- **React Aria:** Adobe's library of more than 50 components; it implements the semantics and keyboard behaviour according to W3C, is tested with screen readers, and manages the focus in overlays.[^26]

> [!TIP]
>
> A headless library writes the ARIA correctly, but the content, such as `aria-label`, comes from you. Using a library does not make testing unnecessary.[^25]

## Going deeper

- **Standard:** W3C's WCAG 2 overview; the official summary of the versions, the principles and the levels.[^3]
- **Widget patterns:** the APG page for the component you want to build, with its keyboard table.[^24]
- **Labelling strategy:** Adrian Roselli's article putting the labelling methods in order of priority.[^17]
- **Talk:** Siddharth Kshetrapal's 29-minute talk showing how accessible React components are built at GitHub, with VoiceOver (React Summit 2024).[^27]
- **Talk:** Kat Shaw's introductory talk on ARIA; when ARIA, when native HTML (A11yTalks, August 2024).[^28]

## Sources

1. [WHO Europe: Disability fact sheet](https://www.who.int/europe/news-room/fact-sheets/item/disability) *(research)* — More than 1.3 billion people with a disability worldwide, and the number rising with ageing.
2. [W3C WAI: Diverse Abilities and Barriers](https://www.w3.org/WAI/people-use-web/abilities-barriers/) *(doc)* — The kinds of disability, temporary disabilities and situational limits.
3. [W3C WAI: WCAG 2 Overview](https://www.w3.org/WAI/standards-guidelines/wcag/) *(doc)* — WCAG 2.2's history, the four principles, A/AA/AAA, backwards compatibility and the ISO status.
4. [TetraLogical (Ian Pouncey): Understanding WCAG Level AAA](https://tetralogical.com/blog/2021/11/26/understanding-wcag-level-aaa/) *(article)* — Why AA is the target, and why AAA is not required for a whole site.
5. [European Commission: European Accessibility Act](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/european-accessibility-act-eaa_en) *(doc)* — The products and services the EAA covers.
6. [Travers Smith: The European Accessibility Act now applies](https://www.traverssmith.com/knowledge/knowledge-container/a-new-milestone-for-accessibility-the-european-accessibility-act-now-applies/) *(article)* — The June 28, 2025 date, the micro-enterprise exemption and the transition periods.
7. [W3C WAI: Web Accessibility Laws & Policies, European Union](https://www.w3.org/WAI/policies/european-union/) *(doc)* — The WCAG version referenced for the EAA and the Web Accessibility Directive, and EN 301 549.
8. [W3C WAI: WCAG 3 Introduction](https://www.w3.org/WAI/WCAG3) *(doc)* — WCAG 3's draft status and its relationship to WCAG 2.
9. [W3C APG: Read Me First](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/) *(doc)* — "No ARIA is better than bad ARIA", and ARIA adding no behaviour.
10. [WebAIM Million 2026](https://webaim.org/projects/million/) *(research)* — The ARIA usage rate on home pages and the number of ARIA attributes per page.
11. [MDN: WAI-ARIA basics](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/WAI-ARIA_basics) *(doc)* — Roles, properties and states; when ARIA is needed, and a live region example.
12. [MDN: ARIA states and properties](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes) *(doc)* — All the ARIA attributes, and ARIA only changing the accessibility tree.
13. [MDN: aria-label](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-label) *(doc)* — The icon button example and the elements where `aria-label` is supported.
14. [MDN: aria-labelledby](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-labelledby) *(doc)* — Taking the name from visible text, several `id`s, and the priority.
15. [MDN: aria-describedby](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-describedby) *(doc)* — The difference between a name and a description, and attaching a description.
16. [Stefan Judis: The order of accessible name computation steps](https://www.stefanjudis.com/today-i-learned/the-order-of-accessible-name-computation-steps/) *(article)* — The priority order of the accessible name sources in DevTools.
17. [Adrian Roselli: My Priority of Methods for Labeling a Control](https://adrianroselli.com/2020/01/my-priority-of-methods-for-labeling-a-control.html) *(article)* — The order of the labelling methods and the drawbacks of `aria-label`.
18. [MDN: aria-expanded](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-expanded) *(doc)* — The control of an expandable panel and its relationship with `aria-controls`.
19. [MDN: aria-pressed](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-pressed) *(doc)* — The toggle button, the values and the rule against changing the label.
20. [MDN: aria-current](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current) *(doc)* — Values such as `page` and `step`, and its use in navigation.
21. [MDN: ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions) *(doc)* — `polite`/`assertive` and the live region having to be on the page beforehand.
22. [MDN: ARIA status role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/status_role) *(doc)* — The implicit values of `role="status"` and the focus warning.
23. [MDN: aria-hidden](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-hidden) *(doc)* — Hiding decorative content, and not using it on focusable elements.
24. [W3C APG: Introduction](https://www.w3.org/WAI/ARIA/apg/about/introduction/) *(doc)* — The APG's patterns, examples and practices sections.
25. [Radix Primitives: Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility) *(doc)* — The WAI-ARIA patterns, focus and keyboard management, and the labels being left to the developer.
26. [React Aria](https://react-aria.adobe.com/) *(doc)* — Adobe's unstyled, accessible React component library.
27. [Siddharth Kshetrapal: Building Accessible Reusable React Components at GitHub (React Summit 2024)](https://gitnation.com/contents/case-study-building-accessible-reusable-react-components-at-github) *(video)* — 29 minutes. ARIA roles, states and `aria-describedby` through tab and form examples.
28. [Kat Shaw: What the Heck is ARIA? (A11yTalks, August 2024)](https://www.youtube.com/watch?v=Gvr27vkZCTE) *(video)* — An introduction to ARIA: what it does, and when native HTML is preferred.
