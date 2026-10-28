---
title: "Domain-driven frontend"
description: "What to take from DDD into the frontend: the ubiquitous language and bounded contexts."
lastVerified: "2026-10-25"
translationKey: "architecture/domain-driven-frontend"
---

**Domain-Driven Design** *(DDD)* takes its name from Eric Evans's 2003 book. [Martin Fowler](https://martinfowler.com) summarises it like this: development revolves around programming a model that captures the domain's processes and rules.[^1] For most frontend projects the whole book is not needed. Two ideas are useful: the **ubiquitous language** and **bounded contexts**.

## The ubiquitous language

DDD stresses embedding the domain's terms into the software. That language is called the *ubiquitous language*.[^1] Its frontend equivalent is simple: what the product team calls an "order" gets the same name in the design, in the API and in the code.

The same concept having three names is a common problem: "order" in the design, `purchase` in the API, `Txn` in the code. Everyone who joins has to translate. The habit to recommend is keeping the product glossary in one place and taking the type, component and folder names from there. This recommendation is this guide's own.

## Bounded contexts

In Fowler's example, at an electricity company the word "meter" can mean the connection between the grid and a location, the connection between the grid and a customer, or the physical device. The same happens with words such as "customer" and "product".[^2] For Evans, unifying a large system's domain model completely is neither possible nor cost-effective. DDD splits the system into **bounded contexts**, and every context gets its own consistent model.[^2]

In the frontend that turns into this: on the checkout screen a "customer" is a delivery address and a payment method, and on the support screen it is the open tickets. Collect the two into a single global `Customer` type and every screen fills up with fields it does not need.

```ts
// features/checkout/types.ts
export type Customer = {
  id: string
  shippingAddress: Address
  paymentMethodId: string
}

// features/support/types.ts
export type Customer = {
  id: string
  openTickets: number
  lastContactAt: string
}
```

The same name existing in two files is deliberate. Contexts map between models that overlap.[^2] In practice you convert the API response into every context's own type. This guide's mapping: a context boundary is a [Feature-Sliced Design](/academy/architecture/feature-sliced-design) slice or a feature folder boundary.

## How it relates to FSD

FSD's `entities` layer holds the business concepts the application works with *(a user, a product)*. If the project has no such concepts, that layer is optional.[^3] The ubiquitous language feeds that layer's naming. Bounded contexts, meanwhile, decide the slice boundaries.

## When you don't need it

> [!CAUTION]
>
> Fowler finds DDD suitable particularly for complex domains.[^1] DDD's detailed patterns *(classifying objects as Entity, Value Object and Service, and Aggregate)* also come from that book.[^1] In most interface code those patterns are unnecessary weight. This guide's advice: in a simple CRUD panel, the ubiquitous language and separate types are enough; think about the rest once the complexity really appears.

## Sources

1. [Martin Fowler: Domain Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html) *(article)* — The domain model, the ubiquitous language, the Entity and Aggregate classification, and its suitability for complex domains. April 22, 2020.
2. [Martin Fowler: Bounded Context](https://martinfowler.com/bliki/BoundedContext.html) *(article)* — The same word carrying different meanings in different contexts, why a single unified model is not workable, and mapping between contexts. January 15, 2014.
3. [Feature-Sliced Design: Layers](https://feature-sliced.design/docs/reference/layers) *(doc)* — The `entities` layer holds the business concepts, and is optional.
