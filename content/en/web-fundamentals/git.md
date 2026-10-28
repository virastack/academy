---
title: "Git"
description: "Version control with commits, branches and a remote."
lastVerified: "2026-10-17"
translationKey: "web-fundamentals/git"
---

## What Git is

**Version control** is a system that records changes to files over time. You can take a file, or a whole project, back to an earlier state, and see what changed when and by whom.[^1]

**Git** is the most widely used version control system, and it is **distributed**: every developer has a full copy of the project and all of its history on their machine. That is why you do not need to be online to commit.[^2][^1]

**GitHub** is not Git. It is a service that hosts Git **repositories** (repos for short) and adds team tools such as pull requests and code review on top. GitLab and Bitbucket do the same job.[^2]

## Setup and first configuration

Git is usually already installed on macOS and Linux; check with `git --version` in the terminal. Once it is installed, the first thing to do is set your name and e-mail address. Every commit carries them, and they cannot be changed afterwards:[^3]

```bash
git config --global user.name "Ömer Gülçiçek"
git config --global user.email iletisim@omergulcicek.com
git config --global init.defaultBranch main
```

That last line names the main branch `main` in the projects you start from now on. GitHub and the other services use `main`, and Git itself will move its default from `master` to `main` in version 3.0.[^3][^4]

## The basic flow

A file in Git is in one of three states:[^5]

| State | Meaning |
| :-- | :-- |
| **Modified** | You changed the file but have not recorded it yet |
| **Staged** | You marked the change to go into the next commit |
| **Committed** | The change is safely stored in Git's database |

So the flow is always the same: you change a file, you add the changes you want in the commit to the **staging area** with `git add`, and then you take a photograph of that moment with `git commit`.[^5][^2]

| Command | What it does |
| :-- | :-- |
| `git init` | Starts a new repo in the folder you are in |
| `git clone <url>` | Downloads a remote repo, with all of its history, to your machine |
| `git status` | Shows which files changed and which are staged |
| `git diff` | Shows the changes that are not staged yet, line by line |
| `git add index.html` | Adds the file to the staging area (`git add .` adds everything) |
| `git commit -m "Add cart button"` | Records the staged changes in the history |
| `git log --oneline` | Lists the commit history, one line each |

> [!TIP]
>
> When you are not sure what to do, run `git status` first. Its output often suggests the next command as well.

### .gitignore

Files that should stay out of the repo go in a `.gitignore` at the root. In frontend projects those are usually `node_modules`, the build output (`dist`, `.next`) and files that carry secrets, such as `.env`.[^6]

```bash
node_modules
dist
.env
```

> [!WARNING]
>
> Adding an already committed file to `.gitignore` does not remove it from the repo. Untrack it first with `git rm --cached .env`. If a password or an API key has been pushed even once, change the key as well.[^6]

## Branches

A **branch** is an independent line of work where you split off from the main code and make your own changes. You can try a new feature without disturbing `main`.

```bash
git switch -c add-to-cart-button   # create a branch and switch to it
git switch main                    # go back to main
git branch                         # list the local branches
```

`git switch -c` creates the branch and switches to it.[^7] Older sources do the same job with `git checkout -b`; both work.[^8]

`git checkout` used to be used both for switching branches and for undoing changes to files. Having one command do two different jobs was confusing, so Git 2.23 (2019) split them in two: `git switch` for moving between branches, `git restore` for undoing file changes.[^9] `git checkout` still works, but `git switch` is safer for switching branches: it only deals with branches, and it will not wipe your file changes by accident.[^7]

| Task | New command | Old equivalent |
| :-- | :-- | :-- |
| Switch to a branch | `git switch main` | `git checkout main` |
| Create a branch and switch | `git switch -c add-to-cart-button` | `git checkout -b add-to-cart-button` |
| Undo a change in a file | `git restore index.html` | `git checkout -- index.html` |

When the work is done, you **merge** the branch into `main`:

```bash
git switch main
git merge add-to-cart-button
```

If `main` has not moved since you left it, Git just moves the pointer forward (a **fast-forward**). If both sides moved on, it creates a new **merge commit** joining the two ends and their common ancestor.[^8]

## The remote

The repo on your machine is the **local** one, the one on GitHub is the **remote**. The default remote is called `origin`.[^2]

| Command | What it does |
| :-- | :-- |
| `git pull` | Downloads new commits from the remote and adds them to the branch you are on |
| `git push` | Sends your local commits to the remote |
| `git push -u origin add-to-cart-button` | Sends a new branch for the first time and links it to its remote counterpart |

