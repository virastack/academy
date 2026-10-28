---
title: "Sprints and rituals"
description: "What the sprint, daily, planning and retro meetings are for."
lastVerified: "2026-10-16"
translationKey: "glossary/sprints-and-rituals"
---

In Scrum there are four meetings that repeat through a sprint. The Scrum Guide calls them events and, counting the sprint itself, defines five events in all.[^1] What a sprint is was covered in [Working methods](/academy/glossary/working-methods).

## Sprint Planning

**Sprint Planning** happens at the start of the sprint and settles which work will be done in it. The team looks for answers to three questions: *why this sprint is valuable, what can be finished in it, and how the chosen work will get done*.[^1] One goal is set per sprint (the **Sprint Goal**). The Scrum Guide puts it at a maximum of 8 hours for a one-month sprint and expects it to be shorter for shorter sprints.[^1] Scaling that proportionally, Sprint Planning for a 2-week sprint runs to **about 4 hours** at most.

## Daily Scrum

The **daily** is a **15-minute** meeting the development team holds at the same time every day.[^1] Its purpose is to review progress towards the Sprint Goal and update the day's plan where needed. In practice everyone says *what they did since yesterday, what they will do today, and whether anything is blocking them*. Technical discussions happen separately with the people involved once the daily is over.[^2]

## Sprint Review

The **Sprint Review** happens at the end of the sprint. The team shows the stakeholders the working piece of product that came out of this sprint, gets feedback and talks through the next steps together.[^1][^3] The Scrum Guide puts it at a maximum of 4 hours for a one-month sprint and expects it to be shorter for shorter sprints.[^1] Scaling that proportionally, a Sprint Review for a 2-week sprint runs to **about 2 hours** at most. What is discussed here is not how the code was written but what the product that came out of it is.

## Sprint Retrospective (Retro)

The **retro** is the sprint's last event and happens after the Review. Its purpose is to improve not the product but the way the team works.[^1] The team talks about what went well in the sprint, what went wrong, and what it will change in the next one. The Scrum Guide puts it at a maximum of 3 hours for a one-month sprint and expects it to be shorter for shorter sprints.[^1] Scaling that proportionally, a retro for a 2-week sprint runs to **about 1.5 hours** at most. A good retro ends with the most impactful improvements to apply in the next sprint being identified.[^4]

### An example: a retro scenario

The scenario below is an example. It is made up to show how a retro works.

**The problem:** in one sprint a frontend developer planned to finish the profile page. But the backend APIs the page would use were delivered in the sprint's last days. Because the frontend developer could not work with real data, they did not get the work done by the end of the sprint.

**Raising it:** in the retro the frontend developer says so plainly: they could not finish on time because the backend APIs arrived late. That is not blaming a person; it is identifying a point where the process broke down. A retro exists precisely to make that kind of breakdown visible.

**The options:** the team weighs two ways to solve the problem. The first is for the backend to run a sprint ahead: the backend prepares the APIs in one sprint and the frontend uses them in the next. The second is for the frontend and the backend to agree on an API contract at the start of the sprint and work in parallel: until the backend is ready, the frontend builds against mock data that follows the contract.

**The decision:** the team picks the second way, because it lets the frontend work without waiting and gets both pieces finished in the same sprint. The decision is turned into a concrete action: in future sprints, a contract will be written for every API during sprint planning.[^4] At the next retro they check whether that decision worked.

## Backlog Refinement

**Refinement** is not an official Scrum event, but most teams do it regularly. Items in the Product Backlog are clarified, split and sized before they reach sprint planning.[^1] The backlog is covered in [Work tracking](/academy/glossary/work-tracking).

## Sources

1. [The Scrum Guide (2020)](https://scrumguides.org/scrum-guide.html) *(doc)* — The official definition of Scrum: the accountabilities, the sprint, the events, their time boxes and the backlog. Ken Schwaber and Jeff Sutherland, 2020.
2. [Scrum.org: What is a Daily Scrum?](https://www.scrum.org/resources/what-is-a-daily-scrum) *(article)* — The daily's purpose being to review progress towards the Sprint Goal, and detailed discussions happening right after it.
3. [Scrum.org: What is a Sprint Review?](https://www.scrum.org/resources/what-is-a-sprint-review) *(article)* — Presenting the results to stakeholders, not reducing the meeting to a demo, and running it as a working session.
4. [Scrum.org: What is a Sprint Retrospective?](https://www.scrum.org/resources/what-is-a-sprint-retrospective) *(article)* — Planning ways to increase quality and effectiveness, and identifying the improvements to apply in the next sprint.
