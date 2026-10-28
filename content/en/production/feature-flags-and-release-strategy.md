---
title: "Feature flags and release strategy"
description: "The Flags SDK, a percentage rollout, canary and blue-green."
lastVerified: "2026-10-22"
translationKey: "production/feature-flags-and-release-strategy"
---

## Deploying and releasing are different

A **deploy** is the new code going to the server. A **release** is the user seeing the new feature. In most projects the two are simultaneous: the moment the code goes live everyone sees the new feature, and if something goes wrong the only remedy is deploying again.

A feature flag separates the two. The code is live but the feature is off; a piece of configuration decides who sees it and when. If something goes wrong the flag is turned off, with no deploy needed.

## Kinds of flag

Pete Hodgson's article published on [martinfowler.com](https://martinfowler.com/) divides flags into four by how long they live and how dynamic they are:[^1]

| Kind | Purpose | Lifetime |
| :-- | :-- | :-- |
| Release | Shipping an unfinished or new feature while keeping it off | Days, a few weeks |
| Experiment | An A/B test; splitting users into groups and comparing the behaviour | Until the result is significant |
| Ops | Turning a heavy feature off under load; the "emergency switch" | Short or permanent |
| Permissioning | Opening a feature only to certain users *(beta, premium, the internal team)* | Long, often permanent |

Hodgson's most important warning is about the cost: flags are an **inventory** and carry a carrying cost. Every flag means a branch in the code, a combination that has to be tested, and permanent complexity if it is forgotten. Release flags have to be deleted once their job is done.[^1]

> [!DO]
>
> - Give every flag an owner and a deletion date.
> - Once a feature has reached 100 percent and run without problems for a while, open the pull request that deletes the flag and the old code.

## The Flags SDK

The Flags SDK is the [!nextjs] team's open-source flag library; it works with any flag provider or with your own rules.[^2]

```command
npm install flags
```

Every flag is defined as a **function**:[^2][^3]

```ts
// lib/flags.ts
import "server-only";
import { flag } from "flags/next";
import { getEnv } from "./env";
import { isInRollout } from "./rollout";
import { SESSION_COOKIE } from "./session";
import { readSession } from "./store";

type Entities = { user?: { id: string } };

export const orderSummaryFlag = flag<boolean, Entities>({
  key: "order-summary",
  description: "A count and total-amount summary above the order list",
  defaultValue: false,
  options: [
    { value: false, label: "Off" },
    { value: true, label: "On" },
  ],
  identify({ cookies }) {
    const session = readSession(cookies.get(SESSION_COOKIE)?.value);
    return session ? { user: { id: session.user.id } } : undefined;
  },
  decide({ entities }) {
    if (!entities?.user) return false;
    return isInRollout(entities.user.id, "order-summary", getEnv().ORDER_SUMMARY_ROLLOUT);
  },
});
```

- `key` is the flag's identity.
- `defaultValue` is used if the flag cannot be evaluated. Having the default in the definition guarantees the same default on every call.[^3]
- `identify` works out **who** the decision is made for. It takes normalised `headers` and `cookies`, and the entities it returns are passed to `decide`.[^4]
- `decide` decides **what** is returned.

Hodgson's article recommends separating the decision point *(where the flag is asked about in the code)* from the decision logic *(what the flag is turned on by)*.[^1] The Flags SDK's `identify` and `decide` split is exactly that. When the rule changes, the calling code does not.

Using it:

```tsx
// app/orders/page.tsx
async function OrdersSection() {
  const user = await getCurrentUser();
  const showSummary = await orderSummaryFlag();

  return <OrdersPanel canCancel={user.role === "admin"} showSummary={showSummary} />;
}
```

Every flag is called the same way: `await orderSummaryFlag()`. With "Find all references" in the editor you see everywhere the flag is used; that helps a lot when the day comes to delete it.[^3]

## Why on the server?

The Flags SDK argues for evaluating flags on the server. A flag evaluated in the browser has to show either a loading indicator or a guessed version until the value arrives over the network; if the value turns out different, the page shifts.[^5] With a flag evaluated on the server, the server sends only the right version.

The cost: because the flag reads a cookie, that part of the page becomes request-dependent *(dynamic)*. In this project the flag is called in a component that already reads the session, inside `Suspense` *(see [Data fetching and streaming](/academy/nextjs/data-fetching-and-streaming))*. For marketing pages that have to stay static, the SDK has precompute patterns with the proxy.[^5]

## A percentage rollout

Saying "open it to 10 percent of users" is easy; doing it right is not. `Math.random() < 0.1` gives a different result on every request: the feature disappears when the user reloads the page.

The right way is placing the user in a **fixed bucket**. A hash of the user's id is turned into a number between 0 and 99; if the number is smaller than the percentage, the user is in:

```ts
// lib/rollout.ts
export function rolloutBucket(id: string, salt: string): number {
  let hash = 0x811c9dc5;
  for (const char of `${salt}:${id}`) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 100;
}

export function isInRollout(id: string, salt: string, percentage: number): boolean {
  return rolloutBucket(id, salt) < percentage;
}
```

This method has three properties, each confirmed by a test in the project:

1. **Stable:** the same user falls into the same bucket on every request.
2. **Balanced:** across 10,000 users, a 30 percent rollout includes about 30 percent.
3. **Growing:** when you go from 10 percent to 30, nobody who was in before falls out; because whoever's bucket is smaller than 10 is also smaller than 30.

The `salt` gives every flag a different distribution. Without a salt, the first to see every new feature would always be the same 10 percent.

