---
title: "Pre-release checklist"
description: "What to look at before going live, and the release-day plan."
lastVerified: "2026-10-22"
translationKey: "production/pre-release-checklist"
---

## Why a list?

Release day is a stressful day, and under stress the most obvious step is the one you forget. Pilots read the checklist before every take-off, even on a plane they have flown thousands of times. A list does not give you knowledge; it stops you **forgetting**.

This lesson is a checklist. Every item rests on a lesson in this guide or on [!nextjs]'s own production checklist.[^1] Copy the list into your repository as a pull request template or a `RELEASE.md`, and adjust it for your project.

## Code and build

- [ ] `next build` finishes without errors locally and in CI. The Next.js documentation recommends taking a build locally before a release and trying it with `next start` in an environment close to production.[^1]
- [ ] Lint and type checking are required in CI; merging into `main` depends on those checks passing *(see [CI/CD](/academy/production/cicd))*.
- [ ] The end-to-end tests run against a production build *(see [Playwright](/academy/playwright))*.
- [ ] The dependencies are installed from the lock file *(`npm ci`)*; the critical vulnerabilities in the `npm audit` output have been reviewed.
- [ ] The route table in the build output is as expected: the pages that should be static are `○`, and the request-dependent ones `ƒ` or `◐`.

## Configuration

