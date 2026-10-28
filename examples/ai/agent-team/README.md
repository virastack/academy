# A feature with an AI team

A project that builds a cart coupon code feature with a team of spec, frontend, test and review agents. The walkthrough is in the guide; this folder holds only the files.

- `starter/`: start here. A cart with no coupon, passing tests, a `CLAUDE.md`, and four agents, two hooks and the `/feature-team` skill under `.claude/`.
- `solution/`: an example of what the team produced. `SPEC.md`, the coupon code, the tests and `test-report.md`. Your result may differ.

```bash
cd starter
npm install
npx playwright install chromium
npm test        # every test passes at the start
claude          # then: /feature-team add a coupon code to the cart
```

The hooks use `jq`. On macOS, install it with `brew install jq`.
