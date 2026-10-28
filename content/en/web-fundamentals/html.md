---
title: "HTML"
description: "Semantic elements and page structure."
lastVerified: "2026-10-17"
translationKey: "web-fundamentals/html"
---

## What HTML is

**HTML** is the markup language that tells the browser what a page contains and how it is structured. Every piece of it, a heading, a paragraph, a link, an image, a form, is written as an **element**. An element is made of an opening tag, its content and a closing tag; settings are added to the opening tag as **attributes**.[^1]

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Page title</title>
  </head>
  <body>
    <p>Hello <strong>world</strong>.</p>
    <img src="cat.jpg" alt="A grey cat asleep on a windowsill" />
  </body>
</html>
```

`<head>` carries information the user does not see (the title, the character set), and `<body>` holds everything that appears on screen. **Void** elements such as `<img>` and `<br>` have no content and no closing tag. Elements have to nest properly: `<p><strong>…</strong></p>` is right, `<p><strong>…</p></strong>` is wrong.[^1]

## Semantic HTML

**Semantic HTML** means choosing an element for **what it means**, not for how it looks.[^2] `<div>` and `<span>` tell the browser and assistive tools nothing about the content. `<nav>`, `<button>` and `<h2>` say what they are.

This matters because the browser builds an **accessibility tree** from your HTML, and that is what screen readers read the page from. Meaningful elements also give the page sections that can be navigated to: landmarks.[^2] Appearance is the job of CSS, not HTML; do not pick an element because you like its default styling.[^2]

The scale of this is large: in 2026, 53.1% of a million home pages were missing alternative text on images and 51% were missing labels on form fields.[^3] Most of those are errors the right element would have prevented.

## The page skeleton

These are the main elements for dividing up a page:[^4]

| Tag | What it's for |
| :-- | :-- |
| `<header>` | The top of the page or of a section (logo, title) |
| `<nav>` | The main navigation links |
| `<main>` | The page's own main content; used **once per page** |
| `<article>` | Self-contained content that stands on its own (a blog post, a product card) |
| `<section>` | A thematic group; it should start with a heading |
| `<aside>` | Information indirectly related to the main content |
| `<footer>` | The bottom of the page or of a section |

```html
<body>
  <header>
    <nav>…</nav>
  </header>
  <main>
    <article>
      <h1>Post title</h1>
      <p>…</p>
    </article>
    <aside>Related posts</aside>
  </main>
  <footer>…</footer>
