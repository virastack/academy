# ViraStack Academy

Markdown curriculum for [virastack.com](https://virastack.com) Academy.

- `content/<locale>/curriculum.json` — track and lesson tree for that locale
- `content/tr/**/*.md` — Turkish lesson bodies
- `content/en/**/*.md` — English lesson files (same `translationKey` as Turkish)
- `CONTENT.md` — authoring syntax

The website clones this repository at build time. Pushing to `main` triggers a
site redeploy via the `deploy-site` workflow (requires the `VERCEL_DEPLOY_HOOK`
repository secret).
