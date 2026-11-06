# Farsha: handoff (read this first on a new machine)

This file is the full context of the work so far, so a new Claude Code session (or a person) on another
PC can continue exactly where this one stopped. It covers what Farsha is, how the owner likes to work,
how the code is organised, how to run and test it, how it is deployed, what was decided and why, what is
done, and what to build next.

Last updated: 2026-10-29 (end of the long autonomous session; see section 11 for exactly where it stopped). Repo: https://github.com/Dolytro/farsha (branch `main`).
Live site: https://farsha.org

---

## 1. TL;DR

- **Farsha** is a free, open source, Figma-like design tool (UI/UX design, Dev Mode handoff, share links).
- Stack: React 19 + Vite + TypeScript, Zustand, SCSS (BEM), SVG renderer, Yjs document model, pnpm + Turborepo.
- No backend: the site is static (Vercel). Designs are saved to the signed-in user's **own Google Drive**
  (`.farsha` files, Yjs update bytes). Public view links read the Drive file with an API key.
- The owner wants it to feel **exactly like Figma** so long-time Figma users are not confused.
- Everything is on `main`, typecheck and all tests pass (538 tests at the time of writing: web 251, design-core 122, canvas-engine 141, code-generator 24).
- Next up: the open items listed in section 11 ("Done in the night run" > Still open) and `docs/FEATURE_GAP.md`.

**To continue on a new PC:** clone, install, create `apps/web/.env.local`, run the dev server (section 5).
Then tell Claude Code: "Read docs/HANDOFF.md and CLAUDE.md, then continue with the next feature."

---

## 2. How the owner works (rules for any assistant)

These came directly from the owner (they write in Bengali + English, "Banglish"; reply in Banglish).

1. **One feature at a time.** Build it, run `pnpm typecheck` and `pnpm test`, test it in the real browser,
   fix every issue found, and only then commit and push. Never batch features into one push.
2. **Figma parity.** Copy Figma's names, shortcuts, panel layout and click/drag behaviour. Check how Figma
   does it first. Where Farsha cannot match yet, record the difference in `docs/FEATURE_GAP.md`.
3. **Commits have no Claude attribution.** No `Co-Authored-By`, no "Generated with" lines, no mention of
   Claude. Author is the owner's normal git identity (set it globally, section 5). Plain messages.
   This overrides any default attribution a tool suggests.
4. **Never put secrets in the repo or in web forms.** `apps/web/.env.local` is git-ignored. Do not type API
   keys, tokens or passwords into any website field (the owner pastes those themselves). Do not create
   accounts or change security settings of Google, Vercel or Figma unless the owner explicitly asks.
5. **Do the work yourself where possible.** The owner is fine with the assistant driving the browser
   (Google Cloud Console, Vercel dashboard) once they are logged in, but anything needing a login, a 2FA
   step or a popup is theirs to do; stop and say so.