> [!NOTE]
>
> In the project the percentage comes from the `ORDER_SUMMARY_ROLLOUT` environment variable, and changing it requires restarting the server. In real projects this value is kept in a flag provider *(such as LaunchDarkly, Statsig, GrowthBook or Vercel Flags)* and changes instantly. That is what the Flags SDK's provider adapters are for; the inside of `decide` changes and the calling code does not.[^2]

## Canary and Blue-Green

Flags work at the feature level. There are strategies at the **deploy level** too:

**A canary release.** According to Danilo Sato's description on [martinfowler.com](https://martinfowler.com/), the new version is given to a small part of the traffic first. If there is no problem the share is increased gradually, and if one appears the traffic goes back to the old version.[^6] It takes its name from the canary miners took into the pit to notice poisonous gas early.

**A blue-green deploy.** In the method [Martin Fowler](https://martinfowler.com/) describes, there are two identical production environments. While one takes the traffic, the new version is installed into the other and tested; then the router turns the traffic to the new environment. To roll back, turning the router to the old environment is enough.[^7]

| Strategy | What is controlled | Rolling back |
| :-- | :-- | :-- |
| A feature flag | A single feature, per user | Turning the flag off, in seconds |
| Canary | The whole version, by traffic percentage | Turning the traffic to the old version |
| Blue-green | The whole version, in one go | Turning the router to the old environment |

Platforms such as [!vercel] keep every deploy separately and let you return production to an older deploy instantly. On your own infrastructure that means starting the old image again; that is one reason for tagging images with the commit SHA *(see [CI/CD](/academy/production/cicd))*.

> [!WARNING]
>
> During a gradual release the old and the new version run at the same time. If the database schema is changing, the new version has to work with the old schema and the old version with the new one. The equivalent on the Next.js side is version skew; `deploymentId` is there for that *(see [Deployment options](/academy/production/deployment-options))*.

## Watching the rollout

Before raising the percentage, ask: did the error rate rise? Did the latency change? To be able to separate the users the flag is on for in the error monitoring and the logs, add the flag's value to the records:

```ts
logger.info({ event: "orders_viewed", userId: user.id, orderSummary: showSummary }, "Orders viewed");
```

A typical rollout schedule: the internal team, 1 percent, 10 percent, 50 percent, 100 percent. Look at the metrics at every step; moving to the next step is a decision, not automatic.

## Testing the flags

A feature behind a flag has two states, and both have to be tested.

**As a pure function.** `rolloutBucket` and `isInRollout` need no browser; in the project, `tests/rollout.spec.ts` confirms them. In a real project these tests run faster in a unit test tool such as [Vitest](/academy/vitest).

**End to end.** In the project, Playwright starts the server with `ORDER_SUMMARY_ROLLOUT=100` and confirms that the summary appears *(see [Playwright](/academy/playwright))*:

```ts
// playwright.config.ts
webServer: {
  command: "npm run build && npm run start",
  url: "http://localhost:3000/login",
  env: { PORT: "3000", APP_ENV: "local", APP_VERSION: "test", ORDER_SUMMARY_ROLLOUT: "100" },
},
```

The Flags SDK also supports an encrypted override cookie for setting a value per test. That needs `FLAGS_SECRET`; the same secret also lets you change a flag in your own session with the Vercel Toolbar's Flags Explorer.[^8]

## Try it yourself

- Add a release flag to your project. Show the old component when it is off and the new one when it is on.
- Run `rolloutBucket` with 10,000 ids and measure the distribution for 10, 30 and 50 percent.
- Remove the salt and see that the users who stay in are the same for two different flags.
- List the flags in your project. Which one is at 100 percent and still in the code?

## Going deeper

- **Article:** Pete Hodgson, "Feature Toggles (aka Feature Flags)"; the kinds of flag, the decision point and the carrying cost.[^1]
- **Official docs:** Flags SDK, "Quickstart" and "Flags as Code"; defining flags in Next.js.[^2][^3]
- **Article:** Danilo Sato, "Canary Release"; releasing with gradual traffic.[^6]

## Sources

1. [Pete Hodgson](https://martinfowler.com/): [Feature Toggles (aka Feature Flags)](https://martinfowler.com/articles/feature-toggles.html) *(article)* — October 9, 2017. Release, experiment, ops and permissioning flags, separating the decision point from the logic, and the carrying cost.
2. [Flags SDK: Quickstart](https://flags-sdk.dev/frameworks/next) *(doc)* — The setup in Next.js, defining a flag and using it in the App Router.
3. [Flags SDK: Flags as Code](https://flags-sdk.dev/principles/flags-as-code) *(doc)* — Flags being functions, the default value in the definition, and the context being set up in the definition.
4. [Flags SDK: Evaluation Context](https://flags-sdk.dev/frameworks/next/evaluation-context) *(doc)* — `identify`, typed entities, and the normalised headers and cookies.
5. [Flags SDK: Server-side vs Client-side](https://flags-sdk.dev/principles/server-side-vs-client-side) *(doc)* — The reasoning for evaluating on the server, and the static page patterns.
6. [Danilo Sato](https://martinfowler.com/): [Canary Release](https://martinfowler.com/bliki/CanaryRelease.html) *(article)* — June 25, 2014. Trying a new version with a small part of the traffic.
7. [Martin Fowler](https://martinfowler.com/): [Blue Green Deployment](https://martinfowler.com/bliki/BlueGreenDeployment.html) *(article)* — March 1, 2010. Two production environments, and switching and rolling back with the router.
8. [Flags SDK: End-to-End Tests](https://flags-sdk.dev/frameworks/next/guides/e2e-tests) *(doc)* — The override cookie with Playwright, and `FLAGS_SECRET`.
