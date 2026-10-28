# Profile card

- React 19, TypeScript, Tailwind CSS v4 (tokens with `@theme`). Do not add another library.
- The card lives in `src/UserCard.tsx`, a single component taking the `Profile` type (`src/data.ts`) as a prop. `App.tsx` turns the `profiles` list into cards.
- The colours, fonts and spacing come from the `@theme` tokens in `src/index.css`. Do not write a fixed colour (`#hex`, `rgb()`, `bg-[#...]`) in a component.
- Every card is an `<article>`. Inside it there is the name as an `h2`, the avatar as an `img` with `alt` text, a favourite button (a `button` with `aria-pressed` and an accessible name) and a `button` with the `cta` text. There is a single `h1` on the page.
- A long name must not overflow the card. It also has to work at 320 px wide.
- Run `npm test` before you finish. Do not say you are done until they all pass.