6. **Say what was verified and what was not.** Be honest about gaps (for example "could not test real
   Google sign-in, popups are not drivable by the browser tool").
7. After every push, check that the Vercel deployment is **Ready**.
8. Don't run two Claude sessions on the same folder at once (a scheduled task and an interactive session
   once overwrote each other's files). If `git status` shows changes you did not make, stop and ask.

---

## 3. Product goals and scope

Goal: workflow parity with Figma for normal UI/UX work, not feature-count parity.
Full original plan: `docs/PLAN.md` (written before coding, then revised). Key principles kept from it:

- One structured **design document model**; canvas, layers, properties, Dev Mode, export all read it.
- All mutations go through `DesignDoc` operations; undo/redo comes from the Yjs undo manager.
- The renderer is replaceable (SVG now; Canvas/WebGL later).
- Server-side permission checks matter whenever there is a server. Right now there is none: Google Drive
  enforces access, and the app never trusts a shared file (allow-lists, see section 7).

Out of scope for now: plugins, FigJam/Slides, AI features, enterprise features, branching.

---

## 4. Accounts and services (no secrets here)

| Thing | Details |
|---|---|
| GitHub | `Dolytro/farsha`, branch `main`. The `gh` CLI was logged in on the old PC. |
| Vercel | Project `farsha` in the Dolytro team (Hobby). **Root Directory = `apps/site`**, framework Next.js, build command `pnpm build`, "include source files outside root" on. Production domain `https://farsha.org`. Auto-deploys on every push to `main`. `apps/site/next.config.mjs` rewrites `/v/<fileId>` and `/app/v/<fileId>` to the editor (needed for share links). |
| Google Cloud | Project name Farsha (the project id is set when the new project is created; write it here), owned by the project owner's Google account. Drive API enabled. Google Auth Platform: External app "Farsha", **In production**, scope `drive.file` (non-sensitive, no verification needed), home page / privacy / terms links point to the live site. OAuth client "Web client 1" (authorised JS origins: `http://localhost:5173`, `http://localhost:5174`, `https://farsha.org`). API key "Farsha Drive key": restricted to Drive API and to those three origins as HTTP referrers. |
| Env vars | `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_API_KEY`. Set in Vercel (Production) and in `apps/web/.env.local` locally. Both end up in the browser bundle, so neither is a secret, but the key stays out of git. Find the values in Google Cloud Console → APIs & Services → Credentials. |
| Public pages | `/privacy`, `/terms` (`apps/site/src/app/privacy`, `terms`), required by the Google consent screen; `/privacy.html` and `/terms.html` redirect to them. |

If the production origin ever changes, add it to the OAuth client's authorised origins and to the API key's
referrers, then redeploy (Vite bakes env vars in at build time).

---

## 5. Setting up on a new machine

Prerequisites: Node 22+, git, a modern Chromium browser. Install pnpm 12: `npm install -g pnpm`.

```bash
git clone https://github.com/Dolytro/farsha.git
cd farsha
git config --global user.name  "Dolytro"
git config --global user.email "dolytro.contact@gmail.com"
pnpm install            # pnpm 12 needs the build approvals already in pnpm-workspace.yaml (allowBuilds)
cp apps/web/.env.example apps/web/.env.local   # then fill in the two values (section 4)
pnpm --filter @farsha/web dev                  # http://localhost:5173
```

Useful commands:

```bash
pnpm typecheck                         # all packages
pnpm test                              # vitest in every package
pnpm --filter @farsha/web build       # production build (what Vercel runs)
pnpm --filter @farsha/web exec vite --port 5174 --strictPort   # a second dev server on an authorised origin
```

- The editor is behind Google sign-in. For local testing open `http://localhost:5173/app/?nologin` (the editor is served under `/app`). That bypass
  only exists when `import.meta.env.DEV` is true, so it can never open the editor on the live site.
- If sign-in says "Access blocked", the Google account may not be allowed; the app is In production, so any
  Google account should work after a few minutes.
- Do not run `pnpm install` with a different pnpm major; the lockfile is pnpm 12.

---

## 6. Repository layout

```
apps/
  web/                React app (the whole product right now)
    public/           (the privacy and terms pages are now routes in apps/site/src/app)
    src/
      App.tsx         shell, login gate, global keyboard shortcuts, clipboard events
      store.ts        Zustand store (document, selection, viewport, tool, drive, toast, menu, ...)
      components/     Canvas, Layers, Properties, DevPanel, Toolbar, ContextMenu, DriveMenu, ShareDialog, LoginScreen
      drive/          google.ts (sign-in), drive.ts (REST calls), session.ts (save/open/autosave/shared load)
      figma/          kiwi.ts (decoder), convert.ts (Figma nodes -> layers), paste.ts (clipboard HTML -> layers)
      seed/           welcome.ts (default Farsha welcome canvas)
      clipboard.ts    copy/cut/paste logic, paste variants, copy/paste properties, paste SVG/images/layers
      svg-import.ts   SVG text -> layers (allow-list sanitiser)
      images.ts, place-image.ts   image reading, downscaling, asset URLs, placing images
      exporting.ts    Copy as PNG / SVG / CSS
      local-persist.ts, debounce.ts   working copy autosave to IndexedDB + restore on load
      text-layout.ts  browser text measurer + fitText (auto width / height of text layers)
      align.ts, auto-layout-actions.ts   align / distribute, "Add auto layout" (Shift+A)
      components/     also AlignRow, AppearanceSections (stroke, effects), FillSection, TypographySection,
                      AutoLayoutSection, ConstraintsSection, Rulers
      context-menu.ts, layers-tree.ts, pages.ts, actions.ts, route.ts   pure logic with tests
      styles/app.scss BEM styles, light Figma-like theme
  api/                placeholder Fastify app (unused; there is no backend by design)
packages/
  types/              node types (DOCUMENT, PAGE, FRAME, GROUP, RECTANGLE, ELLIPSE, TEXT, IMAGE, VECTOR)
  design-core/        DesignDoc (Yjs), defaults, auto-layout.ts (layout engine), constraints.ts, tests
  canvas-engine/      hit-test (groups), viewport/zoom, measure (Alt distances), fit, svg-export,
                      appearance.ts (stroke / fill / gradient / image / shadow markup shared by canvas and export),
                      text.ts (wrapping), resize.ts (8 handles), snap.ts (smart guides), ruler.ts
  code-generator/     CSS / HTML / React / Tailwind from a node
  ui/                 placeholder
docs/                 PLAN.md, FEATURE_GAP.md, DEPLOY.md, HANDOFF.md (this file)
```

---

## 7. Architecture and patterns (read before changing code)

### Document model (`packages/design-core`)
- `DesignDoc` wraps a Yjs `Y.Doc`. **Yjs is the single source of truth.** Nodes live in `Y.Map("nodes")`
  (each node a `Y.Map`), image bytes in `Y.Map("assets")`, root id in `Y.Map("meta")`.
- Child order uses a **fractional index** `orderKey` (`fractional-indexing`), so the tree is CRDT-friendly.
  Children are derived from `parentId` + `orderKey` (`doc.children(id)`), there is no `children[]` array.
- IDs are `nanoid`. `DesignDoc.fromState(bytes)` / `encodeState()` load and save the whole document.
- Operations: `createNode`, `deleteNode`, `setPosition`, `moveNode`, `resizeNode`, `rotateNode`,
  `reorderNode`, `reparentNode`, `setStyle`, `setText`, `rename`, `addAsset/getAsset`. All edits run inside
  Yjs transactions with origin `LOCAL_ORIGIN`, which is what the undo manager tracks.
- **Undo grouping pattern:** call `doc.stopCapturing()` before and after any multi-step edit (paste, drag
  end, group, import). The undo manager merges edits within 500 ms otherwise.
- Asset writes use their own origin so undo removes the layer but not the stored bytes.
- `doc.subscribe(fn)` / `doc.getVersion()` drive re-rendering; the store bumps `version` on every change.
- Node types are discriminated unions in `packages/types`; adding a node type means: types, defaults
  (`ALLOWED_CHILDREN`, names, defaults), Canvas render, `svg-export`, Layers icon, code-generator if relevant.

### Rendering (`apps/web/src/components/Canvas.tsx`)
- SVG renderer: recursive `renderNode`, selection/hover/handles/size pill/Alt-measure as an overlay inside the
  same `<g>` transform. Pan/zoom via a viewport `{x, y, zoom}` in the store.
- Wheel zoom uses a **native non-passive** listener so Ctrl+wheel/pinch zooms only the canvas, never the page.
  `html, body` are `overflow: hidden`.
- Hit-testing (`canvas-engine/hit-test.ts`) returns the deepest visible, unlocked layer under the point
  (Figma would pick the top-level layer first; known difference).
- Text does not wrap or measure yet (text boxes have fixed widths; auto-width while typing is approximate).

### State (`apps/web/src/store.ts`)
Zustand. Notable slices: `doc`, `pageId`, `version`, `tool`, `devMode`, `viewer` (read-only share mode),
`selection`, `viewport` (remembered per page), `drive` (user, file, save status), `toast`, `menu`, `renaming`.
`loadDoc(doc)` swaps the open document. Components read with `useEditor(...)` and call `useEditor.getState()`
in event handlers.

### Clipboard (`App.tsx` + `clipboard.ts`)
- Uses real `copy` / `cut` / `paste` **events** (no permission prompts, works across tabs).
- Farsha layers are copied as text `farsha:{json}` (subtree props without ids). The paste event does not
  carry modifier keys, so a keydown handler "arms" the paste mode (`offset`, `over`, `replace`) first.
- Paste priority: Farsha payload, then Figma HTML, then SVG, then image file, then plain text.
- Dev Mode: Ctrl+C copies the selected layer's CSS. Ctrl+Shift+C = Copy as PNG (async, toast shown).
- Copy/paste properties (Ctrl+Alt+C / Ctrl+Alt+V) are kept in memory only, like Figma.

### Importers and exporters (security matters here)
- **SVG import** (`svg-import.ts`): a small tolerant XML reader (no DOM). `rect/circle/ellipse/text` become
  native layers; `path/polygon/polyline/line` become `VECTOR` layers whose `markup` is rebuilt from an
  allow-list (`d`/`points` validated by regex, fixed attribute set). Scripts, handlers, `<use>`, `<image>`,
  styles and filters are dropped. VECTOR markup is rendered with `dangerouslySetInnerHTML`, so this
  allow-list is the security boundary; keep it strict and keep the tests.
- **Figma paste** (`figma/`): clipboard HTML contains `(figmeta)base64(/figmeta)` and `(figma)base64(/figma)`.
  The buffer is a `fig-kiwi` archive: 8-byte magic, uint32 version (106 seen), then length-prefixed chunks.
  Chunk 0 = Kiwi **binary schema** (deflate-raw), chunk 1 = data message (**zstd**, magic `28 B5 2F FD`;
  older Figma uses deflate-raw). `kiwi.ts` parses the schema generically and decodes `Message`;
  `convert.ts` maps `nodeChanges` (FRAME, TEXT, RECTANGLE, ELLIPSE, GROUP, vector nodes with
  `vectorNetworkBlob` or `fillGeometry`) to layers. Positions are canvas coordinates, so the block is
  re-centred on the viewport. Gradients become their first stop, images a grey placeholder, auto layout /
  components / effects are dropped. Verified against a real 66-node paste from the owner's file. Group
  coordinate semantics and `fillGeometry` blobs were not seen in a real sample yet.
  Dependency: `fzstd` (pure JS zstd).
- **Images** (`images.ts`): PNG/JPEG/WebP/GIF only; larger than 2048 px are scaled down and re-encoded;
  stored inside the document (`assets` map) so the `.farsha` file is self-contained. Rendering and SVG
  export only accept those mime types.
- **SVG export** (`canvas-engine/svg-export.ts`): used by Copy as SVG/PNG; embeds images as data URLs.

### Google Drive and sharing (`apps/web/src/drive/`)
- Sign-in: Google Identity Services **token model** (popup, ~1 hour access token in `sessionStorage`).
  No client secret, no backend. Scope `drive.file` only, so the app sees only files it created.
- Save: multipart upload of `doc.encodeState()` as `<name>.farsha` with `appProperties.farsha = 1`
  (used to list files). Autosave 2 s after a change once the file exists.
- Share dialog: "Anyone with the link can view" adds a Drive `reader`/`anyone` permission. Links are
  `/v/<driveFileId>` (view only) and `/v/<id>?mode=inspect`.
- Viewer: loads with the **API key** (public files); falls back to the owner's token only for unshared files.
  Public view shows no measurements or code; Inspect requires Google sign-in (Dev panel, Alt measure).
- No login gate: the editor opens straight away as a guest (working copy in the browser). Google sign-in is only for saving to Drive and sharing.
- Not possible with Drive links: passwords, expiry, live cursors.

### Appearance, text, layout (added later)
- **Fills / strokes / effects:** `Paint` is SOLID | GRADIENT_LINEAR | GRADIENT_RADIAL | IMAGE (`packages/types`).
  `shapeMarkup()` in `canvas-engine/src/appearance.ts` builds fill, gradient / pattern defs and inside / center / outside
  strokes (clip / mask trick) for rectangles, frames and ellipses; `effectsFilter()` builds the SVG filter for drop /
  inner shadow and layer blur. Canvas and SVG export both call them, and everything is re-validated there because a
  shared file is untrusted (hex regex, allow-listed mime types, safe ids).
- **Text:** `layoutText()` (canvas-engine) splits into lines (hard breaks + wrapping) using an injected `Measure`.
  The browser passes `canvasMeasure` (canvas 2D), exports without one use an estimate. `textAutoResize` is
  WIDTH_AND_HEIGHT (default when missing) | HEIGHT | NONE; `fitText()` applies it after every text / size change.
- **Auto layout:** frame props `layoutMode`, `itemSpacing`, `padding*`, `primaryAxisAlign`, `counterAxisAlign`,
  `primarySizing` / `counterSizing`. `DesignDoc` re-lays out all auto layout frames (innermost first) in a Yjs
  `afterTransaction` handler for LOCAL_ORIGIN transactions only, so it merges into the same undo step and undo / redo /
  remote changes never trigger it. Manually resizing such a frame turns that direction FIXED.
- **Constraints:** `constraintH` / `constraintV` on a layer; `DesignDoc.resizeNode` on a non-auto-layout frame moves /
  resizes its children (recursively) via `applyConstraints`.
- **Persistence:** see `local-persist.ts` (IndexedDB working copy, restored on load); Drive remains the sharing path.
- **Rulers / guides:** `rulers` flag in the store (localStorage); guides are `PageNode.guides` so they save and undo.
- **Selection:** `hitTest` returns the outermost GROUP; `deep=true` returns the innermost layer (double-click enters).

### Components
- No new node types: a **main component** is a `FRAME` with `isComponent: true`; an **instance** is a `FRAME` with
  `componentId` (the main's id). Every layer inside an instance has `mainId` (the layer it mirrors) and `overrides`
  (property names the user changed, which stop following the main). Nested instances are not supported (they flatten).
- `DesignDoc.syncInstances()` runs in the same `afterTransaction` handler as the auto layout relayout (LOCAL_ORIGIN only,
  skipped for empty transactions), before it. It reads Yjs directly (`rawChildren`) because the node / child caches are
  stale while the transaction is still being cleaned up. It clones missing layers, deletes removed ones, copies every
  non-overridden property, and strips the link when the main is gone or the instance sits inside its own main.
- `setProps` records overrides on layers that have `mainId` / `componentId` (not for constraint-driven moves, `noOverride`).
- API: `createComponent(ids)`, `createInstance(componentId, parentId, x, y)`, `detachInstance`, `resetOverrides`, `instanceOf`.
  Web: `component-actions.ts`, shortcuts Ctrl+Alt+K / Ctrl+Alt+B, context menu items, copying a main yields an instance (`clipboard.ts`).

### Conventions
- Pure logic goes in small modules with vitest tests next to them (`*.test.ts`); components stay thin.
- Styles: SCSS with BEM (`.layers__item--selected`), design tokens as CSS variables, light Figma-like theme
  (`--c-accent: #0d99ff`). Selection blue, red `#f24822` for measurements.
- Prefer editing existing modules; keep new files small. No comments that restate the code.
- Shortcuts live in `App.tsx`'s keydown handler (order of the `else if` chain matters: Dev Mode is read-only
  and sits before the editing branches).

---

## 8. Testing playbook

- Unit: `pnpm test` (vitest; `apps/web` tests run in a Node environment, so no DOM; keep browser-only code
  out of the tested modules or test it in the browser).
- Browser: run the dev server and open `?nologin`. The built-in Claude browser pane works; tips learned:
  - Synthesize events with JavaScript: `new ClipboardEvent("paste", { clipboardData: dt })` with a
    `DataTransfer`, `new KeyboardEvent("keydown", {...})`, `DragEvent` for drops. Real `Shift+key` combos
    from the automation tool arrive without the shift flag, so dispatch them from JS.
  - `navigator.clipboard.read/write` fail when the pane is not focused; stub `navigator.clipboard.write`
    to capture what the app writes.
  - The pane's screenshots can lag one step behind; confirm state with DOM queries (`querySelector`, text).
  - Screenshot coordinates are in a scaled frame; click with refs (`find` / `read_page`) or convert
    `getBoundingClientRect() * 800 / innerWidth`.
  - Vite's file watcher sometimes misses edits on Windows: `touch` the changed files and reload with a
    new query string if served code looks stale. Dynamic `import('/src/store.ts')` in the page can create a
    second module instance, so don't use it to read app state.
  - A hidden pane tab can stall canvas/image decoding; front the tab (`tabs_select`).
  - Google sign-in popups cannot be driven by the tool; the owner tests real sign-in and Drive themselves.
- Capturing a real Figma clipboard sample (done once): in the Figma tab add a `window` `copy` listener that
  stores `clipboardData.getData("text/html")`, select a layer in the layers panel, then
  `document.execCommand("copy")`. Figma's CSP blocks posting data to localhost.
- Google Cloud Console automation is flaky (layout shifts, stale screenshots). Use `find`/`read_page` refs,
  DOM reads and `getBoundingClientRect` based coordinates, and verify by reloading the page.

---

## 9. Keyboard shortcuts implemented (Figma-compatible)

Tools: `V` move, `H` hand, `F` frame, `R` rectangle, `O` ellipse, `T` text. `Esc` deselect.
Edit: `Ctrl+Z`, `Ctrl+Shift+Z`/`Ctrl+Y`, `Ctrl+D` duplicate, `Delete`, arrows (+Shift = 10), `Ctrl+A`,
`Ctrl+G` / `Ctrl+Shift+G`, `[` `]` (+Ctrl for back/front), `Ctrl+C/X/V`, `Ctrl+Shift+V` paste over selection,
`Ctrl+Alt+Shift+V` paste to replace, `Ctrl+Alt+C/V` copy/paste properties, `Ctrl+Shift+C` copy as PNG,
`F2` / `Ctrl+R` rename, `Ctrl+Shift+L` lock, `Ctrl+Shift+H` hide.
View: `Shift+0` 100%, `Shift+1` fit all, `Shift+2` fit selection, `+` `-`, `Ctrl +/-/0`, `Page Up/Down`
switch page, `Shift+D` Dev Mode, hold `Alt` + hover for distances. Space-drag / middle mouse pans.
Right-click opens the context menu.
Added later: `Alt+A / H / D / W / V / S` align left / h-centers / right / top / v-centers / bottom, `Shift+A` add auto
layout, `Ctrl+Alt+Shift+A` remove it, `Shift+R` rulers, hold `Ctrl` while moving to turn snapping off, Shift / Alt
while resizing keep ratio / resize from the centre, double-click a group to enter it, Enter in the text editor adds a
new line (Esc leaves).

---

## 10. History (what happened, in order, and why)

1. Reviewed the original plan (`PLAN.md`), agreed on: Fastify (later dropped: no backend), Yjs as source of
   truth, fractional-index ordering, replaceable SVG renderer, a small vertical slice first.
2. Scaffolded the monorepo. Two implementations of the document model existed briefly (an interactive
   session and a scheduled run wrote in parallel); merged to the richer `DesignDoc` and deleted the other.
3. Restyled the UI to match Figma UI3 after inspecting the owner's Figma file in the built-in browser
   (light theme, Pages/Layers left, Design/Dev panel right, floating white toolbar, selection handles, size pill).
4. Dev Mode (inspect + CSS/HTML/React/Tailwind), Alt-hover measurements, zoom/fit/group/order shortcuts.
5. Sharing: owner wanted zero-cost hosting with their own domain-free setup. Chosen: Vercel + Google Drive.
   Hurdles: Google Cloud needed 2-Step Verification on the right account; the first attempt used the wrong
   Google account; publishing the OAuth app needed home/privacy/terms links (added `/privacy.html`,
   `/terms.html`); pnpm 12 failed on Vercel until `allowBuilds` was added.
6. Product decisions from the owner: editor opens without login (sign-in only for Drive save and share); shared links public for viewing;
   Dev tools / Inspect only after Google sign-in; browser zoom must never scale the app; the default canvas
   must be Farsha's own welcome content (an earlier Envato/ThemeForest sample was removed).
7. Wrote `docs/FEATURE_GAP.md` by reading Figma's live File/Edit/View/Object/Preferences menus.
8. Built the whole copy/paste family one feature at a time (details in section 7), including a new VECTOR
   layer type, SVG paste, Figma paste and images.
9. A scheduled 4 PM run then added: right-click context menu, rename / lock / hide, layers drag-reorder +
   expand/collapse + search, and pages (add, rename, delete, switch). Those four were built by that run and
   are on `main` with passing tests; they were not re-checked in a browser by the session that wrote this file.

---

## 11. Status and what to build next

Done: see the ✅ rows in `docs/FEATURE_GAP.md` (canvas tools, selection, resize, undo, group, order, zoom,
Dev Mode, Alt measure, Drive save/open/autosave, share links and viewer, login gate, copy/paste family,
Copy as PNG/CSS/SVG, SVG/Figma/image paste, context menu, rename/lock/hide, layer reorder, pages).

Done since the 4 PM run (each pushed separately; details and remaining gaps per feature in docs/FEATURE_GAP.md):
stroke position and effects (drop / inner shadow, layer blur), text controls, gradient fills, image fills,
independent corner radius, blend modes, align and distribute, resize from all 8 handles (Shift / Alt), snapping and
smart guides, multi-line / wrapping text (auto width / height / fixed), auto layout v1, constraints, rulers and
guides, working copy kept in the browser, and fixes for three designer reports (group selection, context-menu paste,
font-size not growing the text box).

Done in the autonomous run after that (2026-10-30, each pushed separately and listed in docs/FEATURE_GAP.md): components
v1 + Assets tab, duplicate fix (Ctrl+D copies the subtree), Line / Arrow / Polygon / Star, multiple fills, editable hex,
Export (PNG / JPG / SVG), selection navigation (Enter, Shift+Enter, Tab, inverse), flip, save / open local .farsha files,
file rename, colour styles and text styles, command palette (Ctrl+/), frame selection, fill container for auto layout
children, zoom to next / previous frame, prototype v1 (click -> navigate, Present), version history (browser only),
Pen tool. Later in the same run: mask (Ctrl+Alt+M), colour variables with modes, variants, multiple strokes, layout grids
(Shift+G), vector point editing, boolean operations (polygon-clipping dependency), component properties (boolean / text),
light / dark / system theme, rotate handles, Dev Mode export, Dev CSS for fill container, per-side padding, auto layout
wrap and absolute position.

Done in the night run (2026-10-30 to 10-31, each feature pushed separately, rows in docs/FEATURE_GAP.md section 10):

- **UI v2 (Part A):** every native `<select>` is now the shared `components/Select.tsx` (custom dropdown: roomy rows,
  check mark, keyboard, flips near the window edge, dark theme; its closed state only stops propagation for
  ArrowUp / ArrowDown / Enter / Space so shortcuts keep working). `styles/ui-v2.scss` (imported after app.scss in
  `main.tsx`) holds the design tokens (`--field-h`, `--row-h`, `--radius`, `--panel-w`, `--c-*`), the interface presets
  (`:root[data-ui="figma|compact|comfortable|contrast"]`, stored in localStorage via `prefs.ts`, picked in Preferences,
  the command palette and the main menu) and the refined panel, dialog, menu and toolbar styles.
- **Main menu** (hamburger, `components/MainMenu.tsx` + `main-menu.ts`): File, Edit, View, Object, Text, Arrange, Vector,
  Preferences. It is built from command ids (`item("id")` silently skips commands that do not exist), so adding a command
  to `commands.ts` and naming it in `main-menu.ts` is all it takes. Submenus anchor to their own row (`.mainmenu__list > li`
  is `position: relative`).
- **Commands:** `buildCommands()` in `commands.ts` is the single registry (palette, menu, shortcuts text). Keyboard handling
  still lives in the `App.tsx` keydown chain, where the ORDER of the branches matters (for example Shift+S Section and
  Shift+P Pencil are before the plain-key `KEYS` map).
- **Object / Arrange / Text actions:** `object-actions.ts`, `arrange-actions.ts`, `text-actions.ts`, `section-actions.ts`,
  `scale.ts` (Scale tool K), `find.ts` (Ctrl+F), `colors.ts` (Selection colors), `vector-actions.ts` (Join, Smooth join,
  Simplify), `pdf-export.ts` (print-ready HTML, one named `@page` per frame), each with a `.test.ts`.
- **Features:** Sections, Scale tool, Find / Find and replace, Comments (stored in the document, `ASSET_ORIGIN`, not undoable),
  Export dialog and Place image, advanced strokes (dash, caps, joins, arrowheads, per-side weights), corner smoothing,
  background blur (canvas + CSS only), page background, Selection colors, Flatten (Ctrl+E), Outline stroke (Ctrl+Shift+O),
  Pencil (Shift+P), Slice (S, export crops the page to the slice box), View > Outlines (Ctrl+Shift+Y) and Panels (Alt+1 / Alt+2),
  Delete contents, Export frames to PDF (browser print dialog), Dev Mode status + annotations + variables as CSS custom
  properties, Compare changes (Version history), Prototype triggers (hover, drag, after delay, key), Open link, overlays,
  transitions, flow starting point and device frames, shadow spread, text lists / direction / link, Edit > Select all with
  and Set default properties, Styles and Export on the page panel.
- **Engine additions** (`packages/canvas-engine`): `pencil.ts` (RDP simplify + Catmull-Rom handles), `pen-ops.ts`,
  `boolean.ts` gained `flattenShapes` / `outlineStrokeShape`, `appearance.ts` gained `smoothedRectPath`, per-side strokes
  and `backgroundBlurOf`. `DesignDoc` gained `patchNodes`, comments and `pageBackground` / `setPageBackground` (per page,
  stored in the `meta` map).
- **Owner's QA report** (Google Doc "farsha Report.", answered one by one, table in docs/FEATURE_GAP.md section 11): connector arrows and a
  Preview button for prototypes, a drag no longer dies when the layer under the pointer is re-rendered (pointer capture is on the
  canvas svg, `Canvas.tsx`), comments close on an outside click, collapse-all-layers button, double click a layer to go to it,
  PDF in the Export section (`exportAs` in `pdf-export.ts`), lock proportions (`lockAspect`), auto layout picks row / column from the
  overlap of the boxes (`guessDirection`), layout grid defaults like Figma, long menus scroll (submenus are `position: fixed`),
  text variables (`ColorVariable.kind = "STRING"`, `bindTextVariable`, `textVariableId`), the Actions palette grouped by category
  (`command-categories.ts`), video layers (`videoAssetId` on a rectangle, `video.ts`, MP4 / WebM up to 25 MB, plays in the
  prototype). Items 4 (needs the screenshot) and 13 (owner) are still open.
- **Feature round 1** (10 small features, each with tests; rows in docs/FEATURE_GAP.md): keyboard shortcuts cheat sheet (Ctrl+Shift+?, `shortcut-list.ts`, `ShortcutsDialog`), recent actions and page / layer search in the palette (`recent-actions.ts`, `palette-search.ts`), layers panel type filter (`layerKind` in `layers-tree.ts`), three preferences (rename duplicated layers `copy-name.ts`, keyboard zoom into selection `zoomKeyboard`, Ctrl+click menu), automatic versions every 10 minutes (`auto-version-policy.ts`, `auto-versions.ts`; test hook: localStorage `farsha.autoVersionMs`), auto layout min / max sizes (`clampSize` in design-core `auto-layout.ts`, "Size limits" section) and Duplicate page (`pages.ts`).
- **Feature round 2** (branch `features-round-2`, each checked in the browser): Shift+Backspace for Delete and heal, Shift+N / N zoom to previous / next frame confirmed, Preferences > Use smart quotes (`smart-quotes.ts`, hooked into the text editor `onChange` in `Canvas.tsx`; a quote typed over a selection stays straight), Preferences > Use Ctrl+Alt+arrows to rotate (`arrowRotation` in `object-actions.ts`), Select all matching properties (Ctrl+Alt+A) confirmed already done, Flip objects while resizing (`resizeBoxFlip` in canvas-engine, default on), Hide canvas UI during changes, View > Minimize left bar and Toggle variables panel, Variables export / import JSON (`variable-json.ts`), component descriptions (`description` on a main, shown in Assets) Assets search (`asset-search.ts`) and colour picker HSB / CSS modes (`parseCssColor` in `color-math.ts`), Dev Mode box model (`box-model.ts`), Present: R restarts and a click on nothing flashes the hotspots (`Presenter.tsx`), and text decoration style (`textDecorationStyle`: solid, dotted, wavy; `textFontStyle` in canvas-engine, Typography > Decoration style). Next candidates: Title case is done, small caps is not (needs a font variant in the `Measure` interface); more rows in FEATURE_GAP section 12.2.
- **Still open** (all listed in FEATURE_GAP.md): rich text sizes, colours and fonts per run (bold, italic, underline and strikethrough per run exist: `TextRun`, `lineSegments`), Slots,
  (the selected point of a path being edited lives in the store as `editingPoint`; Delete
  and heal and Split vector already use it), Home / End frame stepping, Switch to Draw, Paste to
  replace on Ctrl+Shift+R (the browser reserves it), SVG / PNG export of background blur. Anything that needs a server
  (live cursors, mentions, branching, team libraries) is documented as such.
- **Testing gotchas learned:** never trigger `window.print()` from a Playwright-driven headed browser without stubbing it (it
  opens a native dialog and the MCP server hangs); `apps/web` vitest has no DOM, so anything importing the Zustand store or
  `commands.ts` cannot be unit-tested there (test the pure module instead); `indexedDB.deleteDatabase("farsha")` plus a
  reload gives a clean canvas, which still contains the starter board (Hero card, Mobile card, Avatars; `seed/welcome.ts`), so draw test layers in
  empty space (a frame drawn on top of them becomes a nested frame, not a top-level one). The starter board is the one from the Farsha UI design canvas and the page background is set to #0e0d14.

Where the session stopped (before the night run): everything above is committed and pushed to `main`, typecheck and all tests pass. Nothing is
half-done in the working tree. Each feature was tested in the real browser with Playwright (dev server on 5173, `?nologin`);
real Google sign-in, Drive rename and the Vercel look of the newest commits were not re-checked. Tip: the working copy is
restored from IndexedDB, so wait about 1.5 s after loading before driving the page, and reset it with
`indexedDB.deleteDatabase("farsha")` for a clean test.

Suggested order (each is one feature = build, test, fix, push):
1. **Components round 2** (variants done: `addVariant`, `swapInstanceVariant`, `componentSetId` / `variantProps`): instance-swap component properties, nested instances, instance swap, overrides kept when copying an instance. (Round 1, main +
   instances + overrides + detach, is done, see "Components" in section 7.)
2. Effect / grid / stroke styles, number / string variables, several collections and per-frame modes (colour variables with modes are done: `DesignDoc.createColorVariable`, `bindPaintVariable`, `SolidPaint.variableId`, synced in `syncVariables`) (color and text styles done, `textStyleId`, `TEXT_STYLE_KEYS`; color: `DesignDoc.createFillStyle` etc., `fillStyleId` on layers, synced in `syncStyles`).
3. Editable (non-flattened) boolean groups, editing imported SVG vectors, flatten, outline stroke, mask (Ctrl+Alt+M), boolean operations.
4. Auto layout round 2 (wrap, absolute position done): min / max sizes, drag to reorder;
   snapping while resizing and to layout grids, equal-spacing guides (layout grids themselves are done).
5. Prototype round 2 (hover / key triggers, overlays, transitions, connectors), comments and live collaboration (need a backend or a relay such as y-webrtc), Drive-backed version history.
6. Performance: Canvas / WebGL renderer path for thousands of nodes.
Also still unchecked in a real browser: layers panel drag-reorder / reparent (only unit-tested), real Google sign-in
and Drive from the new autosave path.

Working copy persistence: `apps/web/src/local-persist.ts` saves the open document to IndexedDB (database `farsha`,
key `current`) 0.8 s after every change and on tab hide, and restores it on load, so a reload never loses work even
when it was never saved to Drive (Drive file id and name are restored too, so Drive autosave resumes). While testing
in the browser the editor therefore starts from your last session, not from the welcome canvas: run
`indexedDB.deleteDatabase("farsha")` and reload to reset it.

Browser testing tips added: the Vite watcher on Windows sometimes serves stale modules, so `touch` the changed
files and reload with a new query string. Synthetic pointer events must go to the `<svg>` (the handlers live there,
not on `<main>`), and `Element.prototype.setPointerCapture` must be stubbed because the fake pointer id makes it throw.

Known gaps and risks to keep in mind:
- Click selects the outermost group and double-click enters one level (like Figma). Inside frames the deepest layer is still picked directly.
- Vectors from SVG cover the whole viewBox (no tight bounding box); SVG / Figma paste still flatten gradients.
- Text wrapping in exports without a measurer uses an estimate, so lines can differ slightly from the canvas.
- The IndexedDB working copy is per browser; moving to another PC needs a Drive save first.
- The `.farsha` file grows with images (stored inline); fine for now, revisit with Drive assets.
- Access tokens last about an hour; the user must click to re-authorise.
- Figma paste: groups and `fillGeometry` blobs only validated by unit tests, not by a real sample.
- There is no CSP header on the Vercel site yet; consider adding one.

---

## 12. Starter prompt for the next session

```
Read CLAUDE.md and docs/HANDOFF.md, then docs/FEATURE_GAP.md. Run git status and git log -8. 
Check the live site (https://farsha.org) deployment is Ready. In the dev server (?nologin) check layer
drag-reorder in the layers panel, then start the next feature from section 11 of HANDOFF.md (Components).
Rules: one feature at a time (build, test, fix, push), copy Figma exactly, commits without any Claude
attribution, never put secrets in git or web forms. Reply in Banglish.
```

## Website (apps/site)

`apps/site` is a Next.js site (SCSS, BEM) served at `/`; the editor (`apps/web`, Vite, base `/app/`) is built and copied to
`apps/site/public/app` by `pnpm --filter @farsha/site build` (`scripts/build-all.mjs`), so one Vercel project serves both.
Share links are `/app/v/<fileId>` (old `/v/<fileId>` still works through a rewrite). the privacy policy and terms are pages at `/privacy` and `/terms`
(`apps/site/src/app/privacy`, `terms`). Vercel must use Root Directory `apps/site`, framework Next.js, build command `pnpm build`.
Design source: the Claude Design canvas "Farsha UI" (boards Landing2 and Loader). Landing v2 and the butterfly loader are
not ported yet: `apps/site/src/app/page.tsx` is a placeholder.

## Starter file (the Farsha UI design on the canvas)

A fresh editor opens `apps/web/public/starter.farsha` (Yjs state, ~860 KB, 178 KB gzipped): the five boards of the UI design canvas
(Editor, Files home, Loader, Landing page, Logo) as layers at the same canvas positions. `loadStarter()` in `seed/welcome.ts` fetches it;
`newWelcomeDoc()` (hero card, mobile card, avatars) is the offline fallback. A saved working copy that still holds only an earlier default
canvas (`isOldStarter`: the old two-frame canvas, or an earlier starter file recognised by its boards and layer count, kept in `OLD_STARTER_LAYER_COUNTS`; add the previous count there whenever the starter file is rebuilt) is dropped so the starter loads. Boards start folded in Layers (`collapseLayers`), the canvas skips layers outside
the window (`inView` in `Canvas.tsx`) and the first board is fitted on open.

How the file is made (not part of the build, run by hand when the design changes): every board's page is rendered in a 1440 px wide
iframe (the landing page in a 5400 px tall one, because the page lays itself out differently in a short window) and a DOM extractor
turns each element into a layer (boxes, gradients, borders, shadows, text, SVG), then `apps/web/scripts/build-starter.ts` writes the file
(bundle it with esbuild for node, `node build-starter.cjs <json dir> <out>`; `ONLY` and `NOFX` env vars build a subset or drop effects).
Things the extractor does on purpose: text is placed by the browser's own baseline and line breaks; elements with a real 3D transform
(the hero mockup, the plane in "Real tools") are projected with their matrix into vector polygons and placed text; gradients are
mapped onto the layer box (CSS ones are sampled premultiplied); dot grids, the animated gradient border of the compare table, glows of
boxes without a background and the hero shape are drawn once into PNG image fills; stacking order follows z-index; SVG shapes with
gradient fills become vector layers with real gradients. Not layers: animation, hover and scroll effects, masks, counters animate to
their final numbers. The extractor and the compare harness (editor at 100% against the live page) were scratch scripts, not in the repo.

## Rename to Farsha

The product is called Farsha (packages `@farsha/*`, file extension `.farsha`, GitHub repo `Dolytro/farsha`). There is no migration of data saved under any earlier name (nobody used it). The Google Cloud project is to be replaced by a new one, so the IDs in `apps/web/.env.local` and Vercel must be replaced too. The Vercel project and its address are farsha.org.
