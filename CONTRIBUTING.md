# Contributing to Farsha

Thanks for helping. Farsha is a free, open source, Figma-like design tool.

## Setup

```bash
pnpm install
pnpm --filter @farsha/web dev   # http://localhost:5173/?nologin
```

`?nologin` skips Google sign-in locally. For real sign-in, create `apps/web/.env.local` from
`apps/web/.env.example` (see [docs/DEPLOY.md](docs/DEPLOY.md)). Never commit `.env.local` or any key.

Read [docs/HANDOFF.md](docs/HANDOFF.md) first for the architecture and the reasons behind it.

## Ground rules

- **One feature or fix per pull request.** Small PRs are reviewed faster.
- **Match Figma exactly**: labels, shortcuts, panels and behaviour, so Figma users are not confused.
  If something cannot match yet, note the difference in [docs/FEATURE_GAP.md](docs/FEATURE_GAP.md).
- **Do not copy Figma's code, assets, icons or other proprietary material.** Reproduce behaviour only.
- All document changes go through `DesignDoc` operations so undo/redo keeps working.
- Never trust data from a shared file; follow the allow-list approach described in the handoff doc.

## Before you open a pull request

```bash
pnpm typecheck
pnpm test
pnpm --filter @farsha/web build
```

All three must pass. Add tests for new behaviour, and try the change in the browser, not only in tests.

## Commits and pull requests

- Write short, plain commit messages in the imperative: "Add star point count control".
- Describe what changed and how you checked it. Include a screenshot or GIF for UI changes.
- Be honest about what you did and did not test.

## Reporting bugs and ideas

Use the issue templates. For security problems, do not open a public issue; see [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
