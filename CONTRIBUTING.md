# Contributing to Farsha

Thanks for helping. Farsha is a free, open source, Figma-like design tool. This guide covers everything from
setting up the project to getting your pull request merged. By taking part you agree to follow our
[Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug** or **suggest a feature** with the [issue templates](https://github.com/Tanjir-Hasan/farsha/issues/new/choose).
  Search existing issues first so we do not duplicate.
- **Fix a bug or build a feature.** Check [docs/FEATURE_GAP.md](docs/FEATURE_GAP.md) for what Figma has that Farsha still lacks.
- **Improve the docs.**
- **Report a security problem privately.** Do not open a public issue; see [SECURITY.md](SECURITY.md).

For anything bigger than a small fix, **open an issue first** and wait for a maintainer to agree on the
approach. This saves you from building something we cannot merge.

## Set up your machine

Requirements: Node.js 22 or newer (see `.nvmrc`) and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm --filter @farsha/web dev   # http://localhost:5173/?nologin
```

`?nologin` skips Google sign-in locally. Google sign-in for the public is not live yet. For real sign-in on
your own machine, create `apps/web/.env.local` from `apps/web/.env.example` using your own Google Cloud
project (see [docs/DEPLOY.md](docs/DEPLOY.md)). Never commit `.env.local` or any key.

Read [docs/HANDOFF.md](docs/HANDOFF.md) first for the architecture and the reasons behind it.

## How to submit a pull request

Only the repository owner pushes or merges to `main`. Every other change goes through a pull
request that the owner reviews and merges.

1. **Fork** the repository on GitHub, then clone your fork:
   ```bash
   git clone https://github.com/<your-username>/farsha.git
   cd farsha
   git remote add upstream https://github.com/Tanjir-Hasan/farsha.git
   pnpm install
   ```
2. **Create a branch** from the latest `main`. Use a short name, for example `add-star-point-count`:
   ```bash
   git fetch upstream
   git switch -c add-star-point-count upstream/main
   ```
3. **Make one change.** One feature or fix per pull request. Small pull requests are reviewed faster.
4. **Run the checks** (see below) and try the change in the browser, not only in tests.
5. **Commit** with a short, plain message in the imperative, for example "Add star point count control".
6. **Push** to your fork and **open a pull request** against `Tanjir-Hasan/farsha` `main`:
   ```bash
   git push -u origin add-star-point-count
   ```
7. **Fill in the pull request template.** Say what changed, how it matches Figma, and how you checked it.
   Add a screenshot or GIF for UI changes. Be honest about what you did not test.
8. **Respond to review.** Push more commits to the same branch; the pull request updates by itself.
   Keep it up to date with `main` if it falls behind:
   ```bash
   git fetch upstream
   git rebase upstream/main
   git push --force-with-lease
   ```
9. **Merge.** When the owner approves, the owner merges it. Please do not merge your own pull request or ask
   others to. After it is merged you can delete your branch.

If you do not get a reply within about a week, leave a polite comment on the pull request.

## Checks that must pass

Automatic CI is switched off for now, so please run these yourself before you open a pull request:

```bash
pnpm typecheck
pnpm test
pnpm --filter @farsha/web build
```

All three must pass. Add tests for new behaviour.

## Ground rules for the code

- **Match Figma exactly**: labels, shortcuts, panels and behaviour, so Figma users are not confused.
  If something cannot match yet, note the difference in [docs/FEATURE_GAP.md](docs/FEATURE_GAP.md).
- **Do not copy Figma's code, assets, icons or other proprietary material.** Reproduce behaviour only.
  Do not paste code from other projects unless its license allows it, and say where it came from.
- All document changes go through `DesignDoc` operations so undo/redo keeps working.
- Never trust data from a shared file; follow the allow-list approach described in the handoff doc.
- Never commit secrets, tokens or API keys.
- Keep the style of the surrounding code (TypeScript, SCSS with BEM). `.editorconfig` sets whitespace.

## Commit and pull request etiquette

- Keep commit messages short and plain. Describe what changed, not how hard it was.
- Do not mix unrelated changes, formatting sweeps or dependency bumps into a feature pull request.
- Be kind in reviews. Critique the code, not the person.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE), and that you
have the right to submit them.
