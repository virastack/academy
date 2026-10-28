---
title: "Choosing a pattern"
description: "FSD, DDD, component-driven and Atomic Design: which one answers which question."
lastVerified: "2026-10-25"
translationKey: "architecture/choosing-a-pattern"
---

The previous three lessons are not alternatives to each other. Each answers a different question. This lesson helps you decide which one to add when.

## Which question does it answer?

| Question | Pattern | Lesson |
| --- | --- | --- |
| Where does the code go, and who imports whom? | Feature-Sliced Design | [Feature-Sliced Design](/academy/architecture/feature-sliced-design) |
| How does the product's language appear in the code, and where does a concept end? | The ubiquitous language and bounded contexts from DDD | [Domain-driven frontend](/academy/architecture/domain-driven-frontend) |
| In what order and how do we build the interface? | Component-driven development | [Component-driven and Atomic Design](/academy/architecture/component-driven-and-atomic-design) |
| How do we classify and name the shared UI parts? | Atomic Design | The same lesson |

## Move incrementally

The FSD documentation says it can be used on a project of any size and can be adopted incrementally. It gives the sign to move, too: when the architecture starts to cause problems, that is, when the project has become tangled enough to slow down adding features, or a large number of new people have joined the team.[^1]

The order this guide recommends *(not one of the sources)*:

1. **Feature folders and one-way imports.** The arrangement from the [Folder structure and naming](/academy/architecture/folder-structure) guide is enough for most projects.
2. **The ubiquitous language and the context split.** It costs nothing: a glossary and separate types.
3. **FSD's layer rule.** Once the team and the code grow and the dependencies start to tangle.
4. **The Atomic Design classification.** If you have a shared UI kit.
5. **The component-driven way of working.** If the designer and the developer work on the same components.

## Using them together

The patterns do not clash; they work at different layers. FSD's documentation puts no constraint on the language, the UI framework or the state manager.[^1] An example combination:

- **FSD** decides the application's folder structure and the import direction.
- **The ubiquitous language** decides the names, and **the bounded context** the slice boundaries.
- **Atomic Design** classifies the parts inside `shared/ui`. Frost says the stage names can be changed to suit the team.[^2]
- **Component-driven** decides the way of working.

## When you don't need it

> [!CAUTION]
>
> A pattern is a tool, not a goal. Ask three questions:
>
> - **Is the current structure slowing us down?** According to the FSD documentation, if the architecture works, changing it may not be worth it.[^1]
> - **Is the rule checked automatically?** FSD offers a linter that enforces its rules *(Steiger)*.[^1] As in the [Component and code organisation](/academy/architecture/component-organization) guide, a written rule gets broken and a lint rule does not.
> - **Has it turned into dogma?** Atomic Design is a mental model, not a strict rule.[^2] The same holds for the other patterns.
>
> DDD's detailed patterns, meanwhile, suit particularly complex domains.[^3]

## Sources

1. [Feature-Sliced Design: Overview](https://feature-sliced.design/docs/get-started/overview) *(doc)* — Use at any size, incremental adoption, the signs to move, the absence of a framework constraint, and the Steiger linter.
2. [Brad Frost: Atomic Design, Chapter 2](https://atomicdesign.bradfrost.com/chapter-2/) *(book)* — The stages being a mental model, and their names being changeable.
3. [Martin Fowler: Domain Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html) *(article)* — DDD's suitability for complex domains. April 22, 2020.
