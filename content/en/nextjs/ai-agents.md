---
title: "Next.js with AI agents"
description: "The bundled documentation, AGENTS.md, MCP, error prompts and the Next.js skills."
lastVerified: "2026-10-21"
translationKey: "nextjs/ai-agents"
---

## The problem: the model knows an older Next.js

Next.js has changed quickly over the last two years. A model's training data is usually older than the installed version, and it suggests the old patterns.[^1] The older forms of the changes in this guide, as they commonly turn up in AI output:

| Old advice | In Next.js 16.4 |
| :-- | :-- |
| `middleware.ts` | `proxy.ts` |
| `export const revalidate = 60`, `dynamic = "force-static"` | `"use cache"` and `cacheLife` |
| `params.slug` | `const { slug } = await params` |
| `import { useRouter } from "next/router"` | `next/navigation` |
| `reset()` in `error.tsx` | `retry()` |
| `next lint` | `eslint` |
| `getServerSideProps` | `await` in a Server Component |

The Next.js team decided to solve this from inside the framework. Since 16.2, every release has come with separate tooling for agents.[^2][^3]

## The bundled documentation and AGENTS.md

Since Next.js 16.2 the documentation ships inside the package, under `node_modules/next/dist/docs/`. It matches the installed version exactly and needs no internet. Since 16.3, `create-next-app` and `next dev` write a block into the project's root `AGENTS.md` that points the agent at that folder:[^1]

```md
<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ
from your training data. Read the relevant guide in `node_modules/next/dist/docs/`
before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->
```

Next.js only manages the part between the markers; you can write your own rules in the rest of the file. To turn it off, set `agentRules: false` in `next.config.ts`.[^4]

Why `AGENTS.md` rather than a skill? In Vercel's evaluation for Next.js 16, a compressed documentation index embedded in `AGENTS.md` passed 100% of the tests, while the skill-based approach reached 79% at best. In 56% of the cases the agent never called the skill at all.[^5] The conclusion: information that is always in the context beats information the agent has to go looking for.

> [!TIP]
>
> [!claudeCode] does not read `AGENTS.md` if there is a `CLAUDE.md` in the directory. If you use both, import it by writing `@AGENTS.md` inside `CLAUDE.md`. Rule files are covered in the [Prompt and context engineering](/academy/ai/prompt-and-context-engineering) lesson.

If the agent cannot reach `node_modules`: every documentation page on nextjs.org returns plain Markdown with a `.md` extension, and `/docs/llms.txt` offers an index.[^1]

## Errors become prompts

With Cache Components on, a blocking error arrives with tagged fixes. The same list appears in the development overlay, in the terminal and in the `next build` output, which means an agent reading the CI logs sees it too:[^1]

```text
Route "/products/[slug]": Next.js encountered uncached data during prerendering.

Ways to fix this:
  - [stream] Provide a placeholder with `<Suspense fallback={...}>` around the data access
  - [cache] Cache the data access with `"use cache"`
  - [block] Set `export const instant = false` to allow a blocking route

Learn more: https://nextjs.org/docs/messages/blocking-prerender-dynamic
```

The **Copy prompt** button on the error screen turns the fix you chose into an instruction to paste to an agent. The `Learn more` pages are written for agents to read too: the pattern for each fix, its trade-off, and the points people miss on a first attempt.[^1]

## Seeing the running application

For an agent to verify its change, it needs to know what both the framework and the browser see:[^1][^6]

- `next dev` writes the browser console's errors and warnings to the terminal as well, so the agent sees client errors in output it already reads.
- The dev server opens an MCP endpoint at `/_next/mcp`. An agent connected with `next-devtools-mcp` reads the routes, the errors and the compilation problems; it can ask whether the code compiles without running `next build`. Setting it up is in the [MCP](/academy/ai/mcp) lesson.
- The `next-dev-loop` skill adds the browser's DOM, console and network views through the `agent-browser` CLI. Because it starts with React DevTools open, it also reads the component tree and the pending Suspense boundaries.

## The Next.js skills

The documentation provides knowledge; skills sequence **multi-step jobs**. The Next.js team's own skills:[^1][^7]