A commit is a local operation; your teammates do not see your change until you `git push`.[^2]

## Git at work

### The team's daily flow

Most teams work with something close to GitHub flow:[^10][^11]

1. Bring `main` up to date: `git switch main` and `git pull`.
2. Open a new branch for the job.
3. Make small commits and push the branch.
4. Open a **pull request**; your teammates review the code (see [Code and team](/academy/glossary/code-and-team)).
5. Address the comments with new commits. Every push updates the PR on its own.
6. Once it is approved, merge the PR and delete the branch.

In this setup nothing is committed to `main` directly; everything arrives through a PR. That way `main` always carries working code.[^11]

### Naming a branch

A good branch name lets the team look at the list and tell who is working on what: short, but descriptive.[^10] On teams that use [!jira] the name usually starts with the ticket number, because Jira picks that number out of the branch name and shows the branch, its commits and the PR under the ticket:[^12]

```bash
git switch -c feature/PROJ-123-add-to-cart-button
git switch -c bugfix/PROJ-456-price-rounding
```

The common pattern is `type/TICKET-NUMBER-short-description`. The type prefixes are usually `feature/`, `bugfix/`, `hotfix/` and `release/`.[^13] Write branch names in lowercase, separating words with hyphens; keep spaces and accented characters out of them. If your team has settled on a rule of its own, that is the one that counts.

### One job, one branch

Jobs that have nothing to do with each other should not share a branch. GitHub recommends the same: a separate branch for each unrelated group of changes.[^10]

- **Review gets easier.** A PR that tells one story is read faster and more carefully.
- **Neither job holds the other up.** With two jobs on one branch, a problem in one keeps the other from shipping too.[^10]
- **There are fewer conflicts.** Small, short-lived branches carry fewer changes and find their way back to `main` easily.[^14]

If you spot another bug while working, open a new ticket and a new branch rather than fixing it on the same one. The exception is a small fix that is blocking your own work; mention those in the PR description.

### The commit message

