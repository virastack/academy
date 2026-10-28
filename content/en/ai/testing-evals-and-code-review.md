---
title: "Testing, evals and code review"
description: "Having tests written, checking with Playwright MCP, measuring model output with evals and reviewing AI code."
lastVerified: "2026-10-15"
translationKey: "ai/testing-evals-and-code-review"
---

AI is fast at writing tests. But a test that passes is not the same as a test that does its job. This guide covers four things: how to have AI write tests, how to have it check the result in a browser with Playwright MCP, how to measure the model's answers, and how to review AI output. The test examples follow the e-commerce cart from the [Models and tools](/academy/ai/models-and-tools) guide: the `CartItem` component, the quantity buttons and the stock limit.

> [!NOTE]
>
> The code in this guide was run with `vitest@5.0.4`, `@testing-library/react@16.3.3`, `@testing-library/user-event@14.6.8`, `@testing-library/jest-dom@7.0.1`, `@playwright/test@1.64.1` and `@playwright/mcp@0.0.83` on Node 22. Playwright MCP needs Node 18 or above.[^1] If you don't know how to connect MCP, read the [MCP](/academy/ai/mcp) guide first.

## Run the tests first

[Simon Willison](https://simonwillison.net) suggests opening a session on an existing project with this sentence: *"First run the tests"*. The agent learns how the tests work, it is more likely to run them again after a change, and it slips into a test-writing mode.[^2]

The test recipe in the Claude Code docs has four steps.[^3] You can write the same sequence for `CartItem` like this:

```text
List the behaviours in CartItem.tsx that no test covers
Write tests for CartItem
Add edge-case tests for the stock limit and the minimum quantity
Run the new tests and fix anything that fails
```

The docs also say that Claude follows the framework and the assertion style of your existing test files. What you have to be concrete about is what should be verified.[^3]

> [!TIP]
>
> Don't say *"write tests"*. Say *"the Increase button should be disabled when the stock runs out"*. When you state the behaviour, the AI does not drift into testing the component's internals.

## What a good test looks like

According to [Kent C. Dodds](https://kentcdodds.com), tests that check internal details mislead you in two ways. Reorganize the internals and the test breaks although the application works. Break the application and the test can still pass.[^4] The fix is to test the component the way a user would.

Testing Library suggests an order of queries for that:[^5]

| Priority | Queries |
| --- | --- |
| 1. Accessible to everyone | `getByRole`, `getByLabelText`, `getByPlaceholderText`, `getByText`, `getByDisplayValue` |
| 2. Semantic | `getByAltText`, `getByTitle` |
| 3. Last resort | `getByTestId` |

`getByRole` is the first choice in most cases. If you cannot find an element with it, your interface may not be accessible.[^5]

### An example: CartItem

```tsx
// src/cart-item.tsx
import { useState } from 'react';

const eur = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' });

type Props = { name: string; price: number; stock: number };

export function CartItem({ name, price, stock }: Props) {
  const [qty, setQty] = useState(1);

  return (
    <li>
      <span>{name}</span>
      <button type="button" onClick={() => setQty(q => q - 1)} disabled={qty <= 1}>
        Decrease
      </button>
      <span>{qty} items</span>
      <button type="button" onClick={() => setQty(q => q + 1)} disabled={qty >= stock}>
        Increase
      </button>
      <strong>{eur.format(price * qty)}</strong>
    </li>
  );
}
```

The setup files:

```ts
// src/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: { environment: 'jsdom', setupFiles: ['./src/setup.ts'], include: ['src/**/*.test.tsx'] },
});
```

> [!WARNING]
>
> If `globals` is off in Vitest, Testing Library does not clean up between tests, because the automatic cleanup only kicks in when there is a global `afterEach`. The symptom: the tests pass one by one but running them together gives "Found multiple elements with the role...". The fix: turn on `globals: true` or write `afterEach(() => cleanup())` as above.[^6]

Now two test files. The first is the kind that looks good enough on the surface when you say *"write tests for this component"*:

```tsx
// src/weak.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { CartItem } from './cart-item';

it('renders', () => {
  const { container } = render(<CartItem name="Headphones" price={100} stock={3} />);
  expect(container).toBeTruthy();
  expect(container.querySelector('li')).not.toBeNull();
});

it('increases quantity', () => {
  render(<CartItem name="Headphones" price={100} stock={3} />);
  fireEvent.click(screen.getByText('Increase'));
  expect(screen.getByText('2 items')).toBeTruthy();
});
```

The second tests what the user sees and does:

```tsx
// src/good.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { CartItem } from './cart-item';

it('updates the amount as the quantity grows', async () => {
  const user = userEvent.setup();
  render(<CartItem name="Headphones" price={100} stock={3} />);

  await user.click(screen.getByRole('button', { name: 'Increase' }));

  expect(screen.getByText('2 items')).toBeInTheDocument();
  expect(screen.getByText('€200.00')).toBeInTheDocument();
});

it('disables the Increase button when stock runs out', async () => {
  const user = userEvent.setup();
  render(<CartItem name="Headphones" price={100} stock={3} />);

  await user.click(screen.getByRole('button', { name: 'Increase' }));
  await user.click(screen.getByRole('button', { name: 'Increase' }));

  expect(screen.getByText('3 items')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled();
});

it('never goes below a quantity of 1', () => {
  render(<CartItem name="Headphones" price={100} stock={3} />);
  expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled();
});
```

On clean code both pass (5 tests, 5 green). The real difference shows up when you break the code:

| Deliberately introduced bug | The weak test | The strong test |
| --- | --- | --- |
| The stock limit: `qty > stock` instead of `qty >= stock` | Passed | Failed |
| The amount is not multiplied by the quantity: `price` instead of `price * qty` | Passed | Failed |

The weak test missed both bugs. The stock can be exceeded and the amount is wrong, but the screen is green.

> [!DO]
>
> After the AI writes a test, break the code on purpose. If the test does not fail, that test is not protecting you. [Willison](https://simonwillison.net) says the same: every change should come with a test that fails once the application code is reverted.[^7]

> [!DONT]
>
> Move on from nothing but an *"all tests passed"* line.

## Testing in the browser with Playwright

Vitest and jsdom exercise a component on its own. Playwright exercises the whole page in a real browser. The ones from the best-practices page that will serve you:[^8]

- Test the behaviour the user sees. Don't tie yourself to function names or CSS classes.
- Use resilient locators like `getByRole`. CSS and XPath selectors break when the DOM changes.
- Use web-first assertions. `toBeVisible()` waits until the condition holds; `isVisible()` does not.
- Keep every test independent of the others.

The page below is the plain-HTML equivalent of `CartItem`:

```html
<!-- demo/index.html -->
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Cart</title></head>
<body>
  <h1>Cart</h1>
  <ul>
    <li>
      <span>Headphones</span>
      <button type="button" id="dec">Decrease</button>
      <span id="qty">1 items</span>
      <button type="button" id="inc">Increase</button>
      <strong id="total">€100.00</strong>
    </li>
  </ul>
  <script>
    const stock = 3, price = 100;
    let qty = 1;
    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' });
    const dec = document.getElementById('dec'), inc = document.getElementById('inc');
    function render() {
      document.getElementById('qty').textContent = qty + ' items';
      document.getElementById('total').textContent = fmt.format(price * qty);
      dec.disabled = qty <= 1;
      inc.disabled = qty >= stock;
    }
    dec.onclick = () => { qty--; render(); };
    inc.onclick = () => { qty++; render(); };
    render();
  </script>
</body>
</html>
```

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'python3 -m http.server 4173 -d demo',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
  use: { baseURL: 'http://localhost:4173' },
});
```

Here we serve the demo page with a static server. In your own project, put your dev server command in the `command` field.

```ts
// e2e/cart.spec.ts
import { expect, test } from '@playwright/test';

test('the Increase button is disabled when stock runs out', async ({ page }) => {
  await page.goto('/');

  const inc = page.getByRole('button', { name: 'Increase' });
  await inc.click();
  await inc.click();

  await expect(page.getByText('3 items')).toBeVisible();
  await expect(page.getByText('€300.00')).toBeVisible();
  await expect(inc).toBeDisabled();
});
```

Changing the page's `inc.disabled = qty >= stock` line to `qty > stock` made the test fail with this error:

```text
Error: expect(locator).toBeDisabled() failed
Expected: disabled
Received: enabled
```

Reverting it made the test pass again.

## Giving the AI a browser with Playwright MCP

Playwright MCP is an MCP server that lets the AI use a browser. It reads the page not from a screenshot but from a structural snapshot taken from the accessibility tree. That is why it needs no vision model.[^1] In Claude Code a single command is enough:[^1]

```command
claude mcp add playwright npx @playwright/mcp@latest
```

Calling `browser_navigate` and `browser_snapshot` on the demo page produced this output:

```yaml
- heading "Cart" [level=1] [ref=e2]
- list [ref=e3]:
  - listitem [ref=e4]:
    - text: Headphones
    - button "Decrease" [disabled] [ref=e5]
    - text: 1 items
    - button "Increase" [ref=e6]
    - strong [ref=e7]: €100.00
```

After `browser_click` was called twice with the `Increase` button, the snapshot turned into this:

```yaml
    - button "Decrease" [ref=e5]
    - text: 3 items
    - button "Increase" [disabled] [ref=e6]
    - strong [ref=e7]: €300.00
```

The roles and names in the snapshot (`button "Increase"`) match the `getByRole('button', { name: 'Increase' })` you use in the test. `browser_click` also returns the Playwright code it ran, and you can move that line straight into a test.

The flow [Willison](https://simonwillison.net) suggests is this: see the change working first, then write an automated test that fails once it is reverted.[^7] Playwright MCP makes that shorter:

```text
Open http://localhost:4173 in the browser.
Press the Increase button until the stock runs out.
Check whether the button is disabled and the amount is right.
Then write this flow as a Playwright test in e2e/cart.spec.ts.
Run the test.
```

Then break the code as above and watch the test fail.

> [!CAUTION]
>
> Playwright MCP is not a security boundary. The project says so plainly in its own README. The `browser_run_code_unsafe` tool runs arbitrary JavaScript in the server process, and the README treats that as equivalent to remote code execution. `--allowed-origins` and `--blocked-origins` are not security boundaries either.[^1] Don't use it on sites you don't trust, and review the agent's tool permissions.

## Playwright test agents

Playwright ships three ready-made agents of its own:[^9]

| Agent | What it does |
| --- | --- |
| Planner | Browses the application and writes a Markdown test plan under `specs/`. It needs a seed test |
| Generator | Turns the plan into Playwright tests under `tests/` and verifies the selectors live. The first output can have errors |
| Healer | Re-runs the failing tests, looks at the interface and suggests a fix |

Setup is one command. For Claude Code it worked like this:

```command
npx playwright init-agents --loop=claude
```

The command created the three agent definitions under `.claude/agents/`, an `.mcp.json` file and the seed test `e2e/seed.spec.ts`. You are advised to regenerate the agent definitions when you upgrade Playwright.[^9]

> [!TIP]
>
> Read the test the healer changed as a diff. A passing test does not mean a correct one; it may have loosened the expectation.

## Measuring model output with evals

Tests exercise your code. An eval measures whether the model's answer does its job. Answers can change when the model or the prompt changes, so "I tried it by hand and it looked fine" is not enough. An eval has three parts: a fixed list of inputs, a grader for each answer, and a pass rate.

- **Start small.** Anthropic treats 20 to 50 simple tasks drawn from real failures as a good start.[^10]
- **Add the edge cases.** Empty, very long and ambiguous inputs belong on the list.[^11]
- **Pick the simplest grader.** Try grading with code first, and grade with a model when the judgement needs nuance.[^10][^11]
- **Read the transcripts.** The only way to know the grader works is to read the answers and the grades.[^10]

| Method | Upside | Downside |
| --- | --- | --- |
| With code (exact match, contains) | The fastest and most reliable | Not enough for nuanced judgement |
| With a model (LLM-as-judge) | Flexible and it scales | Has to be validated against human labels first |
| Human | The highest quality | Slow and expensive |

When you grade with a model, you are advised to use a different model from the one that produced the answer and to give it a clear rubric.[^11] [Hamel Husain](https://hamel.dev) also suggests comparing the model's grades with human labels and aligning them.[^12]

The example below sets up an eval for a task that extracts the maximum price from a user's sentence. In reality `v1` and `v2` would be two different prompts or model versions. Here we used two functions so it runs offline:

```ts
// eval.ts
type Case = { input: string; expected: number | null };

const cases: Case[] = [
  { input: 'running shoes under 1500 EUR', expected: 1500 },
  { input: 'I have a budget of 2,500 EUR', expected: 2500 },
  { input: 'at most 800 eur', expected: 800 },
  { input: 'show me running shoes', expected: null }, // no price
  { input: '', expected: null },                      // empty input
];

function runEval(name: string, fn: (s: string) => number | null) {
  const failed = cases.filter((c) => fn(c.input) !== c.expected);
  const pass = cases.length - failed.length;
  console.log(`${name}: ${pass}/${cases.length}`);
  for (const c of failed) console.log(`  ✗ "${c.input}" → ${fn(c.input)} (expected ${c.expected})`);
  return pass / cases.length;
}

const v1 = (s: string) => Number(s.match(/(\d+)\s*eur/i)?.[1] ?? NaN) || null;
const v2 = (s: string) => {
  const m = s.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*eur/i);
  return m ? Number(m[1].replaceAll(',', '')) : null;
};

