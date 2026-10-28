---
title: "From design to component"
description: "Turning a Figma card design into a working, tested React component with an agent, a skill and MCP."
lastVerified: "2026-10-15"
translationKey: "ai/design-to-component"
---

In this project you will turn a profile card design into a React component. Figma MCP reads the design, a skill steers the look, Playwright MCP checks the result in the browser, and the tests that ship with the project are what let you say "done".

The files are ready on GitHub: [design-to-component](https://github.com/virastack/academy/tree/main/examples/ai/design-to-component).

> [!NOTE]
>
> The project was run with `vite@7`, `react@19`, `tailwindcss@4`, `@playwright/test@1.64` and `@axe-core/playwright@4.14` on Node 22. The bundled tests pass 10/10 in the example solution. Three of them are red at the start: there is no card yet.

## Before you start

```bash
git clone https://github.com/virastack/academy
cd academy/examples/ai/design-to-component/starter
npm install
npx playwright install chromium
npm test
```

Three tests should come out red, because the page has no card yet. The goal is to turn those green and keep the other seven that way.

The design is [Modern Profile Card UI](https://www.figma.com/community/file/1625904675991451970/modern-profile-card-ui-free-figma-template). Open the link and copy it into your own account with **Open in Figma**.[^1] Select the card's frame and copy its link. The remote Figma MCP server wants a link to a frame or a layer.[^2]

> [!NOTE]
>
> The design is licensed under CC BY 4.0. To use it you have to credit the designer, link to the licence and state that you made changes.[^3] A ready-made attribution line is in `design/README.md`.

Connect Figma and Playwright MCP:

```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
claude mcp add playwright npx @playwright/mcp@latest
```

There is a plugin route too: `claude plugin install figma@claude-plugins-official`.[^4]

> [!WARNING]
>
> Figma MCP calls are limited on the free plan. Figma's table lists 20 calls a month for View and Collab seats on the Starter plan. Tools that read count towards that limit.[^5] Because this project uses a single frame, a few calls are enough. The limits can change.

## Step 1: Extract the tokens

Start with the colours, the typeface and the shadow. That way there are no hard-coded colours in the component's code.

```text
List the variables and styles (colour, typeface, spacing, shadow) in this Figma frame:
<link to the card frame>
Add them to the @theme block in src/index.css as Tailwind tokens.
```

There is a `get_variable_defs` tool for this. It gives you the colour, spacing and typography variables in the selection.[^2]

**Check:** is the `@theme` block in `src/index.css` filled in? Are the colour names meaningful (`--color-ink`, `--color-heart` and so on)?

## Step 2: Have the component built

```text
Build this Figma frame in src/UserCard.tsx with React and Tailwind:
<link to the card frame>
The component should take the Profile type from src/data.ts as its props. App.tsx should turn the profiles list into cards.
Take the colours only from the tokens in src/index.css.
The card should be an <article>. The name an h2, the avatar an img with alt text, the heart a button with aria-pressed, and the cta another button with its text.
```

`get_design_context` is the main tool. Its default output is React and Tailwind.[^2] If the `frontend-design` skill from the Skills guide is installed, it steers the agent on interface decisions.

The `CLAUDE.md` in the starter folder already tells the agent these rules. You don't have to use the photos from the design; the placeholder images in `public/` are enough.

> [!TIP]
>
> If you see hard-coded colours like `bg-[#111111]` in the output, tell the agent to "turn these into tokens". One of the bundled tests catches it too.

## Step 3: Compare it in the browser

```text
Open the page with npm run dev. Take a screenshot of the first card with Playwright.
Compare it with a screenshot of the Figma frame and list the differences: spacing, font size, corner radius, the avatar's position, colour.
Fix the differences.
```

Playwright MCP reads the page from the accessibility tree, and it can take screenshots too.[^6] On the Figma side, `get_screenshot` gives you an image of the frame.[^2]

**Check:** look at the two images side by side yourself. The agent saying "they match" is not enough.

## Step 4: Run the tests

```bash
npm test
```

The ten tests check this:

| Test | What it checks |
| --- | --- |
| Console | There are no console errors on the page. |
| Heading | There is exactly one `h1`. |
| Cards | One `article` per profile; the name as an `h2`, the avatar, the favourite button, the action button and every piece of text visible. |
| Favourite | Clicking the heart toggles `aria-pressed`, and the button has an accessible name. |
| Overflow (320 and 1280) | No horizontal scrolling, nothing spills outside the card including the long name, and the buttons are at least 24x24 pixels. |
| Screenshot | Writes an image of the card into the `screenshots/` folder (for step 3). |
| Alt text | Every image has an `alt`. |
| Accessibility | No serious or critical WCAG violation according to axe. |
| Hard-coded colours | There is no `#hex`, `rgb()`, `hsl()` or `oklch()` under `src`. |

The hard-coded-colour test, the 24-pixel target limit and the axe tags are choices specific to this project. The 24x24 limit is a WCAG 2.2 AA criterion (SC 2.5.8).[^7] axe catches only some of the problems; the rest need a manual check.[^8]

When a test fails, paste the output to the agent: *"This test failed, find the cause and fix it. Do not change the test."* That last sentence matters. An agent can also make a test pass by loosening it.

## Done when

1. `npm test` is 10/10 green.
2. The design's colours are in the `@theme` block of `src/index.css`, and the component has no hard-coded colours.
3. `screenshots/card-1.png` looks like the Figma frame to the eye.
4. Pressing Tab on the keyboard takes you to the heart and then the action button, Enter or Space toggles the heart, and the focus ring is visible.

## Sources

1. [Figma Help: Community Licenses](https://help.figma.com/hc/en-us/articles/360038510873-Community-Licenses) *(doc)* — Copying a free Community file into your own drafts, and how the licence terms vary by file.
2. [Figma: Tools and prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/) *(doc)* — The remote server's need for a link, `get_design_context`, `get_screenshot`, `get_variable_defs`, `get_metadata`.
3. [Creative Commons: CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) *(doc)* — Permission to share, adapt and use commercially; the attribution, licence-link and change-notice conditions.
4. [Figma: MCP server guide](https://github.com/figma/mcp-server-guide) *(repo)* — The setup commands and the plugin for Claude Code.
5. [Figma: Rate limits & access](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/) *(doc)* — Call limits by plan and seat.
6. [Playwright MCP](https://github.com/microsoft/playwright-mcp) *(repo)* — The accessibility snapshot and the setup.
7. [W3C: Understanding SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) *(doc)* — Targets of at least 24x24 CSS pixels, level AA.
8. [Playwright: Accessibility testing](https://playwright.dev/docs/accessibility-testing) *(doc)* — Automated scanning with axe and its limits.
