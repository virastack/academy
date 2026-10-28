---
title: "Skills"
description: "Turning repeated work into a skill and using ready-made frontend skills."
lastVerified: "2026-10-14"
translationKey: "ai/skills"
---

If you are pasting the same instruction into a chat for the third time, that job wants to be a skill. The [!claudeCode] docs recommend skills for exactly these situations: when you keep pasting the same instruction, checklist or multi-step procedure, or when a section of your `CLAUDE.md` has stopped being a fact and turned into a procedure.[^1]

## What is a skill?

A skill is a folder with a `SKILL.md` file in it. The file has `name` and `description` at the top and the instructions the agent will follow below. If you want, you put scripts and reference files next to it. The format is an open standard (Agent Skills) and works in more than one tool.[^1]

What makes it different from a rule file is when it loads: `AGENTS.md` is in the context in every session, while only a skill's description stays in the context and its body loads when the skill is used.[^1] Long reference material costs almost nothing until it is used.

|  | Rule file (`AGENTS.md`) | Skill |
| --- | --- | --- |
| What does it contain? | Facts that hold for every job | The procedure to follow for a particular job |
| When does it load? | Every session | When it is needed |
| Frontend example | *"The package manager is `pnpm`, the test command is `pnpm test:run`"* | *"The steps for adding a new component"*, *"the pre-PR checklist"* |

## Turn repeated work into a skill

Instead of writing one from scratch, have the job done once the normal way first. That is the method Anthropic suggests: finish the task with the agent using an ordinary request, pay attention to the context you give it along the way (your preferences, your rules, the steps you follow), then tell the same agent *"turn the context I gave you for this job into a skill"*. Try the resulting skill on real work in a new conversation, note where the agent gets stuck and fix the skill.[^2]

A frontend skill, as an example (`.claude/skills/new-component/SKILL.md`):

```markdown
---
name: new-component
description: Adds a new React component to the project. Use when the user says "new component" or "add a component", or when a new file is needed under src/components.
---

1. Create the folder `src/components/<Name>/`: `<Name>.tsx`, `<Name>.test.tsx`, `index.ts`.
2. Take `src/components/Button/` as the example and follow the same structure.
3. Write the props as an `interface` and use a named export.
4. Add at least one render test and one interaction test to the test file.
5. Run `pnpm lint && pnpm tsc --noEmit && pnpm test:run`. The job is not done until they all pass.
```

Five rules for a good skill:

- **Only write what the agent does not know.** The AI already knows React; write what is specific to your project. For every paragraph, ask *"is this worth its token cost?"* Keep `SKILL.md` under 500 lines and split anything beyond that into separate files linked directly from `SKILL.md`.[^2]
- **Put both "what it does" and "when" in the description.** The agent picks a skill by looking at nothing but the `description`. Something vague like *"handles documents"* does not work. Write the text in the third person (*"adds"*), not *"I can add"*.[^2] [!claudeCode] shows at most 1,536 characters of the `description` in the list, so put the important use case first.[^1]
- **Match the strictness to the job.** For context-dependent work like a code review, general guidance is enough. For fragile work like a database migration, write the exact command and say *"do not change it"*. Don't list options; give a single default (*"use Vitest; Playwright if you need E2E"*).[^2]
- **Add a verification loop.** The pattern *"verify, fix any failures, verify again"* improves the quality of the output. In frontend work that means the linter, the type check and the tests.[^2]
- **Don't write date-dependent information.** Instead of *"use the old approach before this date"*, write the current approach and put the old one in a separate "legacy patterns" section.[^2]

> [!TIP]
>
> **Choose who triggers it.** By default both you, by typing `/skill-name`, and the agent, when it looks appropriate, can run the skill. For jobs with side effects like `deploy` and `commit`, write `disable-model-invocation: true` so only you can trigger it. For background knowledge only the agent needs, use `user-invocable: false`.[^1] To make a skill stand out only while certain files are in play, you can write `paths: "**/*.tsx"`.[^1][^3]

## Where does it go?

| Tool | Project | Personal |
| --- | --- | --- |
| [!claudeCode] | `.claude/skills/<name>/SKILL.md` | `~/.claude/skills/<name>/SKILL.md` |
| [!cursor] | `.cursor/skills/` or `.agents/skills/` | `~/.cursor/skills/` or `~/.agents/skills/` |

[!cursor] reads the `.claude/skills/` folder too, so if you use both tools, putting the skill under `.claude/skills/` is enough.[^3] Commit a project skill and the team gets it too.[^1] In [!cursor], the `name` field has to match the folder name (lowercase, digits, hyphens).[^3] The custom commands you used to write into `.claude/commands/` are now the same thing as a skill.[^1] You don't have to build the skeleton by hand: [!cursor] has `/create-skill` and [!claudeCode] has the `skill-creator` plugin.[^1][^3]

> [!WARNING]
>
> A skill is an instruction, not a guarantee. When a conversation is summarized, [!claudeCode] restores only the first 5,000 tokens of each skill.[^1] Put the most important instructions at the top of the skill, and put a rule that absolutely has to hold into a hook or CI.[^1]

## Ready-made frontend skills

Why would you need one? Anthropic's frontend post names the problem: without instructions, the model falls back on the safe choices in the middle of its training data (the Inter typeface, a purple gradient on white, little animation). If you write that into the system prompt, every conversation carries design instructions, even for unrelated work. A skill, on the other hand, loads only for interface work.[^4]

