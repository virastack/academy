---
title: "CSS"
description: "Selectors, the box model and page layout."
lastVerified: "2026-10-17"
translationKey: "web-fundamentals/css"
---

## What CSS is

**CSS** is the language that describes how the structure you built with HTML should look. Every rule is a **selector** followed by `property: value;` pairs in curly braces. The selector says which elements are styled, the properties say what changes.

```css
.card {
  padding: 1rem;
  color: #1f2937;
}
```

## Selectors

These are the ones you will use most:[^1]

| Selector | Example | What it selects |
| :-- | :-- | :-- |
| Type | `h1` | Every `<h1>` element |
| Class | `.card` | Every element with `class="card"` |
| ID | `#header` | The single element with `id="header"` |
| Universal | `*` | Every element |
| List | `h1, .title` | Everything the comma-separated selectors match |

A class can be used as many times on a page as you like; an ID is used once.[^1] Selectors combine with a **combinator** to select by where an element sits in the HTML: `nav a` takes every link inside a nav, `ul > li` only the direct children, `h2 + p` the paragraph right after a heading.[^2] A **pseudo-class** such as `:hover` selects an element in a particular state, and a **pseudo-element** such as `::before` selects a part of an element.[^2]

## Which rule wins

When more than one rule matches the same element, the browser decides which one applies using three ideas: the **cascade**, **specificity** and **inheritance**.[^3]

### Cascade

The **cascade** is the algorithm that picks the winner among conflicting rules.[^4] Per the CSS specification the browser looks, in order, at where the rule came from and whether it is `!important`, whether it was written in a `style` attribute, which cascade layer it sits in, the specificity of the selector, and finally which one comes later in the code.[^5] In day-to-day work most conflicts are settled by those last two steps: on equal specificity, the rule written later wins.[^4]

### Specificity

**Specificity** is a three-part score for how specific a selector is: the number of IDs, the number of classes, attributes and pseudo-classes, and the number of types and pseudo-elements. The parts are compared from left to right, and the highest score wins; `*` adds nothing to it.[^6]

```css
#header a     { color: red; }   /* (1, 0, 1) wins */
.nav .link    { color: blue; }  /* (0, 2, 0) */
nav a         { color: green; } /* (0, 0, 2) */
```

Because the comparison runs from the left, a single ID beats a selector made of classes, however many of them there are. That is why styling with an ID, or forcing a rule through with `!important`, makes that rule hard to override later. It is common on real sites: in a study of more than 100,000 of them, the median site carried 154 `!important` declarations.[^7]

> [!DO]
>
> - Style with classes and keep selectors short.

> [!DONT]
>
> - Do not reach for an ID or `!important` to beat an existing rule.

Large projects have **cascade layers** (`@layer`) to solve this: layer order is considered before specificity, so a group of styles gets its priority without entering the selector race.[^8]

### Inheritance

Some properties are **inherited** from parent to child and some are not. `color` and the font properties are inherited; `width`, `margin` and `border` are not.[^3] That is why a `color` set on `body` spreads across the whole page.

## The box model

The browser draws every element as a box. From the inside out, a box has four layers: **content**, **padding**, **border** and **margin**.[^9]