const a = runEval('v1', v1);
const b = runEval('v2', v2);
if (b < a || b < 1) process.exitCode = 1;
```

```command
node eval.ts
```

```text
v1: 4/5
  ✗ "I have a budget of 2,500 EUR" → 500 (expected 2500)
v2: 5/5
```

`v1` cannot read a thousands separator, and the eval shows that immediately. When you change version and the rate drops (`b < a`), the exit code becomes 1 and you see red in CI.

With a real model, build the same loop around the model call. Because the answer can change every time, run each case several times. If consistency matters, use the `pass^k` metric, which measures the probability that every attempt passes.[^10]

## Reviewing AI output

According to [Willison](https://simonwillison.net), your job is *"to deliver code you have proven to work"*. Sending a large, untested PR means handing the real work to whoever reviews it. As proof you can paste a command and its output into the PR, and add a screen recording for a change that is hard to show.[^7]

[Addy Osmani](https://addyosmani.com) lists the patterns he sees often in AI code. These are the author's observations, not measured data:[^13]

- **A wrong assumption:** the model builds on a misunderstanding from the start. It can surface several PRs later.
- **Needless abstraction:** it adds far more structure than the job requires.
- **Dead code:** the old implementation stays behind, and comments or code change in unrelated places.

His suggestion: automate the verification with CI, a linter, type checking and tests, and have the model review its own code in a fresh context window.[^13]

Security is a separate risk. Veracode's March 2026 update measured 80 coding tasks in Java, JavaScript, C# and Python. Only 55% of the tasks produced secure code. In JavaScript the rate was 57%, and for XSS 15%.[^14]

You can turn all of this into a short checklist:

| What to look at | How to look |
| --- | --- |
| Was it proven to work? | Look for command output or a screen recording in the PR |
| Does a test protect it? | Break the code on purpose; the test should fail |
| Does the test act like a user? | Look at the queries and assertions: `getByRole`, `userEvent`, `toBeDisabled`[^5] |
| Is there needless code? | Look for new abstractions and unused files and functions |
| Where does user input go? | Look especially at the places that turn into HTML (`dangerouslySetInnerHTML`, `innerHTML`) |

For a second pair of eyes you can have the model do this (in a new session):

```text
Review this diff. Look for wrong assumptions, needless abstraction, dead code and security problems involving user input. Give the file and line for every finding. If there is nothing wrong, say "found no problems".
```

> [!NOTE]
>
> This second review does not replace a human review. It only reduces what slips through.

## Try it yourself

1. Set up `CartItem` and the two test files. Change the `qty >= stock` line to `qty > stock`. See which test fails and which passes. Then revert it.
2. Have the AI *"write tests"* for a component of your own and try it against code you broke on purpose. Did it miss a bug?
3. Have Playwright MCP browse the demo page, have the flow written as `e2e/cart.spec.ts`, and run it.
4. Add a case of your own to `eval.ts` (`"a thousand EUR"`, say). Make it pass without breaking `v2`.
5. Run the review prompt above on your last change in a new session. Verify what it finds yourself.

## Sources

1. [Playwright MCP](https://github.com/microsoft/playwright-mcp) *(repo)* — The accessibility snapshot, the setup command, the options and the security notes.
2. [Simon Willison: First run the tests](https://simonwillison.net/guides/agentic-engineering-patterns/first-run-the-tests/) *(article)* — Opening a session with the agent by running the tests.
3. [Claude Code: Common workflows](https://code.claude.com/docs/en/common-workflows) *(doc)* — The "Work with tests" recipe: finding untested code, having tests written, edge cases, and running them to verify.
4. [Kent C. Dodds: Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details) *(article)* — How testing internal details produces false negatives and false positives (August 2020).
5. [Testing Library: About Queries](https://testing-library.com/docs/queries/about/#priority) *(doc)* — The query priority order and the recommendation of `getByRole`.
6. [Testing Library: React Testing Library Setup](https://testing-library.com/docs/react-testing-library/setup/) *(doc)* — Automatic cleanup, and either `globals` or a manual `cleanup` for Vitest.
7. [Simon Willison: Your job is to deliver code you have proven to work](https://simonwillison.net/2025/Dec/18/code-proven-to-work) *(article)* — Manual testing, an automated test that fails when the change is reverted, and asking agents for proof (December 18, 2025).
8. [Playwright: Best Practices](https://playwright.dev/docs/best-practices) *(doc)* — Testing user behaviour, locators, web-first assertions and isolation.
9. [Playwright: Test Agents](https://playwright.dev/docs/test-agents) *(doc)* — The planner, generator and healer agents, and the `init-agents` setup.
10. [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) *(article)* — Starting small, the three kinds of grader, reading transcripts and `pass^k` (January 9, 2026).
11. [Anthropic: Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) *(doc)* — Measurable criteria, edge cases, grading methods and tips for an LLM grader.
12. [Hamel Husain: Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) *(article)* — Fast assertions, reading transcripts and aligning a model grader with human labels (March 29, 2024).
13. [Addy Osmani: The 80% Problem in Agentic Coding](https://addyosmani.com/blog/the-80-problem-in-agentic-coding/) *(article)* — Common failure patterns in AI code and suggestions for verification (January 28, 2026).
14. [Veracode: Spring 2026 GenAI Code Security Update](https://www.veracode.com/blog/spring-2026-genai-code-security) *(research)* — Security success rates in AI code, by language and vulnerability type (March 24, 2026).
