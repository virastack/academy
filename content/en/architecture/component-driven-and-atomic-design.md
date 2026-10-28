---
title: "Component-driven and Atomic Design"
description: "Building an interface from the bottom up and classifying the shared UI parts."
lastVerified: "2026-10-25"
translationKey: "architecture/component-driven-and-atomic-design"
---

Both build an interface out of small parts, but they answer different questions. **Component-driven development** describes how you will work, and **Atomic Design** how you will classify and name the parts.

## Component-driven development

Component-driven development is the practice of building an interface from modular components, from the bottom up. The basic components are built first, then combined on the screens.[^1] The process has four steps:[^1]

1. **Build the components in isolation.** Define each one's states one by one.
2. **Combine them.** Build larger parts such as a form, a header, a list and a table out of the small ones.
3. **Build the pages.** Use fake data to imitate the states that are hard to reach.
4. **Connect them.** Connect the pages to the data, the business logic and the backend APIs.

According to the site's own claim, this approach raises quality *(the components are tested in isolation)*, makes bugs easier to find *(a bug is hunted at the component level rather than on a screen)*, speeds things up *(reuse from the library)* and lets a team work in parallel.[^1] The site is run by Chromatic and an open-source community, so these benefits are the method's advocates' account.[^1]

To verify the components in isolation, the component tests from the [Vitest](/academy/vitest/introduction) guide can be used.

## Atomic Design

[Brad Frost](https://bradfrost.com) proposes five stages for an interface design system:[^2]

| Stage | What? | Example |
| --- | --- | --- |
| **Atom** | A basic element that loses its function if split further | A label, an input, a button |
| **Molecule** | A simple group of atoms working together | A search form out of a label, an input and a button |
| **Organism** | A complex section built from molecules and atoms | The site header, a product grid |
| **Template** | A page layout with no content | The page's content structure |
| **Page** | A template filled with realistic content | The page with 1 and with 10 items in the cart |

Frost says this is a mental model, not a linear process: the designer moves back and forth between the parts and the whole. It is not a strict dogma either; teams can change the stages' names to suit their own organisation.[^2]

## When turning it into a folder structure

`atoms/`, `molecules/` and `organisms/` folders are an arrangement **by type**. It loses the advantage of finding a feature's code in one place. That discussion is in the "By type or by feature?" section of the [Folder structure and naming](/academy/architecture/folder-structure) guide.

This guide's advice: use Atomic Design's vocabulary to classify the shared UI kit *(`shared/ui`)*, and do not apply it to the feature code. Because Frost allows the stage names to be changed, that use does not go against the method's spirit.[^2]

## When you don't need it

> [!CAUTION]
>
> Atomic Design is not a strict dogma.[^2] If you have no shared component kit or design system, splitting into five stages only adds weight. In the same way, the isolated development steps can be unnecessary for a small, single-use component. This too is this guide's own advice.

## Sources

1. [Component Driven: Component-Driven Development](https://www.componentdriven.org/) *(doc)* — Bottom-up development, the four-step process and the claimed benefits. The site is run by Chromatic and the community.
2. [Brad Frost: Atomic Design, Chapter 2](https://atomicdesign.bradfrost.com/chapter-2/) *(book)* — The atom, molecule, organism, template and page stages, it being a mental model, and the stage names being changeable.