A commit message is written for the person who asks *"why is this line like this?"* a few months from now. [Chris Beams](https://cbea.ms/)'s widely accepted rules, briefly:[^15]

- Keep the subject under 50 characters and do not end it with a full stop.
- Write the subject in the imperative: *"Fix add to cart button"*, not *"Fixed add to cart button"*.
- If more is needed, leave a blank line and explain **what** you changed and **why**.

Teams using Jira put the ticket number in the commit message too: `PROJ-123 Fix add to cart button`.[^12]

### When a conflict appears

A **merge conflict** happens when two branches change the same lines of the same file differently, or when one deletes a file the other changed. Git cannot decide which is right, so it stops the merge.[^16] On a team you usually meet it like this: you are working on your branch, a teammate's PR lands in `main`, and your PR starts warning about a *"conflict"*.

To fix it, bring the current `main` into your own branch:

```bash
git switch main
git pull
git switch feature/PROJ-123-add-to-cart-button
git merge main
```

If there is a conflict, Git tells you which files it is in, and `git status` lists them under **Unmerged paths**.[^8] Open the file and you see the two versions side by side between markers:[^8][^16]

```html
<<<<<<< HEAD
<button class="btn-primary">Add to cart</button>
=======
<button class="btn btn-lg">Add to Cart</button>
>>>>>>> main
```

Between `HEAD` and `=======` is the version on your branch, and between `=======` and `>>>>>>>` the one coming in. Then:[^17]

1. Decide which one stays. The right answer is often a combination of the two.
2. Delete the three marker lines.
3. Run the project and test it.
4. Mark it resolved with `git add <file>`.
5. Finish the merge with `git commit`, and `git push`.

Editors such as VS Code show *"Accept Current"*, *"Accept Incoming"* and *"Accept Both"* buttons on a conflicted file; that is the same job, done by clicking.

> [!DO]
>
> - If you did not write the code on the other side, ask the person who did before deciding.
> - If it gets messy, cancel the merge with `git merge --abort` and go back to where you started.[^16]
> - Bring `main` into your branch often. Merging often means more merges, but each one is smaller and carries less risk.[^14]

> [!DONT]
>
> - Do not resolve a conflict by saying *"keep mine"* and deleting the other side without reading it.
> - Do not leave the marker lines (`<<<<<<<`, `=======`, `>>>>>>>`) in the file and commit them.

Some teams use `git rebase main` instead of `git merge main`. The result is similar, but it rewrites history; ask which one your team prefers.

## Going deeper

- **Practice:** Learn Git Branching, which teaches branching, merging and rebasing visually in the browser.[^18]
- **Book:** Pro Git, Git's official and free book. The first three chapters are enough for daily use.[^1]
- **Inside Git:** [Mary Rose Cook](https://maryrosecook.com/)'s article and talk on how Git stores commits and branches as a graph.[^19]
- **Talk:** Pro Git's author [Scott Chacon](https://scottchacon.com/) on little-known Git features, at FOSDEM 2024 (50 min). Watch it once the basics have settled.[^20]

## Sources

1. [Pro Git: About Version Control](https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control) *(doc)* — What version control is, local, centralised and distributed systems, and every copy being a full backup.
2. [GitHub Docs: About Git](https://docs.github.com/en/get-started/using-git/about-git) *(doc)* — The difference between Git and GitHub, distributed version control, and the `clone`, `pull`, `add`, `commit`, `push` flow.
3. [Pro Git: First-Time Git Setup](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup) *(doc)* — The `user.name`, `user.email` and `init.defaultBranch` settings.
4. [Git: Breaking Changes](https://git-scm.com/docs/BreakingChanges) *(doc)* — The default branch name in new repos becoming `main` in Git 3.0; the release has no date yet.
5. [Pro Git: What is Git?](https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F) *(doc)* — The modified, staged and committed states; the working tree, the staging area and the Git directory.
6. [GitHub Docs: Ignoring files](https://docs.github.com/en/get-started/git-basics/ignoring-files) *(doc)* — `.gitignore`, removing a tracked file with `git rm --cached`, and the ready-made templates.
7. [Git: git-switch](https://git-scm.com/docs/git-switch) *(doc)* — `git switch`, and creating a branch and switching with `-c`.
8. [Pro Git: Basic Branching and Merging](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging) *(doc)* — Opening a branch, fast-forward and merge commits, the conflict markers, `Unmerged paths` and resolving with `git add`.
9. [GitHub Blog: Highlights from Git 2.23](https://github.blog/open-source/git/highlights-from-git-2-23/) *(article)* — `git checkout`'s jobs being split into the experimental `git switch` and `git restore` (August 2019).
10. [GitHub Docs: GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow) *(doc)* — The branch, commit, PR, review, merge and delete steps; short descriptive branch names and separate branches for unrelated work.
11. [Atlassian: Feature Branch Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/feature-branch-workflow) *(article)* — Developing every feature on its own branch, and keeping broken code out of `main`.
12. [Atlassian: Reference work items in your development work](https://support.atlassian.com/jira-software-cloud/docs/reference-issues-in-your-development-work/) *(doc)* — Linking to Jira by putting the Jira key in the branch name, the commit message and the PR title.
13. [Bitbucket: Configure a project's branching model](https://support.atlassian.com/bitbucket-cloud/docs/configure-a-projects-branching-model/) *(doc)* — The `feature/`, `bugfix/`, `hotfix/` and `release/` prefixes.
14. [Martin Fowler](https://martinfowler.com/): [Patterns for Managing Source Code Branches](https://martinfowler.com/articles/branching-patterns.html) *(article)* — Feature branches, integration frequency, and small frequent integrations reducing conflicts.
15. [Chris Beams](https://cbea.ms/): [How to Write a Git Commit Message](https://cbea.ms/git-commit/) *(article)* — The seven rules of a good commit message and the imperative-mood test.
16. [Atlassian: Git merge conflicts](https://www.atlassian.com/git/tutorials/using-branches/merge-conflicts) *(article)* — When a conflict appears, the markers, `git status` and `git merge --abort`.
17. [GitHub Docs: Resolving a merge conflict using the command line](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/resolving-a-merge-conflict-using-the-command-line) *(doc)* — Resolving a conflict in the terminal step by step: edit, `git add`, `git commit`.
18. [Learn Git Branching](https://learngitbranching.js.org/) *(doc)* — Visual, interactive Git exercises that run in the browser.
19. [Mary Rose Cook](https://maryrosecook.com/): [Git from the inside out](https://maryrosecook.com/blog/post/git-from-the-inside-out) *(article)* — How Git holds commits, branches and HEAD as a graph; there is a [talk](https://www.youtube.com/watch?v=fCtZWGhQBvo) too.
20. [Scott Chacon](https://scottchacon.com/): [So You Think You Know Git (FOSDEM 2024)](https://fosdem.org/2024/schedule/event/fosdem-2024-3611-so-you-think-you-know-git/) *(video)* — 50 minutes. Little-known Git settings and commands; for experienced users.