![The CSS box model: content in the middle, padding around it, then the border, and the margin layer on the outside](https://raw.githubusercontent.com/virastack/academy/main/assets/web-fundamentals/css/box-model.png)

In the default model, `width` applies to the content only and padding and border are added on top. A box given `width: 200px` and `padding: 20px` takes up 240px on screen. With `box-sizing: border-box`, `width` covers the whole box including the border, and the arithmetic becomes predictable.[^10]

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

How a box behaves on the outside is set by `display`. **Block** boxes start on a new line and take `width`/`height` (`div`, `p`, `h1`). **Inline** boxes flow within a line; `width` and `height` do not apply to them, and their vertical margin and padding do not push the surrounding lines around (`span`, `a`).[^9] The vertical margins of two block elements that meet are not added together: they merge, and the larger one remains. This is called **margin collapsing**.[^9]

## Units

**Absolute** units such as `px` always give the same size. **Relative** units are worked out against some other value, which suits the flexible nature of the web better.[^11]

| Unit | Relative to |
| :-- | :-- |
| `rem` | The font size of the root element (`html`), 16px by default |
| `em` | The element's font size; the parent's when used on `font-size` |
| `%` | The parent's matching value (width, for instance) |
| `vw` / `vh` | 1% of the viewport width / height |
| `dvh` | Viewport height as it changes while mobile browser bars appear and disappear |
| `ch` | The width of the "0" character in the font |

Setting a font size in `px` ignores the text size the user chose in the browser; `rem` respects it.[^11] For a readable line length, something like `max-width: 60ch` works well.[^11] Values can be combined in calculations, as in `calc(100% - 2rem)`.[^12]

On real sites `px` is still everywhere: 98.28% of sites use `px` and 80.15% use `rem`.[^7]

## Flexbox and grid

Modern layout is built with two tools. **Flexbox** is for one-dimensional layout: it lays items out along a row or a column. **Grid** is two-dimensional: it controls rows and columns together.[^13]

### Flexbox

A flex container has a **main axis** (the direction items are laid along) and a **cross axis** at right angles to it. `justify-content` aligns along the main axis, `align-items` along the cross axis.[^14] With the default `flex-direction: row` the main axis is horizontal and the cross axis vertical, which is why `align-items` aligns items vertically. Say `flex-direction: column` and the axes swap: `justify-content` now works vertically and `align-items` horizontally.[^15]

```css
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
```

`flex: 1` lets an item take a share of the remaining space. Behind it, that sets the starting size (`flex-basis`) together with how much the item may grow (`flex-grow`) and shrink (`flex-shrink`).[^15]

### Grid

Grid divides a single element into rows and columns, and the children settle into those cells.[^16] The `fr` unit shares out the remaining space proportionally, and `repeat()` and `minmax()` keep the column definition short.[^17]

```css
.products {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}
```

Here the columns are at least 200px wide and as many of them open as fit on screen; you get a responsive card list without writing a media query. For a page skeleton you can name areas with `grid-template-areas`; the areas have to be rectangular.[^17]

> [!TIP]
>
> Use flexbox when you are laying items out in one direction (a menu, a group of buttons), and grid when you are controlling rows and columns together (a card grid, a page skeleton).[^13]

Figures from 2022 put flexbox on 74% of mobile pages and grid on 12%.[^18]

## Responsive design

**Responsive design** means a page that looks right and is comfortable to use at every screen size.[^19] It has three parts:

- **The viewport meta tag:** stops a mobile browser from shrinking the page to fit.[^20]
- **A flexible layout:** flexbox, grid and relative units.[^19]
- **Media queries:** change the styling past a given width.[^19]

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

```css
.layout {
  display: grid;
  gap: 1rem;
}

@media (width >= 768px) {
  .layout {
    grid-template-columns: 240px 1fr;
  }
}
```

This approach is called **mobile-first**: you write the single column for the narrow screen first and add columns as the screen grows.[^19] Choose breakpoints by the width at which the content starts to break, not by the sizes of popular devices.[^20]

## Custom properties

A **custom property** (a CSS variable) lets you define a value once and use it everywhere. Its name starts with two dashes and it is read with `var()`.[^21]

```css
:root {
  --color-primary: #2563eb;
  --radius: 0.5rem;
}

.button {
  background: var(--color-primary);
  border-radius: var(--radius, 4px);
}
```

A value defined on `:root` holds for the whole page and reaches the children through inheritance; redefining it inside a component changes it there only.[^21] The second value given to `var()` is the fallback used when the variable is not defined.[^22] This is what theming and dark mode are built on.

## Going deeper

- **Full course:** web.dev's free Learn CSS course, which also covers newer ground such as nesting, container queries and anchor positioning.[^23]
- **Responsive design:** web.dev's Learn Responsive Design course.[^24]
- **Hands-on path:** MDN's CSS styling basics module, then the CSS layout module.[^25]
- **Layout that holds up:** [Ahmad Shadeed](https://ishadeed.com/)'s Defensive CSS tips, on layouts that do not break on unexpected content such as long text or a broken image.[^26]
- **Talk:** [Miriam Suzanne](https://www.miriamsuzanne.com/) on the cascade and cascade layers (JSHeroes 2025).[^27]
- **Talk:** [Jen Simmons](https://jensimmons.com/) on how layout on the web has changed (View Source 2018).[^28]

## Sources

1. [MDN: Basic selectors](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Basic_selectors) *(doc)* — Type, class, ID, universal and selector lists; an ID being used once per page.
2. [web.dev Learn CSS: Selectors](https://web.dev/learn/css/selectors) *(doc)* — Simple selectors, pseudo-classes and pseudo-elements, and combinators.
3. [MDN: Handling conflicts](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Handling_conflicts) *(doc)* — Cascade, specificity and inheritance; which properties are inherited.
4. [web.dev Learn CSS: The cascade](https://web.dev/learn/css/the-cascade) *(doc)* — What the cascade is, and the position, specificity, origin and importance steps.
5. [CSSWG: CSS Cascading and Inheritance Level 5](https://drafts.csswg.org/css-cascade-5/) *(doc)* — The official definition of cascade order (§6.1).
6. [web.dev Learn CSS: Specificity](https://web.dev/learn/css/specificity) *(doc)* — The three-part specificity score and comparing it left to right.
7. [Project Wallace: The CSS Selection 2026](https://projectwallace.com/the-css-selection/2026) *(research)* — The CSS of more than 100,000 sites; `!important` and unit usage.
8. [MDN: Cascade layers](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Cascade_layers) *(doc)* — Ordering groups of styles with `@layer`; layer priority beating specificity.
9. [MDN: The box model](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Box_model) *(doc)* — Block and inline boxes, the box layers and margin collapsing.
10. [web.dev Learn CSS: Box Model](https://web.dev/learn/css/box-model) *(doc)* — The box layers and `box-sizing: border-box`.
11. [web.dev Learn CSS: Sizing Units](https://web.dev/learn/css/sizing) *(doc)* — Absolute and relative units, `rem`/`em`, viewport units and `ch`.
12. [MDN: Values and units](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Values_and_units) *(doc)* — Length units, percentages, colour notations and `calc()`.
13. [web.dev Learn CSS: Layout](https://web.dev/learn/css/layout) *(doc)* — Flexbox in one dimension, grid in two; block and inline behaviour.
14. [MDN: Flexbox](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Flexbox) *(doc)* — The main and cross axes, the `flex` shorthand and alignment.
15. [Josh W. Comeau](https://www.joshwcomeau.com/): [An Interactive Guide to Flexbox](https://www.joshwcomeau.com/css/interactive-guide-to-flexbox/) *(article)* — The main axis, `flex-basis`, `flex-grow` and `flex-shrink`, with interactive examples.
16. [Josh W. Comeau](https://www.joshwcomeau.com/): [An Interactive Guide to CSS Grid](https://www.joshwcomeau.com/css/interactive-guide-to-grid/) *(article)* — Tracks, `fr` and template areas, with interactive examples.
17. [MDN: CSS grid layout](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Grids) *(doc)* — `fr`, `repeat()`, `minmax()`, `gap` and `grid-template-areas`.
18. [Web Almanac 2022: CSS](https://almanac.httparchive.org/en/2022/css) *(research)* — Flexbox, grid and custom property usage rates.
19. [MDN: Responsive web design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design) *(doc)* — What responsive design is, flexible layout, media queries and mobile-first.
20. [web.dev Learn Responsive Design: Media queries](https://web.dev/learn/design/media-queries) *(doc)* — The viewport meta tag and choosing breakpoints by content.
21. [web.dev Learn CSS: Custom Properties](https://web.dev/learn/css/custom-properties) *(doc)* — The `--` syntax, `var()`, `:root` and inheritance.
22. [MDN: Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties) *(doc)* — The `var()` fallback value and custom property inheritance.
23. [web.dev: Learn CSS](https://web.dev/learn/css) *(doc)* — A free CSS course from start to finish.
24. [web.dev: Learn Responsive Design](https://web.dev/learn/design) *(doc)* — A free course on layout, typography, responsive images and theming.
25. [MDN: CSS styling basics](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics) *(doc)* — A hands-on module from selectors to debugging.
26. [Ahmad Shadeed](https://ishadeed.com/): [Defensive CSS](https://defensivecss.dev/) *(article)* — Short tips for layouts that survive unexpected content.
27. [Miriam Suzanne](https://www.miriamsuzanne.com/): [Cascading Layers of !mportance (JSHeroes 2025)](https://www.youtube.com/watch?v=4PkhzoFLJ0Q) *(video)* — Why the cascade works the way it does, and cascade layers.
28. [Jen Simmons](https://jensimmons.com/): [Everything You Know About Web Design Just Changed (View Source 2018)](https://talks.jensimmons.com/videos/h0XWcf) *(video)* — How thinking about layout on the web has shifted.