</body>
```

The HTML Standard is clear that `<section>` is not a general-purpose box; when all you need is a container to style, use a `<div>`.[^5] The `<header>` and `<footer>` above become page-level landmarks, while ones inside an `<article>` or a `<section>` do not.[^6]

> [!TIP]
>
> There is nothing wrong with a `<div>` when no meaningful element fits. The problem is writing `<div>` when one does.[^4]

## Headings

There are six heading levels, `<h1>` through `<h6>`. Headings work like the page's table of contents, and screen reader users navigate by jumping between them.[^7]

> [!DO]
>
> - Use a single `<h1>` on a page, as a rule.
> - Go down the levels in order: `<h1>`, `<h2>`, `<h3>`.

> [!DONT]
>
> - Do not jump from `<h2>` to `<h4>`.
> - Do not use a heading to make text bigger; CSS `font-size` is there for that.[^8]

## Picking the right element

### Button and link

A link **takes you somewhere else**; a button **does something on the page you are on**, such as opening a menu or submitting a form.[^9]

```html
<a href="/prices">See the prices</a>
<button type="button">Open the menu</button>
```

Building a button out of `<div onclick="…">` looks easy, but it throws away everything the browser gives you for free, keyboard focus and working with Enter and Space among it; you then have to write all of it yourself.[^7][^10]

> [!WARNING]
>
> A `<div>` does not behave like a button. Reach for `<button>` first.

### Form fields

Every form field needs a `<label>`. The label tells a screen reader what the field is for, and clicking it focuses the field.[^11]

```html
<label for="email">Email</label>
<input id="email" type="email" name="email" />
```

### Images

`alt` describes, briefly, the information the image carries. If the image is decorative, leave `alt=""` and the screen reader skips it. For an image inside a link or a button, the alt text describes where it goes or what it does.[^12]

### Link text

Instead of "click here", write text that means something read on its own: "more information about whales".[^7]

## HTML before ARIA

**ARIA** is a set of attributes that add a role and a state to an element where HTML falls short (`role`, `aria-label`). The W3C's first rule is this: if a native HTML element gives you the meaning and the behaviour you need, use it instead of adding ARIA.[^13] `role="button"` adds the meaning only, not the keyboard behaviour.[^2] The data also shows a higher average error count on pages that use ARIA (59.1 against 42), though some of that is explained by more complex pages using more of it.[^3]

## Going deeper

- **Full course:** web.dev's free Learn HTML course.[^14]
- **Every element defined:** MDN's element list, grouped by what each one does.[^15]
- **Check your own page:** the W3C's Nu Html Checker.[^16]
- **Talk:** Jen Luker on `button` and `div` (12 min).[^10]
- **Talk:** Marcy Sutton on links and buttons.[^17]

## Sources

1. [MDN: Basic HTML syntax](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Basic_HTML_syntax) *(doc)* — Element structure, attributes, void elements, nesting, the doctype and `html/head/body`.
2. [web.dev: Semantic HTML](https://web.dev/learn/html/semantic-html) *(doc)* — Choosing an element by meaning, the accessibility tree, and the behaviour `role` does not bring with it.
3. [WebAIM Million 2026](https://webaim.org/projects/million/) *(research)* — The most common accessibility errors on home pages, and error counts against ARIA use.
4. [MDN: Structuring documents](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Structuring_documents) *(doc)* — What `header`, `nav`, `main`, `article`, `section`, `aside` and `footer` mean, with the warning about `div`.
5. [HTML Standard: Sections](https://html.spec.whatwg.org/multipage/sections.html) *(doc)* — The definitions of `article` and `section`; `section` not being a generic container.
6. [web.dev: Headings and sections](https://web.dev/learn/html/headings-and-sections) *(doc)* — Landmark roles and which `header`/`footer` becomes one.
7. [MDN: HTML, a good basis for accessibility](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML) *(doc)* — `button` against `div`, headings, `label`, `alt` and link text.
8. [MDN: `<h1>`–`<h6>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/heading_elements) *(doc)* — Not skipping levels, one `h1`, and not using a heading for size.
9. [Marcy Sutton: Links vs. Buttons in Modern Web Applications](https://marcysutton.com/links-vs-buttons-in-modern-web-applications/) *(article)* — A link goes to another resource, a button acts on the page you are on.
10. [Jen Luker: Button vs Div, What's the Big Deal Anyway? (React Summit 2020)](https://gitnation.com/contents/button-vs-div-whats-the-big-deal-anyway) *(video)* — 12 minutes. The roles, tabindex and event handlers it takes to turn a `div` into an accessible button.
11. [web.dev Learn Forms: Accessibility](https://web.dev/learn/forms/accessibility) *(doc)* — Every form control needs a `label`.
12. [W3C WAI: An alt Decision Tree](https://www.w3.org/WAI/tutorials/images/decision-tree/) *(doc)* — When alt text is empty, descriptive or functional.
13. [W3C: Using ARIA](https://w3c.github.io/using-aria/) *(doc)* — ARIA's first rule: the native HTML element first.
14. [web.dev: Learn HTML](https://web.dev/learn/html/welcome) *(doc)* — A free HTML course from start to finish.
15. [MDN: HTML elements reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements) *(doc)* — Every element, grouped by what it does.
16. [Nu Html Checker](https://validator.w3.org/nu/) *(doc)* — The W3C's HTML validator.
17. [Marcy Sutton: The Links vs Buttons Showdown (SmashingConf SF 2017)](https://vimeo.com/214419495) *(video)* — Choosing between a link and a button, form features and ARIA.