| Skill | What it does |
| :-- | :-- |
| `next-dev-loop` | Verifies in the running dev server and the browser after every edit |
| `next-cache-components-adoption` | Migrates an existing application to Cache Components, checking with you at each step |
| `next-cache-components-optimizer` | Grows a page's static shell; it writes a failing `instant()` test first |
| `next-partial-prefetching-adoption` | Migrates the application to Partial Prefetching |
| `next-bundle-optimizer` | Looks at Turbopack's bundle analysis and shrinks the client bundle *(16.4)* |

```command
npx skills add vercel/next.js --skill next-dev-loop
```

> *"After every edit, verify with the next-dev-loop skill that the page works."*

The method of the `optimizer` skills is a good habit: describe the behaviour you want in a test first, change things until the test passes, and commit the test so that a future change that breaks it gets caught.[^1] The general rules for writing a skill are in the [Skills](/academy/ai/skills) lesson.

## Upgrading with an agent

`next upgrade --agent` gathers the new version's migration guides and hands the work to the agent; the agent makes the change and verifies the application. In 16.4 it is experimental and works with the `canary` release:[^8]

```bash
npx next@canary upgrade --agent=latest
```

> [!DO]
>
> - Ask the agent to read `AGENTS.md` and `node_modules/next/dist/docs/` first.
> - Require it to run `npm run lint`, `tsc --noEmit` and `next build` before it says it is done.
> - Compare the code it suggests against the table above; if you see an old pattern, give the agent the relevant documentation page.

## Try it yourself

- In a folder with no `AGENTS.md`, ask an AI tool to *"cache the product page in Next.js so that it refreshes every 60 seconds"*. Then make the same request in a project created with `create-next-app`. Compare the answers with the rows in the table.
- Read uncached data outside a `<Suspense>` on a page. Paste the **Copy prompt** from the error screen to an agent and see which fix it picks.
- Connect `next-devtools-mcp` and ask the agent to *"list the routes in the project"*.

## Going deeper

- **Official docs:** "How Next.js supports AI coding agents"; the bundled documentation, the error guides, MCP, the skills and agent feedback.[^1]
- **Article:** Vercel's "AGENTS.md outperforms skills in our agent evals"; how the evaluation was set up and why the skills fell behind.[^5]
- **Official docs:** the AI announcements for Next.js 16.2 and 16.3; which release brought which of these tools, and why.[^2][^3]

## Sources

1. [Next.js: AI Coding Agents](https://nextjs.org/docs/app/guides/ai-agents) *(doc)* — The bundled documentation, the `AGENTS.md` block, `.md` and `llms.txt`, tagged error fixes, runtime visibility and the Next.js skills.
2. [Next.js Blog: Next.js 16.2, AI Improvements](https://nextjs.org/blog/next-16-2-ai) *(doc)* — March 18, 2026. The bundled documentation and the first tools for agents to use the browser.
3. [Next.js Blog: Next.js 16.3, AI Improvements](https://nextjs.org/blog/next-16-3-ai-improvements) *(doc)* — June 26, 2026. The documentation through `AGENTS.md`, the first Next.js skills, the Agent Browser and the focused MCP server.
4. [Next.js: agentRules](https://nextjs.org/docs/app/api-reference/config/next-config-js/agentRules) *(doc)* — The managed instruction block, turning it off, and the version history.
5. [Vercel: AGENTS.md outperforms skills in our agent evals](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) *(article)* — January 2026. A documentation index in `AGENTS.md` at 100%, skills at 79% at best, and the skill not being called in 56% of the cases.
6. [Next.js: Next.js MCP Server](https://nextjs.org/docs/app/guides/mcp) *(doc)* — `/_next/mcp`, `next-devtools-mcp` and the runtime tools.
7. [Next.js: skills](https://github.com/vercel/next.js/tree/canary/skills) *(repo)* — The source of the Next.js team's skills.
8. [Next.js: Upgrade with a coding agent](https://nextjs.org/docs/app/guides/upgrading/agent-upgrade) *(doc)* — `next upgrade --agent` and the upgrade policies.
