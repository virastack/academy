# ViraStack Academy

Markdown curriculum for [virastack.com](https://virastack.com) Academy.

- `content/tr/curriculum.json` — track and lesson tree
- `content/tr/**/*.md` — Turkish lesson bodies
- `CONTENT.md` — authoring syntax

English copies are not maintained yet. Do not add files under `content/en`.

The website clones this repository at build time. Pushing to `main` triggers a
site redeploy via the `deploy-site` workflow (requires the `VERCEL_DEPLOY_HOOK`
repository secret).
