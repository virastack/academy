---
title: "Secret and dependency security"
description: "Keeping keys away from the client, .env and npm supply chain attacks."
lastVerified: "2026-10-22"
translationKey: "auth-security/secrets-and-dependencies"
---

An application can be taken over two ways even when there is no mistake in your own code. Either a key leaks, or a package you installed carries malicious code. This lesson covers the most common forms of both and the simple measures against them.

> [!NOTE]
>
> The `.env` files, the `NEXT_PUBLIC_` prefix and validating at startup were covered in the [Environment variables](/academy/production/environment-variables) lesson. Only the security side is here.

## Where secrets leak from

**1. The client bundle.** Every variable with the `NEXT_PUBLIC_` prefix is written into the JavaScript bundle at build time and anyone can read it.[^1] Add `import "server-only"` at the top of the module that reads a secret; if a Client Component imports it, the build fails.[^1]

**2. Props.** Every value passed from a Server Component to a Client Component goes to the browser. If you pass the user object coming from the database as it is, fields such as the password hash or the email address go too. This is why Next.js recommends returning small objects *(DTOs)* carrying only the fields needed:[^1]

```ts
// lib/users.ts
import "server-only";

export async function getProfileDTO(id: string) {
  const user = await db.user.findUnique({ where: { id } });

  return { name: user.name, avatarUrl: user.avatarUrl };
}
```

**3. The git history.** Deleting the file containing the key is not enough; it stays in the old commits. OWASP gives this order for a leaked key: **revoke** it first, then **produce a new one**, and **clean the records** last.[^2] Rewriting the history does not fix the other copies; revoking the key is the only certain fix.

> [!TIP]
>
> GitHub's **push protection** feature catches known key formats during a push and refuses it. On personal accounts it is on by default for pushes to public repositories. It has to be turned on separately at the repository level.[^3]

## The supply chain

Installing a package means trusting its authors and the authors of its dependencies. [Liran Tal](https://lirantal.com/) reminds you that with an average npm package you trust dozens of maintainers.[^4] If an attacker takes over one of those maintainers' accounts, the malicious code reaches your computer and your CI.

In September 2025 a worm called **Shai-Hulud** took over more than 500 npm packages. According to CISA's alert, when a package was installed it collected the GitHub tokens and cloud keys on the computer. It then added itself to the developer's other packages with their npm account and published them.[^5]

Most attacks come through three doors:[^4][^6]

| Attack | How it works |
| :-- | :-- |
| A compromised package | Malicious code is added to a new version of a popular package |
| Typosquatting | A fake package with a similar name, such as `crossenv` instead of `cross-env` |
| Slopsquatting | A fake package published in advance under a name an AI made up |

## Tightening the installation

### Install with the lockfile

The lockfile pins which version is installed. In CI, use `npm ci` instead of `npm install`: if the lockfile and `package.json` disagree, the installation stops and no new version arrives silently.[^6]

### Approve the install scripts

Attacks such as Shai-Hulud run their code in a `postinstall` script. [!npm] npm 12 no longer runs the dependencies' install scripts by default; [!pnpm] pnpm has done that since v10.[^7][^8]

```command
npm install esbuild
```

```text
npm warn install-scripts 1 package had install scripts blocked because they are not covered by allowScripts:
npm warn install-scripts   esbuild@0.25.0 (postinstall: node install.js)
```

If you recognise the package, you approve it with `npm install-scripts approve esbuild`. The approval is written into the `allowScripts` field in `package.json`, along with its version.[^7] In a test, once `esbuild` was upgraded to `0.25.1` the approval was asked for again.

### Don't install a new version immediately

A compromised version is usually noticed by the community and removed. Waiting a few days for a new version is a cheap measure that buys you that time.[^4]

```ini
# .npmrc
min-release-age=7
```

Since npm 11.10 this setting leaves the versions published in the last 7 days out of the installation.[^7] In a test, because `next@16.4.2` had been published 6 days earlier it was not installed, and `16.4.1` came instead. In pnpm, `minimumReleaseAge` does the same job.[^8]

> [!WARNING]
>
> The waiting period delays security patches too. npm warns you if `npm audit fix` cannot install a patch because of the wait; you can add that package to the `min-release-age-exclude` list.[^7]

### Leave the updates to a bot

Dependabot or Renovate opens the updates as pull requests. No version enters the main branch before the tests pass. Dependabot's `cooldown` setting also holds new versions back for a few days; security updates are not caught by that wait.[^9]

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    cooldown:
      default-days: 7
```

### Scan for known vulnerabilities

`npm audit` tells you whether there is a known vulnerability in your dependencies. But it only finds the **known** ones; it does not catch a malicious version published just now.[^6]

> [!DO]
>
> - Before installing a package an AI suggested, check with `npm view <package>` that it exists, and look at its download count and its repository.[^6]
> - Use phishing-resistant two-step verification *(a passkey or a security key)* on your npm and GitHub accounts.[^5]
> - If you publish packages, use **trusted publishing** instead of a long-lived token.[^6]

## Try it yourself

- Run `npm install --min-release-age=7` in a project and look at which versions arrived with `npm ls`.
- Write a fake key into `.env.local` and commit it by accident. Then delete the file and see with `git log -p` that the key is still there in the history.
- Read the `allowScripts` field in `package.json`. Research why each of those packages runs an install script.

## Going deeper

- **Official docs:** the OWASP NPM Security Cheat Sheet; the lockfile, the install scripts, typosquatting and trusted publishing.[^6]
- **Talk:** Liran Tal, "Security Controls in the JavaScript Supply Chain" *(JSNation 2022, 28 min)*; code hidden in a lockfile, the install scripts and delayed updates.[^4]
- **Official docs:** CISA's Shai-Hulud alert; how a real attack spread and the recommended steps.[^5]

## Sources

1. [Next.js: How to think about data security](https://nextjs.org/docs/app/guides/data-security) *(doc)* — Returning DTOs, `server-only`, `NEXT_PUBLIC_` variables going to the client, and the taint APIs.
2. [OWASP: Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) *(doc)* — The revoke, rotate and delete order on a leak, and the consequences of rewriting the git history.
3. [GitHub Docs: About push protection](https://docs.github.com/en/code-security/concepts/secret-security/about-push-protection) *(doc)* — Blocking a key during a push, and the defaults at the user and repository level.
4. [Liran Tal](https://lirantal.com/): [Security Controls in the JavaScript Supply Chain](https://gitnation.com/contents/security-controls-in-the-javascript-supply-chain) *(video)* — JSNation 2022. The trust placed in dependencies, code hidden in a lockfile, the install scripts and delaying updates.
5. [CISA: Widespread Supply Chain Compromise Impacting npm Ecosystem](https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem) *(doc)* — September 23, 2025. Shai-Hulud taking over more than 500 packages, the keys it collected, how it spread, and the recommendations.
6. [OWASP: NPM Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html) *(doc)* — `npm ci`, the install scripts, vulnerability scanning, typosquatting, slopsquatting and trusted publishing.
7. [npm CLI: Changelog](https://github.com/npm/cli/blob/latest/CHANGELOG.md) *(repo)* — `min-release-age` in 11.10.0, install scripts blocked by default in 12.0.0, and `npm install-scripts approve`.
8. [pnpm: Settings](https://pnpm.io/settings) *(doc)* — `minimumReleaseAge` and the settings for allowing install scripts.
9. [GitHub Docs: Dependabot options reference](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference) *(doc)* — The `cooldown` setting, and security updates not being caught by that wait.