[Emil Kowalski](https://emilkowal.ski) solves the same problem on the animation side: agents don't know what "feels good", so he writes a skill file for every aspect of the interface.[^5] His method works for your own skill too: instead of *"make a nice animation"*, write decision rules. For example, an element that enters uses `ease-out`, UI animations stay under 300 ms, an element starts from `scale(0.95)` rather than `scale(0)`. Write the reason for every rule and turn the decision points into a table or a flow chart so the agent does not have to guess.[^5]

| Skill | What it does |
| --- | --- |
| [**Anthropic frontend-design**](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design) | About 400 tokens of guidance covering typography, colour, motion and background, which suppresses the generic "AI aesthetic".[^4] |
| [**emilkowalski/skills**](https://github.com/emilkowalski/skills) | Animation and interface polish (`emil-design-eng`, `review-animations`, `animation-performance`). `break-ui` tries to break the interface with worst-case data (a very long name, an empty list). `pick-ui-library` makes the agent choose a trusted library instead of hand-writing a toast component.[^6] Install: `npx skills@latest add emilkowalski/skills` |
| [**jakubkrehel/skills**](https://github.com/jakubkrehel/skills) | `better-ui` (nested corner radii, optical alignment, hit areas, animation), `better-typography`, `better-colors`, `better-accessibility`, `better-layout`. `interface-review` reviews your changes against those headings.[^7] Install: `npx skills add jakubkrehel/skills` |
| [**vercel-labs/agent-skills**](https://github.com/vercel-labs/agent-skills) | `react-best-practices`: more than 40 rules for React and Next.js performance, ordered by impact (async waterfalls and bundle size first, micro-optimizations last). Every rule has a wrong and a right code example.[^8] The same repository's `web-design-guidelines` lets you [audit an interface](https://github.com/vercel-labs/agent-skills) against more than 100 accessibility, performance and UX rules. |
| [**mattpocock/skills**](https://github.com/mattpocock/skills) | Built around four agent failures: doing what you did not ask for, talking at needless length, code that does not work, and architecture that falls apart. `grill-me` interrogates you until every branch of the plan is clear, `tdd` moves through the red-green-refactor cycle, and `code-review` reviews the diff against both the project standards and the spec with separate agents.[^9] |

The `npx skills add` command installs into [!claudeCode], [!cursor] and other tools.[^8] [Matt Pocock](https://www.mattpocock.com) argues that skills should be small, adaptable and composable — that is, he wants you to make them your own rather than adopt large frameworks that take over the process.[^9]

> [!TIP]
>
> Don't install all of them. Every skill's description sits in the context in every conversation. With too many skills, [!claudeCode] truncates some descriptions, and `/skill-doctor` shows you the skills you never use.[^1]

**Is the skill working?** Don't decide from a single attempt. According to Anthropic, first see where the agent gets stuck without the skill, and write only enough skill to close that gap.[^2] Then run the same request in a new conversation with and without the skill and compare.[^1] The `skill-creator` plugin in [!claudeCode] automates that comparison.[^1]

## Try it yourself

1. Pick a job you explained to the agent the same way three times in the last week (adding a new component, say). Have it done with an ordinary request, and when it is finished say *"turn the context I gave you for this job into a skill"*.
2. Shorten the resulting `SKILL.md`: delete everything [!claude] already knows, and add the "when" sentence to the `description`.
3. In a new conversation, ask for the same job with and without the skill, and compare how many rounds of correction each took.
4. Install a ready-made skill (`react-best-practices`, for example). Read its `SKILL.md` before installing, then have it *"review this component for performance"*.

## Sources

1. [Claude Code: Extend Claude with skills](https://code.claude.com/docs/en/skills) *(doc)* — When to write a skill, the `SKILL.md` fields, locations, triggering control and the description budget.
2. [Anthropic: Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) *(doc)* — Brevity, writing the `description`, how strict to be, the verification loop and evaluation.
3. [Cursor: Agent Skills](https://cursor.com/docs/skills) *(doc)* — The skill folders in Cursor, the `paths` field and `/create-skill`.
4. [Anthropic: Improving frontend design through Skills](https://claude.com/blog/improving-frontend-design-through-skills) *(article)* — Why interfaces come out generic, and the frontend-design guidance. November 12, 2025.
5. [Emil Kowalski: Agents with Taste](https://emilkowal.ski/ui/agents-with-taste) *(article)* — A method for turning interface taste into rules: the reason, decision tables, strict rules.
6. [emilkowalski/skills](https://github.com/emilkowalski/skills) *(repo)* — Skills for animation, interface polish and library choice. MIT.
7. [jakubkrehel/skills](https://github.com/jakubkrehel/skills) *(repo)* — Skills for interface, typography, colour, accessibility and layout. MIT.
8. [Vercel: Introducing React Best Practices](https://vercel.com/blog/introducing-react-best-practices) *(article)* — More than 40 React performance rules, ordered by impact. Shu Ding and Andrew Qu, January 14, 2026.
9. [mattpocock/skills](https://github.com/mattpocock/skills) *(repo)* — Small, composable engineering skills: `grill-me`, `tdd`, `code-review`. MIT.
