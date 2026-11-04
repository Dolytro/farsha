# Farsha

[![CI](https://github.com/Tanjir-Hasan/farsha/actions/workflows/ci.yml/badge.svg)](https://github.com/Tanjir-Hasan/farsha/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-donate-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/your-username)

A free, open source, Figma-like design tool for UI/UX design, Dev Mode handoff and share links.
It runs in the browser and saves your designs to **your own Google Drive**. There is no backend.

Live: https://farsha-design.vercel.app

> **Status: early.** Farsha already covers everyday design work, but it is not at full Figma parity.
> See [docs/FEATURE_GAP.md](docs/FEATURE_GAP.md) for what is done and what is missing.

Farsha is an independent project. It is not affiliated with, endorsed by or sponsored by Figma, Inc.
"Figma" is a trademark of Figma, Inc. and is used here only to describe compatibility of workflow.

> **Google sign-in is not public yet.** We have not published our Google Cloud project (OAuth consent
> screen) yet, so for now Google sign-in and saving to Drive will not work for the public. Until it is
> published, the live site keeps your design in your browser. To try Drive saving today, create your own
> Google Cloud project and run Farsha locally or on your own host (see [docs/DEPLOY.md](docs/DEPLOY.md)).

## Goals

- Copy Figma's names, shortcuts, panels and behaviour, so long-time Figma users feel at home.
- Keep your files yours: designs are `.farsha` files in your Google Drive.
- Generate code from designs in Dev Mode.

## Tech stack

React 19, Vite, TypeScript, Zustand, SCSS (BEM), an SVG renderer, a Yjs document model, and
pnpm + Turborepo for the monorepo.

## Repository layout

| Path | What it is |
|---|---|
| `apps/web` | The editor (Vite + React) |
| `apps/site` | The marketing / landing site (Next.js) |
| `apps/api` | API app |
| `packages/design-core` | Document model and operations (Yjs) |
| `packages/canvas-engine` | Hit testing, geometry and rendering helpers |
| `packages/code-generator` | Dev Mode code output |
| `packages/types` | Shared types |
| `packages/ui` | Shared UI components |

## Getting started

Requirements: Node.js and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/Tanjir-Hasan/farsha.git
cd farsha
pnpm install
pnpm --filter @farsha/web dev
```

Open http://localhost:5173/?nologin to skip Google sign-in while developing locally.

To use Google sign-in and Drive saving, copy `apps/web/.env.example` to `apps/web/.env.local` and fill in
your own Google OAuth client ID and API key. Steps are in [docs/DEPLOY.md](docs/DEPLOY.md).

## Scripts

```bash
pnpm typecheck                     # type check every package
pnpm test                          # run all tests
pnpm --filter @farsha/web build    # production build of the editor
```

## Documentation

- [docs/HANDOFF.md](docs/HANDOFF.md): architecture, decisions and history
- [docs/FEATURE_GAP.md](docs/FEATURE_GAP.md): Farsha compared with Figma
- [docs/DEPLOY.md](docs/DEPLOY.md): deployment and Google setup
- [docs/PLAN.md](docs/PLAN.md): the original plan

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.
To report a security problem, see [SECURITY.md](SECURITY.md).

## Support the project

Farsha is free and will stay free. If it saves you time, you can
[buy me a coffee](https://buymeacoffee.com/your-username). Starring the repo, reporting bugs and sending
pull requests help just as much.

## Community

- [Code of conduct](CODE_OF_CONDUCT.md)
- [Support and questions](SUPPORT.md)
- [Changelog](CHANGELOG.md)

## Related open source projects

Farsha is not the only open source design tool. [Penpot](https://penpot.app) is a mature, open source
design and prototyping platform, worth a look if Farsha does not cover what you need yet.

## License

[MIT](LICENSE). Third-party packages keep their own open source licenses.
