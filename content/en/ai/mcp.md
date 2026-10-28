---
title: "MCP"
description: "What is MCP? Connecting servers like Figma, Playwright and Next.js DevTools to an agent."
lastVerified: "2026-10-14"
translationKey: "ai/mcp"
---

MCP (the Model Context Protocol) is an open standard for connecting AI applications to outside systems.[^1] Once you connect a server, the agent calls that system's tools itself: it reads the design from Figma, drives the browser, pulls errors from the running dev server. It is no longer limited to what you paste into the chat.

When should you connect one? The [!claudeCode] docs give a simple test: if you keep copying data from a tool into the chat (an issue tracker, a monitoring dashboard), connect that tool.[^2]

|  | [Skill](/academy/ai/skills) | MCP |
| --- | --- | --- |
| What does it give you? | Instructions on how to do a job | Tool access to a system the agent cannot reach |
| Frontend example | *"The steps for adding a new component"* | *"Read the Figma frame"*, *"get the errors from the dev server"* |
| Context cost | The description is in the context, the body loads when needed | Tool definitions; [!claudeCode] defers them until they are needed.[^2] |

## How do you connect a server?

In [!claudeCode], a remote server is added with a URL and a local one with a command (everything after `--` is the server's command):[^2]

```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
claude mcp add --transport stdio playwright -- npx @playwright/mcp@latest
```

In [!cursor] the same thing is done with a `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (all projects) file:[^3]

```json
{
  "mcpServers": {
    "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] },
    "figma": { "url": "https://mcp.figma.com/mcp" }
  }
}
```

- **Share it with the team:** in [!claudeCode], a server added with `--scope project` writes `.mcp.json` into the project root; commit it. [!claudeCode] asks you to approve servers that come from the project before it uses them.[^2]
- **Manage them:** in [!claudeCode], `/mcp` shows the servers' status, and OAuth sign-in happens there too.[^2] In [!cursor] you turn a server on and off from the Customize page, and you look at *"MCP Logs"* to debug it.[^3]

## Three frontend servers

### Figma

The route Figma recommends is the remote server.[^4] The easiest setup is the plugin, which brings the MCP settings and ready-made skills together: `claude plugin install figma@claude-plugins-official` in [!claudeCode], `/add-plugin figma` in [!cursor]. The first time you use it, you sign in with OAuth.[^4] Only clients in Figma's MCP catalogue can connect to the Figma MCP ([!claudeCode], [!cursor] and [!vscode] are on the list).[^4]

- On the remote server the design is passed as a **link**: copy the frame's or layer's link in Figma and paste it to the agent. Working from the current selection exists only on the desktop server.[^4][^5]
- The output comes as React and Tailwind by default. You can change that with a prompt: *"Build this frame with the components in `src/components/ui`, use Tailwind."*[^5]
- `get_variable_defs` gives you the colour, spacing and typography variables in the design. For very large frames, `get_metadata` produces a plain summary first and the agent then calls `get_design_context` piece by piece.[^5]
- If you set up Code Connect, the agent uses the real components in your codebase instead of writing a component from scratch.[^5]

### Playwright

Microsoft's [!playwright] server hands the browser to the agent. It works with the page's accessibility tree (a snapshot) rather than screenshots, so there is no need for a vision model.[^6] The agent performs actions using the references in the snapshot; it cannot act by looking at a screenshot.[^6]

- A frontend scenario: *"Open the dev server at 375 px wide, fill in the cart form, and check whether there are errors in the console."* There are `browser_resize`, `browser_fill_form` and `browser_console_messages` tools for that.[^6] There is also `browser_emulate_media` for cases like dark mode.[^6]
- By default the browser profile is persistent and the sites you signed in to are remembered. `--isolated` keeps the profile in memory only.[^6]

### Next.js DevTools

In Next.js 16 and later, the dev server opens its own MCP endpoint at `/_next/mcp` (on by default). The `next-devtools-mcp` package connects to that endpoint.[^7] The configuration:[^7]

```json
{
  "mcpServers": {
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    }
  }
}
```

- `get_errors` gives you build, runtime and hydration errors with a source-mapped stack. For example, when you say *"fix the errors on the page"* the agent reads the error itself.[^7]
- `get_routes` gives the routes, and `get_compilation_issues` and `compile_route` give the build problems. While editing, the agent can check with the dev server instead of running `next build`.[^7]
- Some tools, like `get_page_metadata`, need the page to be open in the browser.[^7]
- Next.js skills such as `next-dev-loop` call `/_next/mcp` directly, so you don't need to set up MCP separately for those.[^7]

> [!TIP]
>
> **MCP, or a skill/CLI?** Even [!playwright]'s own README recommends a CLI and skill combination for coding agents: it is cheaper because it does not load tool schemas and long snapshots into the context. MCP makes sense for exploration loops that need persistent state and rich inspection.[^6] A practical rule: if the agent can use a CLI it already knows (`gh`, `playwright`), try that; connect MCP for systems that need credentials and structured data (Figma, a running dev server).

> [!WARNING]
>
> **Every server is a trust decision.** [Simon Willison](https://simonwillison.net)'s *"lethal trifecta"*: if an agent can at the same time (1) reach your private data, (2) see untrusted content and (3) communicate with the outside, an attacker can talk it into leaking data. Because MCP makes it easy to mix tools from different sources, it is very easy to assemble that trifecta by accident.[^8] Guardrail products cannot block it 100%; the only safe route is not to assemble the trifecta.[^8]

- Letting [!playwright] browse arbitrary sites with a signed-in persistent profile comes close to that trifecta. Keep the browsing to `localhost`, and use `--isolated` where you need to. The README says `--allowed-origins` is not a security boundary.[^6]
- Install only from sources you trust. Give a server the narrowest permission possible. The [!claudeCode] docs give the example of handing a database server a read-only user.[^2][^3]
- Don't approve tools by reflex. [!cursor] asks for approval for every MCP tool by default.[^3]
- Turn off a server you don't use: every connected server adds tools.[^2][^3]

## Try it yourself

1. Connect `next-devtools-mcp` in your Next.js project, run the dev server and add a deliberate hydration error to a page. Tell the agent *"fix the errors on the page"*.
2. Install the Figma plugin, give it the link to a component frame and say *"build it with the components in `src/components/ui`"*. Then ask for the same job without the link, describing it instead, and compare the difference.
3. Have the [!playwright] server open your application on a narrow screen and fill in the form. Then look at which servers you actually use through `/mcp` ([!claudeCode]) or Customize ([!cursor]) and turn off the ones you don't.

## Sources

1. [Model Context Protocol: What is MCP?](https://modelcontextprotocol.io/docs/getting-started/intro) *(doc)* — The definition of MCP and its ecosystem.
2. [Claude Code: Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp) *(doc)* — The commands for adding a server, scopes, `.mcp.json`, approval and deferred tools.
3. [Cursor: Model Context Protocol (MCP)](https://cursor.com/docs/mcp) *(doc)* — The `mcp.json` configuration, tool approval and security notes.
4. [Figma: Set up the remote server](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/) *(doc)* — Remote server setup, the plugin and OAuth sign-in.
5. [Figma: Tools and prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/) *(doc)* — The design-to-code tools, variables and Code Connect.
6. [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) *(repo)* — The accessibility snapshot, the tools, the profile modes and the comparison with the CLI.
7. [Next.js: Connecting coding agents to the Next.js MCP server](https://nextjs.org/docs/app/guides/mcp) *(doc)* — The `/_next/mcp` endpoint and the `next-devtools-mcp` tools.
8. [Simon Willison: The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) *(article)* — The trifecta of private data, untrusted content and external communication. June 2025.