- [ ] All the environment variables are validated at startup; a missing value stops the server as it starts *(see [Environment variables](/academy/production/environment-variables))*.
- [ ] The `.env*` files are in `.gitignore`; only `.env.example` is in the repository.[^1]
- [ ] No variable starting with `NEXT_PUBLIC_` carries a secret.
- [ ] The production environment's keys are separate from the preview environment's.
- [ ] If more than one server is going to run, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` and `deploymentId` are set *(see [Deployment options](/academy/production/deployment-options))*.

## Security

- [ ] Every Server Action and Route Handler does its own identity and authorisation check. The Next.js documentation says not to rely on the proxy or on a page-level check alone *(see [Authorisation and roles](/academy/auth-security/authorization-and-roles))*.[^1]
- [ ] The basic security headers are sent and `X-Powered-By` is off:

```ts
// next.config.ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
```

| Header | What it does |
| :-- | :-- |
| `X-Content-Type-Options: nosniff` | Stops the browser guessing the content type; this is its only valid value[^2] |
| `X-Frame-Options: DENY` | Stops the site being opened inside an `iframe` on another site *(clickjacking)*. The Next.js documentation notes that CSP's `frame-ancestors` directive has taken its place[^2] |
| `Referrer-Policy` | Decides how much address information is sent when moving to another site[^2] |
| `Permissions-Policy` | Turns browser APIs such as the camera and microphone off[^2] |
| `X-Powered-By` | Next.js adds it by default; there is no benefit in announcing what the server uses[^3] |

- [ ] If the site is served over HTTPS only, the `Strict-Transport-Security` header is added. This header tells the browser to open the site over HTTPS only from now on; do not add it before you have fully moved to HTTPS.[^2]
- [ ] A Content Security Policy has been considered. The Next.js documentation recommends CSP against XSS, clickjacking and code injection; because its setup needs a nonce, it is a separate piece of work.[^1][^4]
- [ ] The Docker image runs as a non-root user and holds no secret.

> [!TIP]
>
> Test the headers. In this guide's project a Playwright test reads the headers with `request.get("/login")` and confirms that `x-powered-by` is absent. If a configuration change silently removes the headers, the test fails.

## Errors and logs

- [ ] `app/error.tsx` and `app/global-error.tsx` exist. Next.js's checklist recommends an accessible error screen for the whole application.[^1]
- [ ] There is a custom 404 page *(`not-found.tsx`)*.
- [ ] The server errors go to a service or to the logs through `onRequestError`; the error code shown to the user can be searched in the logs *(see [Error monitoring](/academy/production/error-monitoring))*.
- [ ] The source maps are uploaded to the error monitoring service.
- [ ] The error monitoring pipeline has really been tried: an error was thrown on purpose and the record reached the service.
- [ ] The logs are JSON, written to `stdout`, and every line carries the version and the environment *(see [Logging](/academy/production/logging))*.
- [ ] Passwords, tokens, cookies and card details are not written into the logs; `redact` is configured.
- [ ] The alerts are defined and every one of them is actionable.

## Performance and accessibility

- [ ] Lighthouse was run in an incognito window. The Next.js documentation reminds you that this is a simulation and has to be read together with real user data *(Core Web Vitals)*.[^1]
- [ ] Core Web Vitals are being measured; `useReportWebVitals` or the platform's analytics tool.
- [ ] The bundle size has been reviewed; there is no unexpectedly large dependency.
- [ ] The images go through `next/image` and the fonts through `next/font`.
- [ ] An accessibility scan and a keyboard test have been done *(see [Accessibility and visual tests](/academy/playwright/accessibility-and-visual-tests))*.

## SEO and sharing

- [ ] Every page has a title and a description; the social sharing image is defined *(see [Metadata and SEO](/academy/nextjs/metadata-and-seo))*.
- [ ] `robots.txt` and the sitemap point at the live address; the preview environment is closed to search engines.
- [ ] The error monitoring and test pages *(such as `/debug`)* are off in production.

## Operations

- [ ] There is a health check endpoint and it returns the version information.
- [ ] The server shuts down cleanly on `SIGTERM`; the platform's grace period is 10-30 seconds.[^5]
- [ ] Streaming is not buffered by the reverse proxy or the load balancer in between.[^5]
- [ ] The **rollback plan** is written down: how do you return to the previous version, who decides, how long does it take? A plan is not a plan until it has been tried.
- [ ] The risky features are behind a flag and can be turned off *(see [Feature flags and release strategy](/academy/production/feature-flags-and-release-strategy))*.
- [ ] The database changes can work with the old and the new version at the same time.
- [ ] The domain, the TLS certificate and the redirects *(from `www` to the root or the other way round)* are ready.

## Release day

1. Release at an hour when the team is working; not on a Friday evening.
2. After the deploy, confirm with the health endpoint that the right version is running.
3. Try the critical flows by hand once: signing in, the main operation, payment.
4. Watch the error monitoring dashboard and the error rate for the first hour. If a new kind of error appears, make the rollback decision early.
5. Open the risky features gradually with a flag.

## After the release

- Note which item was skipped, or which problem was not on the list, and update the list. The list is a living document.
- Open a work item for deleting the release flags that have done their job.
- If something went wrong, write a review without looking for someone to blame: what happened, how was it noticed, why did it happen, and what is changing so it does not happen again?

## Try it yourself

- Copy this list into your project's `.github/pull_request_template.md` and delete the items that do not apply.
- Look at your live site's headers with `curl -I`. Which security headers are missing?
- Write your rollback plan and try it in a preview environment. How long did it take?

## Going deeper

- **Official docs:** Next.js, "Production Checklist"; the automatic optimisations and what to look at before a release.[^1]
- **Official docs:** Next.js, "headers"; the security headers and example values.[^2]
- **Official docs:** Next.js, "Self-Hosting"; shutdown, streaming and more than one server on your own machine.[^5]

## Sources

1. [Next.js: Production Checklist](https://nextjs.org/docs/app/guides/production-checklist) *(doc)* — What to look at during development and before a release: the error screens, Server Action security, the environment variables, CSP, Lighthouse and bundle analysis.
2. [Next.js: headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers) *(doc)* — The `headers()` configuration and the security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`.
3. [Next.js: poweredByHeader](https://nextjs.org/docs/app/api-reference/config/next-config-js/poweredByHeader) *(doc)* — Turning the `X-Powered-By` header off.
4. [Next.js: Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy) *(doc)* — Setting CSP up with a nonce.
5. [Next.js: Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting) *(doc)* — Shutdown and the grace period, streaming and the reverse proxy.
