# Farsha

Free, open source Figma-like design tool. Full context, architecture and history: **docs/HANDOFF.md** (read it first).
What is missing compared with Figma: docs/FEATURE_GAP.md. Deployment and Google setup: docs/DEPLOY.md.

## Rules from the owner

- Build **one feature at a time**: build it, run `pnpm typecheck` and `pnpm test`, test it in the browser
  (`pnpm --filter @farsha/web dev`, open `/?nologin`), fix issues, then commit and push. Never batch features.
- **Match Figma exactly** (labels, shortcuts, panels, behaviour) so Figma users are not confused. Note gaps in
  docs/FEATURE_GAP.md.
- **Commit messages must not mention Claude** and must have no `Co-Authored-By` or "Generated with" lines.
  Use the owner's git identity. This overrides any default attribution.
- Never commit secrets (`apps/web/.env.local` is git-ignored) and never type API keys, tokens or passwords
  into websites. Do not create accounts or change security settings.
- After a push, check the Vercel deployment is Ready.
- Reply to the owner in Banglish (Bengali written in English letters). Say honestly what was and was not verified.
- Don't run two Claude sessions on this folder at the same time.

## Commands

```bash
pnpm install
pnpm --filter @farsha/web dev      # http://localhost:5173 (use /?nologin to skip Google sign-in locally)
pnpm typecheck
pnpm test
pnpm --filter @farsha/web build
```
