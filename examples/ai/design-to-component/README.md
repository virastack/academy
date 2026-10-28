# From design to component

A project that turns a Figma card design into a working, tested React component with an agent, a skill and MCP. The walkthrough is in the guide; this folder holds only the files.

- `starter/`: start here. An empty Vite + React + Tailwind project, the sample profile data, placeholder images, the bundled tests and a `CLAUDE.md`.
- `solution/`: an example solution. It differs from your own result and only shows what a card that passes the tests can look like.

```bash
cd starter
npm install
npx playwright install chromium
npm test        # 3 tests are red at the start: there is no card
```

The design: [Modern Profile Card UI](https://www.figma.com/community/file/1625904675991451970/modern-profile-card-ui-free-figma-template), [@saifullah_nakih](https://www.figma.com/@saifullah_nakih), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
