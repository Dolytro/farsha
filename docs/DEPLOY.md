# Deploying Farsha (Vercel + Google Drive)

Farsha needs no server or database. The app is static; designs are saved to the signed-in
user's own Google Drive and shared through Drive's "anyone with the link" permission.

## Vercel

1. Import the GitHub repo in Vercel.
2. **Root Directory:** `apps/site` (keep "Include source files outside of the Root Directory" on,
   because the site imports workspace packages). One project serves the landing site at `/` and the
   editor at `/app`.
3. Framework preset: Next.js. **Build Command:** `pnpm build` (override on); it builds the editor
   (`apps/web`) and copies it to `apps/site/public/app` before the Next.js build. Vercel detects pnpm
   from `pnpm-lock.yaml`. Do not import `apps/api` or `apps/web` as separate projects.
4. Add environment variables (Production):
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_GOOGLE_API_KEY`
5. Deploy. `apps/site/next.config.mjs` rewrites `/v/<fileId>` and `/app/v/<fileId>` to the editor, so share
   links open the viewer.

## Google Cloud (one time)

1. Create a project and enable the **Google Drive API**.
2. **OAuth consent screen:** User type External. Add the scope
   `https://www.googleapis.com/auth/drive.file` (non-sensitive, no verification needed).
   Publish the app (**In production**); in "Testing" tokens expire after 7 days.
3. **Credentials → OAuth client ID → Web application.** Authorized JavaScript origins:
   - `http://localhost:5173` (local development)
   - your production URL, e.g. `https://farsha.org`

   Vercel preview URLs change per deployment and are not covered; use the production URL.
4. **Credentials → API key.** Restrict it to *HTTP referrers* (your production URL and
   `http://localhost:5173/*`) and to the *Google Drive API*. It is used to read files that
   their owner shared with a link, without the viewer signing in.

Both IDs end up in the browser bundle, so neither is a secret. Never add a client secret.

## Local development

```bash
cp apps/web/.env.example apps/web/.env.local   # then fill in the two values
pnpm dev
```

## How sharing works

- *Save to Drive* creates `<name>.farsha` (a Yjs document) in the user's Drive.
- *Share → Anyone with the link can view* adds a `reader`/`anyone` permission to that file.
- The link `/v/<fileId>` (optionally `?mode=inspect` for Dev Mode and code) downloads the file
  with the API key and opens it read-only.
- Turning the checkbox off removes the permission, so the link stops working.
- Not supported by Drive links: passwords, expiry dates, live cursors.

## Troubleshooting

- **Vercel build fails at `pnpm install` with `ERR_PNPM_IGNORED_BUILDS`:** pnpm 12 refuses to
  install when a dependency has an unapproved build script. `pnpm-workspace.yaml` therefore lists
  `allowBuilds` for `esbuild` and `@parcel/watcher`. If a new dependency needs a build script, run
  `pnpm approve-builds` and commit the change.
- **Google sign-in says "Access blocked / has not completed the Google verification process":**
  the OAuth consent screen is in *Testing*, where only listed test users can sign in. Publish it
  (Google Auth Platform → Audience → Publish app). Publishing needs the home page, privacy policy
  and terms links on the Branding page; this app serves them at `/privacy.html` and `/terms.html`.
  With only the non-sensitive `drive.file` scope and no logo, no Google verification is required and
  any Google account can sign in. Viewers of shared links never need to sign in to view.
- **Changing `VITE_*` variables on Vercel** requires a new deployment (they are baked in at build time).

## Live site

Production: https://farsha.org (Vercel project `farsha` in the Dolytro team, root directory `apps/site`).
