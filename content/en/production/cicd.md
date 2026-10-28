---
title: "CI/CD (GitHub Actions)"
description: "A deploy pipeline with lint, test and Docker jobs, secrets and environments."
lastVerified: "2026-10-22"
translationKey: "production/cicd"
---

## Three ideas

**Continuous integration (CI)**: everyone on the team merges their change into the shared code at least once a day, and every merge is verified by an automated build and test. While describing this practice, [Martin Fowler](https://martinfowler.com/) stresses keeping the build fast: if the feedback takes more than ten minutes, people stop waiting for it.[^1]

**Continuous delivery**: the software is in a state where it can be released at any moment. Going live is a business decision, not a technical adventure.[^2]

**Continuous deployment**: every change that passes the pipeline goes live automatically, with no human approval. Fowler defines continuous deployment as one step beyond continuous delivery; you do not have to release every change to do continuous delivery.[^2]

| | Automated tests | Releasable at any time | Automatic release |
| :-- | :-- | :-- | :-- |
| Continuous integration | Yes | Not required | No |
| Continuous delivery | Yes | Yes | No, with one approval |
| Continuous deployment | Yes | Yes | Yes |

## The deployment pipeline

The **deployment pipeline** Fowler describes splits the build into stages. The first stage is fast *(compiling, linting, unit tests)* and reports back to the developer within minutes. The later stages are slower but more thorough *(end-to-end tests, a check in a production-like environment)*. If a stage fails, the following ones do not run.[^3]

The pipeline in this guide's project:

```text
quality (lint, typecheck) ─────┐
                               ├──> docker (build the image, smoke test) ──> deploy
e2e (Playwright tests) ────────┘
```

`quality` and `e2e` run in parallel. If both pass, `docker` builds the image and tries whether it really starts. Deploy is the last stage.

## The workflow

[!github] Actions workflows are YAML files in the `.github/workflows/` folder:

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
```

The `typecheck` script is `next typegen && tsc --noEmit`. `next typegen` produces the page and route types; `tsc` then checks the whole project along with them *(see [tsconfig and strict mode](/academy/typescript/tsconfig-and-strict-mode))*. The editor and commit-stage equivalents of the same checks are in the [Code quality and team standards](/academy/architecture/code-quality) lesson.

> [!NOTE]
>
> As this guide was written, the current major version of `actions/checkout` and `actions/setup-node` is v7, and of `actions/cache` v6. The examples in some documents still show the older versions. Look at the action's releases page before copying a version.

## End-to-end tests and the cache

```yaml
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - name: Restore Next.js build cache
        uses: actions/cache@v6
        with:
          path: .next/cache
          key: ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-${{ hashFiles('app/**', 'components/**', 'lib/**') }}
          restore-keys: |
            ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-
      - run: npx playwright install --with-deps chromium
      - run: npm test
```

There are two different caches:

- `setup-node`'s `cache: npm` setting stores the packages npm downloads.
- `actions/cache` stores Next.js's `.next/cache` folder. The Next.js documentation recommends preserving this folder in CI; without it every build starts from scratch and Next.js may show a "No Cache Detected" error.[^4] The key is made of the package lock and a hash of the source files. When the source changes, no exact match is found and `restore-keys` restores the closest older cache.

The Playwright side's details *(uploading the report, the worker count, sharding)* are in the [Running in CI](/academy/playwright/running-in-ci) lesson.

## Trying the image

```yaml
  docker:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: [quality, e2e]
    steps:
      - uses: actions/checkout@v7
      - name: Build image
        run: docker build -t order-panel:${{ github.sha }} .
      - name: Smoke test
        run: |
          docker run -d --name app -p 3000:3000 \
            -e APP_ENV=preview -e APP_VERSION=${{ github.sha }} \
            order-panel:${{ github.sha }}
          for i in $(seq 1 30); do
            curl -fsS http://localhost:3000/api/health && exit 0
            sleep 1
          done
          docker logs app
          exit 1
```

- `needs` holds this job back until the other two pass.
- The image tag is the commit SHA. Which image was produced from which code is always clear.
- A **smoke test** checks that the image works in the most basic way: does the container start, does the health endpoint respond? A missing file or an invalid environment variable is caught here *(see [Deployment options](/academy/production/deployment-options))*.

## Concurrency and permissions

`concurrency` limits the runs in the same group. `cancel-in-progress: true` cancels the old run when a new one arrives in the same group.[^5] In the project this is only on for pull requests: if three pushes arrive on the same branch one after another, only the last is tested. The runs on `main`, on the other hand, are not cut short.

`permissions` decides the privileges of the `GITHUB_TOKEN` given to the workflow. GitHub's security guide recommends giving this token the least privilege it needs.[^6] For a pipeline that only reads the code, `contents: read` is enough; if one job needs more *(publishing a package, for example)*, give the permission to that job only.

## Secrets

Values such as API keys are kept not in the repository but as a **secret** in GitHub. GitHub stores secrets encrypted, and a workflow can read a secret only when it uses it explicitly. Secret values written to the logs are masked automatically, but GitHub says that is not a guarantee: if the value is transformed *(turned into base64, for example)*, the mask may not hold.[^7]

```yaml
      - name: Deploy
        run: ./scripts/deploy.sh
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

Where secrets leak from and how to protect them is in the [Secret and dependency security](/academy/auth-security/secrets-and-dependencies) lesson.

> [!WARNING]
>
> Pull requests opened from a fork cannot reach the secrets by default, and their tokens are read-only.[^8] Do not use `pull_request_target` to get around that; that trigger can run the fork's code with your repository's privileges.

## Environments and a protected deploy

GitHub **environments** define deploy targets such as `preview` and `production`. Every environment gets its own secrets and protection rules. When a job is bound to an environment, it does not start running until the protection rules have passed, and it only sees the environment's secrets after it has started running.[^9] If you define "required reviewers" for `production`, for example, the deploy waits until a team member approves it. That is exactly the "release with one approval" step of continuous delivery.

```yaml
  deploy:
    runs-on: ubuntu-latest
    needs: [docker]
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://orders.example.com
    concurrency: production
    steps:
      - uses: actions/checkout@v7
      - name: Deploy
        run: ./scripts/deploy.sh
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
          APP_VERSION: ${{ github.sha }}
```

- `if` runs the deploy only on `main`; pull requests are not deployed.
- `concurrency: production` stops two deploys from running at the same time.[^5]
- `deploy.sh` varies with your platform: pushing the image to a registry, connecting to the server and starting the new image, or calling the platform's CLI.

On platforms with a Git integration, such as [!vercel], this job is not needed: the platform builds on every push itself and writes a preview address on the pull request. The GitHub Actions pipeline still stands as the lint, type and test gate; with branch protection rules, make merging into `main` depend on those checks passing.

## Pinning the actions

`actions/checkout@v7` is a tag, and tags can move. If the account of an action's owner is taken over and the tag is pointed at another commit, your workflow runs that code. This is why GitHub recommends pinning third-party actions to a full commit SHA.[^6] GitHub also offers workflow lock files *(`.github/workflows/actions.lock`)*, currently in preview, as a more thorough solution to this problem.[^10]

> [!TIP]
>
> Using a tag for GitHub's own actions *(`actions/*`)* is common. For community actions, pin to the SHA and keep them current with Dependabot.

## Try it yourself

- Add `ci.yml` to your project and open a pull request. Push a commit with a lint error and see which job fails.
- Push to the same branch twice in a row; watch the first run being cancelled.
- Add the `.next/cache` cache and see whether the build time changes on the second run.
- Create an environment called `production` in the repository settings, make yourself a reviewer, and watch a deploy job wait for approval.

## Going deeper

- **Article:** [Martin Fowler](https://martinfowler.com/), "Continuous Integration"; the practice's rules and the fast build.[^1]
- **Article:** [Martin Fowler](https://martinfowler.com/), "Deployment Pipeline"; splitting the pipeline into stages.[^3]
- **Official docs:** GitHub, "Secure use reference"; the token permissions, the secrets and pinning the actions.[^6]

## Sources

1. [Martin Fowler](https://martinfowler.com/): [Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html) *(article)* — First published in 2006. Daily merging, the automated build and fast feedback.
2. [Martin Fowler](https://martinfowler.com/): [Continuous Delivery](https://martinfowler.com/bliki/ContinuousDelivery.html) *(article)* — May 30, 2013. Software that is releasable at any moment, and the difference from continuous deployment.
3. [Martin Fowler](https://martinfowler.com/): [Deployment Pipeline](https://martinfowler.com/bliki/DeploymentPipeline.html) *(article)* — May 30, 2013. Splitting the build into stages, from the fast to the slow.
4. [Next.js: CI Build Caching](https://nextjs.org/docs/app/guides/ci-build-caching) *(doc)* — Preserving `.next/cache` in CI, with a GitHub Actions example.
5. [GitHub: Control the concurrency of workflows and jobs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency) *(doc)* — The `concurrency` groups and `cancel-in-progress`.
6. [GitHub: Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use) *(doc)* — Least privilege, the `GITHUB_TOKEN` permissions, and pinning actions to a commit SHA.
7. [GitHub: Secrets](https://docs.github.com/en/actions/concepts/security/secrets) *(doc)* — Storing secrets, using them in a workflow, and the automatic masking.
8. [GitHub: Compromised runners](https://docs.github.com/en/actions/concepts/security/compromised-runners) *(doc)* — The read-only privileges of pull requests from a fork, and their access to secrets.
9. [GitHub: Deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments) *(doc)* — The environments, the protection rules and the environment secrets.
10. [GitHub: Workflow dependency lockfiles](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles) *(doc)* — Pinning actions to a commit with a lock file *(preview)*.
