---
title: "Code and team"
description: "The PR and code review culture, tech debt, releases and versioning."
lastVerified: "2026-10-16"
translationKey: "glossary/code-and-team"
---

## Pull requests and code review

A **pull request (PR)** is the change you propose to the team before your code change is added to the main code.[^1] **Code review** is the process in which your teammates read that change, comment on it and approve it. The aim is to catch mistakes early, keep the code readable and spread knowledge through the team.

In a healthy review culture PRs are kept small, because a large change is hard to review carefully.[^2] Comments are aimed at the code rather than the person and explain why something is suggested.[^3] Because waiting for a review slows the work down, teams usually make a habit of turning reviews around quickly.[^4]

## Tech debt

**Tech debt** is what happens when the shortcuts taken to finish work quickly today create extra work later. Not upgrading an old library, writing code without tests or leaving a temporary fix in place are examples. It is like a financial debt: if you don't pay it, the interest grows, which is to say every later change becomes slower and riskier.[^5]

Not all technical debt is bad. A team can take debt on deliberately; what matters is **making it visible**.[^5] A ticket is usually opened for the debt and a certain share of the sprint is set aside to pay it down.

## Releases

A **release** is putting the code into production so it reaches users. Some teams release in batches at fixed intervals; others ship to production several times a day as changes become ready. **Frequent, small releases** make it easier to find the cause of a problem and to fix it.[^6]

## Versioning

Versioning is giving every release a number. The most widespread method is **Semantic Versioning**, where the number takes the form `MAJOR.MINOR.PATCH`.

The `MAJOR` version goes up when an incompatible change breaks existing use. The `MINOR` version goes up when a backwards-compatible feature is added, and the `PATCH` version when a backwards-compatible bug fix is made.[^7]

So if a bug fix arrives for version `2.4.1` it becomes `2.4.2`, a new feature makes it `2.5.0`, and an incompatible change makes it `3.0.0`. Versions of the form `0.y.z` are in initial development and anything can change.[^7] [!npm] package versions are read according to this method, which is why you have to read the release notes when you raise a package's `MAJOR` version.[^8]

## Sources

1. [GitHub Docs: About pull requests](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests) *(doc)* — A PR being a proposal to merge code changes into a project, and reviewers commenting on it.
2. [Google Engineering Practices: Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html) *(doc)* — Small changes being reviewed faster and more carefully.
3. [Google Engineering Practices: How to write code review comments](https://google.github.io/eng-practices/review/reviewer/comments.html) *(doc)* — Aiming comments at the code rather than the person, and explaining the reasoning.
4. [Google Engineering Practices: Speed of Code Reviews](https://google.github.io/eng-practices/review/reviewer/speed.html) *(doc)* — Slow reviews lowering the team's velocity.
5. [Martin Fowler: Technical Debt](https://martinfowler.com/bliki/TechnicalDebt.html) *(article)* — The interest on the debt, paying the principal down gradually, and deliberate debt.
6. [DORA: Working in small batches](https://dora.dev/capabilities/working-in-small-batches/) *(research)* — Small batches shortening the feedback loop and making problems easier to isolate and fix.
7. [Semantic Versioning 2.0.0](https://semver.org/) *(doc)* — The semantic versioning rules: MAJOR, MINOR, PATCH and 0.y.z versions.
8. [npm Docs: About semantic versioning](https://docs.npmjs.com/about-semantic-versioning) *(doc)* — MAJOR, MINOR, PATCH and the behaviour of `^` and `~` in npm packages.
