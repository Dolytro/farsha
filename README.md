# Farsha

A free, open source, Figma-like design tool for UI/UX design, Dev Mode handoff and share links.
It runs in the browser and saves your designs to **your own Google Drive**. There is no backend.

Live: https://farsha-design.vercel.app

> **Status: early.** Farsha already covers everyday design work, but it is not at full Figma parity.
> See [docs/FEATURE_GAP.md](docs/FEATURE_GAP.md) for what is done and what is missing.

Farsha is an independent project. It is not affiliated with, endorsed by or sponsored by Figma, Inc.
"Figma" is a trademark of Figma, Inc. and is used here only to describe compatibility of workflow.

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
git clone https://github.com/Dolytro/farsha.git
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

## License

[MIT](LICENSE)
