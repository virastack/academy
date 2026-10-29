<div align="center">

<a href="https://github.com/virastack/academy" target="_blank" rel="noreferrer">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/virastack/academy/main/assets/logo-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/virastack/academy/main/assets/logo-light.png">
    <img src="https://raw.githubusercontent.com/virastack/academy/main/assets/logo-light.png" alt="ViraStack Academy" height="120" style="max-width: 100%;" />
  </picture>
</a>

*Up-to-date React frontend roadmap: curated sources, no unnecessary detail*

[![ViraStack Academy](https://img.shields.io/badge/ViraStack-Academy-%2300a6f4)](https://virastack.com/academy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/virastack/academy/blob/main/LICENSE)
[![@virastack](https://img.shields.io/badge/-%40virastack-black?logo=x&logoColor=white)](https://x.com/virastack)

</div>

---

### [Start the roadmap →](https://virastack.com/academy)

## Features

- **Clear Order:** Shows which tools to learn, and in what order, from web fundamentals to AI-native frontend.
- **Short and Focused:** Each lesson covers the essentials and points to the best sources for going deeper.
- **Trusted Sources:** Only official documentation, recognized engineers, and independent institutions.
- **Hands-On Projects:** Tracks end with small projects that tie the lessons together.
- **Free, No Ads:** Every guide and every source is free to access.

## Roadmap

| Stage | Tracks |
| :--- | :--- |
| **Before You Start** | Web Fundamentals |
| **Building with React** | TypeScript, React, Next.js |
| **State & Data** | TanStack Query, Zustand, Forms |
| **Testing, Quality & Shipping** | Vitest, Playwright, Performance & Accessibility, Production |
| **Advanced** | Architecture & Scalability, Software Principles, Auth & Security, AI for Frontend |
| **Team & Industry** | Industry Glossary |

## Repository Structure

| Path | Description |
| :--- | :--- |
| `content/<locale>/curriculum.json` | Track and lesson tree (`tr` for now) |
| `content/<locale>/<track>/<lesson>.md` | Lesson bodies, one folder per language |
| `examples/` | Source code for project lessons |
| `assets/` | Images used in lessons |
| `CONTENT.md` | Authoring syntax |

Lessons are currently written in Turkish (`tr`). The English (`en`) folder is reserved and has no lessons yet.

[virastack.com](https://virastack.com) clones this repository at build time. Every push to `main` redeploys the site.

## Contributing

To suggest a source, report an error, or request a new topic, open an [issue](https://github.com/virastack/academy/issues) or send a pull request. See [`CONTENT.md`](CONTENT.md) for the lesson format.

## Ecosystem

Part of the [ViraStack](https://virastack.com) ecosystem: [Start](https://github.com/virastack/start) · [AI](https://github.com/virastack/ai) · [Mask](https://github.com/virastack/form/tree/main/packages/mask) · [Password](https://github.com/virastack/form/tree/main/packages/password) · [Address](https://github.com/virastack/form/tree/main/packages/address) · [Guide](https://github.com/virastack/guide)

## License

[MIT](LICENSE) © [Ömer Gülçiçek](https://omergulcicek.com)
