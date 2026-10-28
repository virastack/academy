---
title: "Work tracking"
description: "Jira, writing a ticket, the backlog, prioritization and estimation."
lastVerified: "2026-10-16"
translationKey: "glossary/work-tracking"
---

## Jira and tickets

[!jira] is a project management tool teams use to plan and track their work.[^1] Every record of work inside it is called a **ticket** (or an issue). Jira now calls them work items.[^2] A ticket can be a bug fix, a new feature or a small chore. Other tools do the same job, [!linear] and [!azuredevops] for example, but the concepts are largely the same.

Tickets are usually split into these types: an **epic**, which stands for a large group of work, a **story**, which is a requirement written from the user's point of view, a **task**, which is a general piece of work that has to be done, and a **bug**, which reports a problem that has to be fixed.[^2]

## Writing a ticket

A good ticket lets someone who has never seen it work out what has to be done. It usually contains: a short, clear title, why the work is needed, the **acceptance criteria** (when the work counts as finished) and, if it is a bug, how to reproduce it.[^3] A ticket with vague acceptance criteria leads to a "is it done or not?" argument between the developer and whoever asked for it.

## The backlog

The **backlog** is the ordered list of all the work that is planned. The Scrum Guide defines the Product Backlog as an ordered list of what is needed to improve the product.[^4] A backlog is not a fixed list; it is updated continuously as the product and the needs change. In Scrum, some of the items at the top of the backlog are chosen at the start of a sprint as that sprint's work.[^4]

## Prioritization

Prioritization is deciding which of the items in the backlog gets done first. In Scrum that decision belongs to the Product Owner.[^4] The general measure is to weigh the value a piece of work will give the user or the business against the cost of doing it. A bug in production usually comes before a new feature.

A piece of work can also be split into stages (**phases**) by priority. In a payment feature, for example, paying by credit card happens in the first phase while paying with PayPal is left to phase 2. That way the part that gives the user value is delivered sooner. When deciding on the phase split, the Product Owner talks to the customer or the stakeholders where needed, but makes the call themselves based on the priorities.[^4] A phase is not a Scrum term; it is a method widely used in planning.

## Estimation

**Estimation** is forecasting how long a piece of work will take, or how large, complex and risky it is.[^5] The aim is not to give an exact duration but to forecast how much work will fit into a sprint. The size of the work is set by the developers who will do it. The Product Owner can influence them by explaining the priorities and the trade-offs, but does not set the number themselves.[^4]

Teams use two basic approaches:

- **Person-days:** says how many working days it takes to code and test the work and get it ready to ship, for example 3 person-days.
- **Story points:** measure the size of the work relatively, independently of time, and many teams use them.[^5]
  - The points are usually based on the Fibonacci sequence: 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144.
  - In [Mike Cohn](https://www.mountaingoatsoftware.com/about/mike-cohn)'s Planning Poker deck, 13 is followed by 20, 40 and 100.[^6]
  - The gaps widen as the numbers grow. That reflects uncertainty growing with the size of the work, and it is a reminder that arguing *"is it 13 or 14?"* is pointless for large items.
  - Story points and Fibonacci do not appear in the Scrum Guide, but they are a practice widely used on Agile teams.

Teams usually set a threshold of their own, 13 or 21 points for example. Work that comes out above that is seen as risky to finish in one sprint, so it is split into smaller pieces and taken into the sprint that way. The threshold is **not a rule but the team's own decision**. The Scrum Guide says that work which can be finished in one sprint is deemed ready to be selected in sprint planning.[^4]

### An example: the estimation flow

**Estimating:** while estimating a product listing page, the team weighs the components on the screen and the testing work together. Estimating is usually done by voting, a method called **Planning Poker**.[^6] If one developer says 5 and another says 13, the gap is an opportunity to talk about hidden risk and uncertainty.[^6] At the end of the discussion the team settles on 8, say.

**Capacity:** the total story points a team completes in a sprint is called its **velocity**.[^7] If the velocity is 35 points, items whose total does not exceed 35 points are taken from the backlog into the sprint. Six tasks of 1, 3, 5, 5, 8 and 13 points, for example, add up to 35.

**Splitting:** if "the Product Listing Page with every feature" comes out at 55 points on its own, it does not go into the sprint as it is, because it is far above the 35-point capacity. The work is split into smaller pieces such as Product Listing, Add to Cart, Filtering and Search (story splitting), each piece is estimated separately, and they are taken into sprints that way.[^8]

## Sources

1. [Atlassian: Jira Basics](https://www.atlassian.com/software/jira/guides/getting-started/basics) *(doc)* — What Jira is and how records of work are used for tracking.
2. [Atlassian: Jira work items overview](https://www.atlassian.com/software/jira/guides/issues/overview) *(doc)* — That issues are now called work items, and the default types: epic, story, task, bug, sub-task.
3. [Bugzilla: Bug Writing Guidelines](https://bugzilla.mozilla.org/page.cgi?id=bug-writing.html) *(doc)* — Reproduction steps being the most important part of a bug report, writing the expected and the actual result separately, and a short, singular title.
4. [The Scrum Guide (2020)](https://scrumguides.org/scrum-guide.html) *(doc)* — The official definition of Scrum: the accountabilities, the sprint, the events, their time boxes and the backlog. Ken Schwaber and Jeff Sutherland, 2020.
5. [Mountain Goat Software: What Are Agile Story Points?](https://www.mountaingoatsoftware.com/blog/what-are-story-points) *(article)* — Story points measuring effort, complexity, risk and uncertainty together, and the ratios being what matters. Mike Cohn.
6. [Mountain Goat Software: Planning Poker](https://www.mountaingoatsoftware.com/agile/planning-poker) *(article)* — Hidden voting, the highest and lowest estimators explaining their reasoning, and the 0, 1, 2, 3, 5, 8, 13, 20, 40, 100 deck.
7. [Agile Alliance: Velocity](https://www.agilealliance.org/glossary/velocity/) *(article)* — Velocity being the sum of the estimates of the stories completed in one iteration.
8. [Mountain Goat Software: Five Simple but Powerful Ways to Split User Stories](https://www.mountaingoatsoftware.com/blog/five-simple-but-powerful-ways-to-split-user-stories) *(article)* — SPIDR: splitting stories by Spike, Path, Interfaces, Data and Rules.
