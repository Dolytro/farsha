# Deploying Canvylo (Vercel + Google Drive)

Canvylo needs no server or database. The app is static; designs are saved to the signed-in
user's own Google Drive and shared through Drive's "anyone with the link" permission.

## Vercel

1. Import the GitHub repo in Vercel.
2. **Root Directory:** `apps/web` (keep "Include source files outside of the Root Directory" on,
   because the app imports workspace packages).
3. Framework preset: Vite. Vercel detects pnpm from `pnpm-lock.yaml`.
4. Add environment variables (Production):
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_GOOGLE_API_KEY`
5. Deploy. `apps/web/vercel.json` rewrites every path to `index.html`, so `/v/<fileId>` share
   links open the viewer.

## Google Cloud (one time)

1. Create a project and enable the **Google Drive API**.
2. **OAuth consent screen:** User type External. Add the scope
   `https://www.googleapis.com/auth/drive.file` (non-sensitive, no verification needed).
   Publish the app (**In production**); in "Testing" tokens expire after 7 days.
3. **Credentials → OAuth client ID → Web application.** Authorized JavaScript origins:
   - `http://localhost:5173` (local development)
   - your production URL, e.g. `https://canvylo.vercel.app`

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

- *Save to Drive* creates `<name>.canvylo` (a Yjs document) in the user's Drive.
- *Share → Anyone with the link can view* adds a `reader`/`anyone` permission to that file.
- The link `/v/<fileId>` (optionally `?mode=inspect` for Dev Mode and code) downloads the file
  with the API key and opens it read-only.
- Turning the checkbox off removes the permission, so the link stops working.
- Not supported by Drive links: passwords, expiry dates, live cursors.
