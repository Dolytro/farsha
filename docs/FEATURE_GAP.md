# Farsha vs Figma: feature gap

Status: ✅ done · 🟡 partial · ❌ missing. Priority: **P1** (needed to design real screens), **P2** (daily convenience), **P3** (later / optional).

Sources: items marked (menu) were read from Figma's live editor menus (File, Edit, View, Object, Preferences). The test file was view-only, so Edit and Object showed fewer items than a full editor; the rest comes from Figma's regular editor.

## 1. Tools

| Feature | Status | Pri |
|---|---|---|
| Move (V), Hand (H) | ✅ | |
| Frame (F), Rectangle (R), Ellipse (O), Text (T); ✅ drawn shapes are numbered like Figma (Rectangle 1, Rectangle 2, Frame 1; one past the highest number in the file; text, sections and slices keep their names; groups and frame selections are not numbered yet) | ✅ | |
| Scale tool (K) | ✅ | One layer at a time; keeps the ratio (Alt scales from the centre) |
| Section, Slice | ✅ | P3 |
| Line (L), Arrow (Shift+L) | ✅ | Drawn by dragging (Shift snaps to 15°), editable stroke colour / width, rotation, caps, joins, dashes and arrowheads (Stroke section). No handles on the line ends |
| Polygon, Star | 🟡 | Toolbar buttons, fill and stroke editable. ✅ Polygon sides (3 to 60) and Star points and ratio in the Design panel (for layers drawn with the tools). ✅ Corner radius for polygons and stars (a Radius field, in the 100 x 100 drawing units of the shape, so it scales with the layer). Missing: nothing in the tool |
| Image / video placement, paste or drop an image | ✅ | P1 |
| Pen tool (P) | 🟡 | Click for corner points, drag for curve handles, click the first point to close, Enter / double-click / Esc to finish, Backspace removes the last point; result is a vector layer with editable stroke and fill. Point editing done (Enter or double-click a pen path: drag anchors and handles, click the path to add a point, Alt+click or Delete removes one, double-click a point to switch corner / smooth; needs no rotation or flip). Pencil tool (Shift+P) done: drag to draw freehand, the stroke is simplified and smoothed into an editable pen path, a loop closes itself. Joining, splitting and boolean operations are done. Missing: editing imported SVG vectors |
| Comment tool (C) | ✅ | P2 (comments are stored in the document; no mentions or live notifications) |
| Color picker / eyedropper (I) (menu) | 🟡 | Eyedropper (I or Actions) picks a colour anywhere on the screen and applies it to the selection (copies it when nothing is selected); needs Chromium's EyeDropper API. Real screen picking could not be driven in the test browser (a stub was used). The custom colour picker with a spectrum is done (see Design panel). |
| Tool dropdowns with variants in the toolbar | ✅ | P2 (Move tools, Region tools, Shapes tools, Draw tools) |
| "Keep tool selected after use" setting (menu) | ✅ | Preferences |

## 2. Selection and editing

| Feature | Status | Pri |
|---|---|---|
| Click select, Shift multi-select, marquee | ✅ | |
| Move, resize from corners, nudge with arrows | ✅ | |
| Duplicate (Ctrl+D), delete, group / ungroup; ✅ Ctrl+D on frames lying on the page puts the copy 100 px to their right (several frames move together past the box round them; other layers keep the 10 px offset; an Alt+drag repeat still wins) | ✅ | |
| Bring forward / backward / to front / to back | ✅ | |
| Undo / redo | ✅ | |
| Copy, cut, paste (Ctrl+C / X / V), paste text | ✅ | |
| Paste over selection (Ctrl+Shift+V), paste to replace (Ctrl+Alt+Shift+V) | ✅ | |
| Paste a colour (#abc, #aabbcc, rgb(), hsl() as text) while layers are selected: it becomes their only fill (words like "bad" still paste as text; locked layers and layers without fills are skipped) | ✅ | |
| Copy / paste properties (Ctrl+Alt+C / V) (menu) | ✅ | |
| Copy as PNG (Ctrl+Shift+C); Dev Mode Ctrl+C copies CSS | ✅ | |
| Copy as SVG / CSS / PNG from the right-click menu | ✅ | |
| Paste SVG (shapes, text and paths become layers; no gradients or transforms beyond translate) | ✅ | |
| Paste layers copied in Figma (frames, text, shapes, vectors; no auto layout, components, images, effects) | 🟡 | |
| Paste images from the clipboard, drag and drop image files (PNG / JPEG / WebP / GIF; stored inside the .farsha file) | ✅ | |
| Image fills on shapes, crop, replace image | ✅ | P1 (Crop is Zoom and Move X / Y fields, no on-canvas handles) |
| Select all (Ctrl+A) | ✅ | |
| Select inverse (Ctrl+Shift+A), select all matching (Ctrl+Alt+A) | ✅ | Select none is Esc. Matching = same type, fills, strokes (and font for text) |
| Select children (Enter), select parent (Shift+Enter), Tab / Shift+Tab to next / previous sibling | ✅ | |
| Double-click to enter a group; Figma selects the top-level layer first | ✅ | P1 |
| Resize from all 8 handles, Shift = keep ratio, Alt = from center | 🟡 | All 8 handles (sides are invisible strips like Figma), Shift, Alt done. ✅ resizing several layers at once (select layers with the same parent: the box around them gets handles; positions and sizes scale together, Shift keeps the ratio, Alt resizes from the centre, one undo step). Missing: rotated layers, flipping when dragged past the opposite side, children scaling (constraints) |
| Rotate handle, rotate with Ctrl+Alt+arrows (menu) | 🟡 | Drag just outside a corner of a single layer to rotate it (Shift snaps to 15°), plus the numeric field. While a layer is rotated only the rotated outline shows (no resize handles; resize with the W / H fields). Missing: Ctrl+Alt+arrows, ✅ rotating several layers together (drag just outside a corner of the box around them, Shift snaps to 15°; layers must share a parent), ✅ resizing a rotated layer by its handles (it grows along its own sides with the opposite corner fixed on the canvas; no flipping or snapping while turned; a turned layer inside a turned frame is not corrected) |
| Flip horizontal / vertical (Shift+H / Shift+V) | ✅ | Several layers of one parent flip about the centre of the box round them (they swap places; a layer in an auto layout frame, or layers of different parents, flip about their own centres). In the Object menu and the Actions palette |
| Rename (F2 / Ctrl+R / double-click; ✅ double-click a frame's name above it on the canvas: the name box opens in the Layers list, not on the canvas itself), lock (Ctrl+Shift+L), hide (Ctrl+Shift+H); locked layers cannot be picked or nudged on the canvas | ✅ | |
| Snapping, smart guides, pixel snapping | 🟡 | Moving snaps to edges and centres of sibling layers and the parent frame, red guide lines, hold Ctrl to turn off. ✅ snapping while resizing (the dragged edges snap to other layers, the parent frame and ruler guides, with guide lines; Ctrl turns it off; not with Shift, Alt or on a turned layer). ✅ equal-spacing guides while moving (a layer between two others snaps so both gaps are equal, with the two gaps drawn as guide lines; edge alignment wins when it applies). ✅ Snap to pixel grid (Preferences switch, on by default: moving, resizing and drawing put edges on whole pixels; Ctrl turns it off for one move; a smart guide wins over it). Missing: distance labels while dragging |
| Align and distribute, Tidy up | 🟡 | Align (6 modes, Alt+A/H/D/W/V/S, panel row) and distribute spacing (panel buttons, 3+ layers) done. Tidy up (Ctrl+Alt+Shift+T) and distribute spacing (Alt+Shift+H / V) are done; a single layer aligns to its parent frame (nothing happens directly on a page, like Figma) |
| Boolean operations (union, subtract, intersect, exclude), flatten, outline stroke | 🟡 | Union / Subtract / Intersect / Exclude (Ctrl+Alt+U, context menu, Actions) on rectangles, ellipses, polygons, stars and pen paths; the result is one flattened vector (curves become straight segments) with the bottom shape's fill. Flatten (Ctrl+E, Object menu) merges shapes and the shapes inside groups and frames into one vector (curves become straight segments). Outline stroke (Ctrl+Shift+O) turns the stroke into a filled vector above the shape (round joins, round caps on open paths, inside and outside strokes cut to the edge). Missing: keeping the originals editable inside the result, text as input, mitre and bevel joins in the outline |
| Mask (Ctrl+Alt+M), frame selection (Ctrl+Alt+G) | ✅ | Mask: several layers are grouped and the bottom one masks the rest; one layer masks the layers above it; shape mask (alpha), also in SVG export. ✅ luminance masks (a Mask section with Mask type Alpha / Luminance on a mask layer; luminance works for rectangles, ellipses and frames and uses their own fills). Missing: outline-only masks |
| Right-click context menu (Figma items; read-only in Dev Mode; none on view links; submenu is a flat "Copy/Paste as" group; ✅ a "Select layer" group lists the layers under the pointer (up to 12, topmost first, shown when there are two or more; hidden and locked layers are left out); ✅ right-clicking empty canvas also offers Select all and Show / hide UI; ✅ right-click a row in the Layers list opens the same menu, selecting the layer first; "Paste here" pastes at the middle of the canvas) | ✅ | |
| Command palette "Actions" (Ctrl+/ or Ctrl+K) | ✅ | Search ~50 actions with their shortcuts (also works as a shortcut cheat sheet). Recent actions (the last 5, shown first) done. Searching pages and layers by name (type two letters, pick one to jump to it) done. Missing: plugins |
| Find (Ctrl+F), find next / previous (menu) | ✅ | Find, find and replace, next / previous (Enter, Ctrl+Shift+F / D) |
| Draggable layer reorder, drag to reparent (drop on a frame or group) | ✅ | |
| Layers panel: expand / collapse, search, lock icon, rename, ✅ selecting a layer (on the canvas, Tab, a share link) opens the folded layers above it and scrolls its row into view (folding a parent by hand afterwards is kept) | ✅ | |
| Pages: add, rename (double-click or right-click > Rename), right-click a page for Rename / Duplicate page / Delete page, ✅ the Pages list folds with the caret beside its title (remembered in this browser), duplicate (the ⧉ button, File menu or Actions; the copy lands after the original and keeps the page background), delete, switch (click, Page Up / Down); each page remembers its pan and zoom | ✅ | |

## 3. Design panel (right sidebar)

| Section | Status | Missing |
|---|---|---|
| Position | 🟡 | Rotation handle |
| Layout | 🟡 | Auto layout v1 done: Shift+A adds it (wraps loose layers in a frame, keeps their order / gap / padding), horizontal / vertical, gap, padding (horizontal + vertical), alignment on both axes, space between, hug / fixed sizing, flexbox CSS in Dev Mode. Fill container done (Resizing section: W / H of a child = Fixed or Fill container; Dev Mode CSS uses flex: 1 1 0 and align-self: stretch). Per-side padding done (T / R / B / L fields, shown automatically when the sides differ). Wrap done (Wrap button, gap between lines, flex-wrap in Dev Mode CSS; needs a fixed size in the layout direction). Absolute position done (Resizing section checkbox; the layer leaves the flow, also in the Dev Mode CSS). Min / max sizes done. ✅ Clip content checkbox on frames (Layout section; canvas, SVG export and Dev Mode CSS overflow). Missing: nothing big in auto layout. Previously missing:, min / max, nested resizing rules, drag to reorder inside a frame, layout grids, clip content toggle |
| Appearance | 🟡 | Independent corner radius done for rectangles and frames (not images). Blend mode (16 modes, no Pass through / Plus darker / Plus lighter) done. Corner smoothing done (approximate curve, canvas and SVG export; CSS export ignores it) |
Solid, linear and radial gradients, and image fills (upload, Fill / Fit / Stretch, opacity) (add / remove stops, position, opacity, angle) done. Gradient angle is in bounding-box units, so it skews on non-square layers. Gradient text works; ✅ gradient strokes (a Solid / Linear / Radial picker on every stroke, stops and angle like a fill; canvas and SVG / PNG export; Dev Mode CSS: an inside gradient stroke is a transparent border with the gradient on the border box; centred and outside ones show the first colour); SVG / Figma paste still flatten gradients. Multiple fills (stacked, listed top first; ✅ text too: it is drawn once per fill, canvas and SVG export) done. Hex input is editable (3 or 6 digits). Missing: tile / crop image modes, image filters, angular / diamond gradients, handles on canvas, styles, variables |
| Stroke | 🟡 | Color, opacity, weight, position (inside / center / outside) and multiple strokes (stacked, one weight and position for all; frames, rectangles and ellipses; a drawn vector keeps one) done. Dev Mode CSS shows the first stroke only. Missing: per-side weights, dash, caps, joins, arrowheads. |
| Effects | 🟡 | Drop shadow, inner shadow, layer blur, background blur (canvas and CSS backdrop-filter; SVG / PNG export does not blur the background) (hide / remove / change type) done. Shadow spread done (drop and inner, CSS box-shadow). Missing: show-behind, multiple blurs. Shadow offset rotates with a rotated layer. ✅ Dev Mode CSS: an outside stroke is an outline and a centred stroke is half border, half outline. |
| Typography | 🟡 | Content, font family (a short built-in list, system fonts only), weight names, size, line height, letter spacing, text align (left / center / right) done. Multi-line text (Enter = new line), wrapping, auto width / auto height / fixed (also set by dragging handles like Figma) done; wrapping uses the browser's canvas measureText, so very different fonts may wrap slightly differently in exports. Missing: Google Fonts, paragraph spacing, vertical align, decoration, case, truncate, lists, mixed styles inside one text box, text selection inside the editor styling |
| Selection colors | ✅ | Design panel lists every solid colour in the selection; edit one to change it everywhere |
| Export | 🟡 | Export section in the Design panel: PNG / JPG / SVG at 0.5x–4x, one file per layer, "@2x" file names. Also in the Dev panel. Missing: PDF, saved export settings per layer, suffix, multi-selection export, export frames to PDF |
| Constraints | 🟡 | Left / Right / Left & Right / Center / Scale (and Top / Bottom) for layers inside frames, applied when the frame is resized (also in nested frames). ✅ the clickable constraints diagram (lines for left, right, top, bottom and the two centre lines; the lists stay for Scale). ✅ groups scale their children when they are resized (by the handles or the W / H fields, nested groups too). Missing: children of auto layout frames |

## 4. Components and design system

| Feature | Status | Pri |
|---|---|---|
| Components, instances, detach, overrides | 🟡 | Create component (Ctrl+Alt+K, wraps non-frames), copy / paste a main component to get an instance, edits of the main flow into instances, property overrides kept per layer, Reset all overrides, Go to main component, Detach instance (Ctrl+Alt+B), purple layer icons. Assets tab (click to place an instance). Missing: drag from Assets, search in Assets, Alt-drag, instance swap, nested instances (they flatten), ✅ copying or duplicating an instance keeps the overrides of its layers, overrides on deleted / re-ordered layers (deleted layers come back, order follows the main), main component purple selection outline |
| Variants and component properties | 🟡 | Variants: add (copy into a set), properties with values per variant, instance picker. Component properties: boolean (show / hide a layer) and text (change a text layer) defined on the main component, set on instances, with defaults. Missing: instance-swap properties, number properties, ✅ a dashed component-set frame on the canvas (drawn round the variants of a set, with the set name and the variant count; it is not a layer you can select), ✅ keeping overrides when switching variants or swapping the component (layers are matched by name, type and place; layers with no match are rebuilt), properties on nested instances |
| "Main component" (Object menu) (menu) | ✅ | Create component |
| Color / text / effect / grid styles | 🟡 | Color (fill) styles and text styles (font family, weight, size, line height, letter spacing): create from a layer, apply, edit (every layer follows, also inside instances), rename, detach, delete, undo. Missing: effect and grid styles, stroke styles, ✅ every kind of style (colour, grid, effect, stroke, text) in the Styles list of the page panel with folders from a/b names; a styles list in the Assets tab is still missing, ✅ folders (components named like Button/Primary are grouped under a Button folder in the Assets tab, folders fold) |
| Variables (color, number, string, boolean) and modes (light / dark) | 🟡 | Colour variables with modes: create, rename, edit per mode, add / rename / delete modes, bind a solid fill or stroke (◆ button), switch the active mode (dialog or Actions: "Switch to next variable mode"), undo. ✅ several collections (a picker, + Collection, Rename and Delete at the top of the Variables dialog; each collection has its own modes, its own active mode and its own variables; a layer follows the active mode of its variable's collection; an explicit mode on a frame applies to the collection of that mode; aliases work across collections; JSON export covers the first collection only). ✅ variable names in Dev Mode code (the CSS, HTML, Vue and React tabs write `var(--name, #fallback)` for an opaque fill, stroke or text colour that follows a colour variable; Tailwind and the mobile tabs keep plain colours; ✅ number variables bound to width, height, corner radius, gap or font size are named too, in px, and listed in the :root block). Missing: variables in styles, gradients, padding / stroke weight / opacity names |
| Libraries, publish, update | ❌ | P3 |

## 5. Prototype

Prototype v1 done: Prototype tab with On click → Navigate to a frame or Back, and a full-screen Present (button, Ctrl+Alt+Enter, Actions) where clicking linked layers navigates, Backspace / ← goes back, Esc exits. Missing (P2): hover / drag / key triggers, overlays, scroll, transitions and smart animate, flows and a start point, connector arrows on the canvas, device frames, sharing a prototype link.

## 6. Dev Mode

| Feature | Status |
|---|---|
| Inspect size, position, colors, typography | ✅ |
| Copy CSS / HTML / React / Tailwind | ✅ |
| Alt-hover distances | ✅ |
| Asset export (SVG / PNG / JPG) from inspect | ✅ | Export section at the bottom of the Dev panel (same scales and formats as Design) |
| Ready-for-dev status, annotations, compare changes | ❌ |
| iOS / Android snippets, Code Connect, variables in code | ❌ |
| Spacing and padding visualization (box model) | ❌ |

## 7. View menu and canvas helpers

| Feature | Status | Pri |
|---|---|---|
| Zoom in / out / 100% / fit / selection, pan, canvas-only zoom; ✅ the zoom percentage above the Design panel opens a menu (Zoom in, out, fit, selection, 50%, 100%, 200%) | ✅ | |
| Zoom to next / previous frame (N / Shift+N) | ✅ | Home / End missing |
| Pixel grid (Shift+') and pixel preview (menu) | 🟡 | Pixel grid from 800% zoom (Shift+' or Actions). Missing: pixel preview |
| Rulers (Shift+R) and guides, layout guides (Shift+G) (menu) | 🟡 | Rulers with selection range, drag out guides, move them, drop on a ruler to delete, layers snap to guides, guides are saved per page and undoable. Layout grids done: a Layout grid section on frames (columns, rows or a square grid with count, gutter, margin, size, colour, opacity, show / hide) and Shift+G shows or hides them; grids are not exported; ✅ layers snap to the column and row edges of the frame they sit in while moving and resizing (square grids too, unless the cells are tiny). ✅ typing an exact guide position (double-click a guide). ✅ View > Show / hide guides (Ctrl+;): hides the guide lines and their snapping but keeps the rulers; dragging a new guide out of a ruler shows them again; remembered in this browser. Missing: frame-level rulers, a guide readout while dragging layers |
| Outlines, mask outlines, frame outlines (menu) | ❌ | P3 |
| Minimize UI / hide UI (Ctrl+\\) (menu) | ✅ | Hides both panels and the toolbar; also in Actions |
| Resize the side panels (drag the inner edge of the left or right panel, 200 to 480 px and at most 40% of the window; double-click the edge to reset; remembered in this browser) | ✅ | P2 |
| Multiplayer cursors (menu) | ❌ | P3 |
| Comments (Shift+C) and annotations (Shift+Y) visibility (menu) | ❌ | P2 |
| Dev Mode toggle (Shift+D) | ✅ | |

## 8. File and project

| Feature | Status | Pri |
|---|---|---|
| Save / open / autosave (Google Drive), new file | ✅ | |
| Rename the file (click the name at the top of the left panel) | 🟡 | Local name and the Drive file name (Drive rename not tested with a real account). Missing: rename from the Home screen |
| Home / recent files / folders / trash | ❌ | P2 |
| Save local copy (.farsha download), open local file | ✅ | In the cloud menu, works without signing in. ✅ Duplicate file (File menu), ✅ drag a .farsha file onto the canvas to open it |
| Export all (File → Export, Ctrl+Shift+E), export frames to PDF (menu) | ❌ | P2 |
| Import SVG / images / drag and drop files | ✅ | P1 (paste or drop SVG, PNG, JPEG, WebP, GIF, MP4, WebM and .farsha files) |
| Version history, restore | 🟡 | Save a named version (Ctrl+Alt+S, Actions, cloud menu → Version history), list, restore (the current state is saved first), delete; newest 30 kept in this browser per file. Automatic versions done (an "Autosave" version every 10 minutes of editing, the newest 10 kept, marked Auto). Missing: versions on Drive (shared across devices), visual compare |
| Branching (menu: Create branch) | ❌ | P3 |
| Offline editing and sync queue | 🟡 | A service worker (`apps/web/public/sw.js`, registered in production only) caches the editor so it opens without a network after the first visit (pages network first, hashed assets cache first, fonts and the starter file stale while revalidate); the working copy was already saved in the browser. Checked with a production build: reload with the network off still shows the editor. ✅ Drive autosave waits while the browser is offline and saves again when the connection returns (also after a failed save); only the decision logic is unit-tested, not checked against a real Drive file. ✅ an "Offline" badge beside the cloud button while there is no network (checked by faking the browser online / offline events). |

## 9. Sharing and collaboration

| Feature | Status | Pri |
|---|---|---|
| Public view link, Inspect link needs sign-in | ✅ | |
| Per-person invite (edit / comment / view) | ❌ | P2 |
| Password and expiry on links | ❌ | P3 |
| Live multi-user editing and cursors | ❌ | P2 |
| Comments, replies, mentions, resolve | 🟡 | comments, replies and resolve are done and saved in the file; mentions and notifications need accounts and a server | P2 |

## 10. Preferences (Figma → Preferences menu) (menu)

| Setting | Farsha |
|---|---|
| Keep tool selected after use | ✅ |
| Use alternate zoom handling | ❌ |
| Highlight layers on hover | ✅ always on |
| Show dimensions on objects | ✅ always on |
| Hide canvas UI during changes | ❌ |
| Keyboard zooms into selection | ✅ (+ and - centre the selection) |
| Invert zoom direction | ✅ |
| Ctrl+click opens right-click menus | ✅ (Preferences switch, off by default) |
| Use scroll wheel zoom (instead of pan) | ✅ |
| Right-click and drag to pan | ❌ |
| Theme (light / dark / system) | ✅ (cloud menu or Actions; the canvas and panels follow, design layers are never recoloured) |
| Snapping, nudge amount, color profile | 🟡 snapping on / off and nudge amounts done (Preferences in the cloud menu or Actions); no colour profile |
| Keyboard layout, accessibility settings | ❌ |
| Keyboard shortcuts cheat sheet (Ctrl+Shift+?) | ✅ (every command with a shortcut, grouped, with search; also in Preferences menu and Actions) |
| Help and account menu, sign out in a profile menu | 🟡 a Help menu in the main menu (keyboard shortcuts, GitHub, report an issue, privacy, terms); sign out is in ☁ |

## 11. Quality

- Performance: SVG renderer slows with thousands of nodes (the 7 500 node Landing board of the starter file drags at about 2 frames a second: most of the time is the browser painting the blurs and gradients); no Canvas / WebGL path yet. Done: the layers list draws only the rows in view (`virtual-rows.ts`), and text widths are remembered between redraws (`canvasMeasure`).
- Text: wrapping uses canvas measureText in the browser (an estimate in exports); limited fonts, no Google Fonts yet.
- Images are stored inline in the document (no separate asset pipeline).
- Accessibility: ✅ the layers list is a tree (roles, levels, expanded and selected states, Up / Down / Left / Right / Home / End / Enter keys) and the canvas announces the page and selection; Reduce motion preference. Still minimal: moving layers and editing properties from the keyboard alone, canvas content for screen readers.
- ✅ A crash while drawing the editor shows a "Something went wrong" page with Reload and Report an issue instead of a blank screen (`ErrorBoundary.tsx`; the working copy is kept in the browser; in development `?crash-test` shows it).
- Touch / trackpad gestures beyond pinch zoom, mobile layout of the editor.

## Suggested build order

1. ~~Copy / cut / paste, select all, right-click menu, rename / lock, layer drag-reorder, pages.~~ done
2. ~~Stroke, effects (shadow / blur), text controls, gradients, image fills, export (PNG / SVG).~~ done
3. ~~Auto Layout v1, constraints, snapping and smart guides, align / distribute, rulers and guides.~~ done (round 2 items are in the tables above)
4. **Components, variants, styles, variables.** Components v1 done (main + instances, overrides, detach); next: Assets panel, then variants, styles, variables.
5. **Pen, multiple strokes (multiple fills done).** (Line / Arrow / Polygon / Star done: VECTOR layers with optional `fills` / `strokes`, see `canvas-engine/src/shapes.ts`.)
6. **Prototype, comments, live collaboration.**

## 10. Figma menu audit (read from the live Figma editor, 2026-10-31)

Source: the main menu (File, Edit, View, Object, Text, Arrange, Vector, Preferences), the toolbar dropdowns and the Design panel of an empty Figma file.
Farsha had **no menu bar at all**; everything was a shortcut, a right-click or the Actions palette. Status here is kept up to date as items are built (✅ done · ❌ missing).

| Area | Figma item | Status |
|---|---|---|
| Menu bar | Main menu with File / Edit / View / Object / Text / Arrange / Vector / Preferences and shortcut hints | ✅ (hamburger in the left header; every entry is a command of the Actions palette, entries for commands that do not exist yet are hidden) |
| File | New file, Place image… (Ctrl+Shift+K), Duplicate, Open / Save local copy, Save to version history (Ctrl+Alt+S), Show version history, Export… (Ctrl+Shift+E: selection, or every frame of the page) | ✅ |
| File | Export frames to PDF… ✅ (opens the print dialog with one page per frame, each page the size of its frame; choose "Save as PDF"); Create branch ❌ (needs a backend) | ◐ |
| Edit | Undo / Redo, Copy as, Paste over selection, Duplicate, Delete, Copy / Paste properties, Pick color, Select all / matching / none / inverse | ✅ |
| Edit | Find (Ctrl+F: layer names and text, Enter / Shift+Enter step through the matches, Match case), Find and replace (text layers) | ✅ |
| Edit | Select all with… (same type, fill, stroke, font, effects, opacity, name) ✅, Set default properties and Reset (new rectangles, ellipses and frames start with the copied fill, stroke, corner radius and opacity; kept in the browser) ✅; Paste to replace under Ctrl+Shift+R (the browser reserves it; it stays Ctrl+Alt+Shift+V) ❌ | ◐ |
| View | Zoom in / out / 100% / fit / selection, previous / next page, zoom to previous / next frame | ✅ |
| View | Outlines (Ctrl+Shift+Y; Ctrl+Y stays Redo here) ✅; Panels (Alt+1 layers, Alt+2 properties) ✅; Home / End frame stepping, Switch to Draw ❌ | ◐ |
| Object | Frame selection, Group, Ungroup, Use as mask, Add auto layout, Create component, Reset / Detach instance, Main component, order, Flip, Show / Hide, Lock / Unlock | ✅ |
| Object | Ungroup with Ctrl+Backspace, Rotate 180° / 90° left / 90° right, Hide other layers, Collapse layers (Alt+L), Remove fill (Alt+/), Remove stroke (Shift+/), Swap fill and stroke (Shift+X), Remove interactions, Delete contents | ✅ |
| Object | Wrap in new section (Ctrl+S), Convert to section / frame, Section tool (Shift+S): sections are bold-labelled folders on the canvas; frames inside them still count as screens | ✅ |
| Object | Flatten (Ctrl+E), Outline stroke (Ctrl+Shift+O) ✅; Slice tool (S) ✅; Boolean groups (live: Union, Subtract, Intersect, Exclude selection keep following their shapes; Flatten bakes them) ✅; Slots ❌ | ◐ |
| Text | Bold / Italic (Ctrl+B / I), Underline (Ctrl+U), Strikethrough (Ctrl+Shift+X), Alignment (Ctrl+Alt+L / T / R), Case, vertical alignment: whole-layer styles, Text menu and Typography panel | ✅ (formatting applies to the whole text layer) |
| Text | Bulleted / Numbered list and Left to right / Right to left direction (whole layer; list markers are drawn without a hanging indent, CSS export has direction but no list markup) ✅; Link (whole text, underlined, opens when presenting) ✅; Rich text (select characters in the editor, then Ctrl+B / I / U / Ctrl+Shift+X: bold, italic, underline, strikethrough on just those characters; the editor box itself shows plain text; font size, colour and font per run are not supported) ✅; Text on path (Text menu > Attach text to path: select a text layer and a pen path in the same frame; alignment sets where the text starts; no rotation, one line); Spell check (Preferences > Check spelling in text; the browser's checker, off by default) ✅ | ✅ |
| Arrange | Align left / centers / right / top / middle / bottom (Alt+A H D W V S) | ✅ |
| Arrange | Round to pixel, Tidy up (Ctrl+Alt+Shift+T), Pack horizontal / vertical, Distribute spacing (Alt+Shift+H / V), Distribute left / centers / right / top / middle / bottom | ✅ (Pack closes all gaps; Tidy up finds rows from the positions) |
| Vector | Join (Ctrl+J: closes one open path or merges two), Smooth join (all points of the selected paths), Simplify, Delete and heal and Split vector (act on the point selected while editing a path; Enter edits); Offset vector… (grow or shrink a closed shape by a distance, corners rounded) ✅ | ✅ |
| Preferences | Theme, Nudge amount, keep tool, snapping, zoom options | ✅ (Color profile, Keyboard layout, Accessibility, Permissions: ❌ / browser-bound) |
| Toolbar | Move, Hand, Frame, Rectangle, Line, Arrow, Ellipse, Polygon, Star, Pen, Text | ✅ |
| Toolbar | Section (Shift+S), Scale tool (K: drag a corner, the layer and its text, strokes, radii, shadows and auto layout spacing scale together) | ✅ |
| Toolbar | Image or video… (Ctrl+Shift+K) | ✅ |
| Toolbar | Comment tool (C): click to drop a pin, thread with replies, resolve, delete, Comments tab, Shift+C shows / hides pins | ✅ local-first: comments are saved inside the document (Drive file, local copy, version history), not synced live |
| Toolbar | Pencil (Shift+P), Slice (S, exports the area under it), Text on path (Text menu) | ✅ |
| Canvas | Alt+drag to duplicate, number keys set opacity (1 = 10% … 0 = 100%), rotate handles | ✅ (opacity keys, Alt+drag copies the selection in one undo step) |
| Design panel | Page background colour, Selection colors, Styles on a page (colour and text styles of the file), Export on a page (everything on the page as one PNG, JPG or SVG) | ✅ |
| Design panel | Stroke dash and gap, caps, joins; arrowheads (line arrow, triangle, circle, square, diamond) on the start and end of a vector / line | ✅ |
| Design panel | Corner smoothing, per-side stroke weights (rectangles and frames, drawn inside the shape; CSS border-width), background blur (canvas + CSS, not in SVG export) ✅ | ✅ |
| Prototype | Triggers (On click, While hovering, On drag, After delay, Key press), Back, Open link (http and https only), transitions (instant, dissolve, slide in from any side, duration), flow starting point (Present starts there when nothing is selected), Open / Close overlay (centred on a dimmed backdrop; click outside or Esc closes), device frame while presenting (phone or tablet bezel) ✅, vertical scrolling for tall frames, Smart animate (layers with the same name and type in both frames move, resize and fade between the two; text content and colours do not tween) ✅ | ✅ |
| Dev Mode | Status (Ready for dev / Completed, shown on the frame label) and a developer annotation per layer, saved in the document; Variables used by a layer (name, CSS custom property and a :root block with every mode) ✅; Compare changes (Version history > Compare lists added, removed and changed layers since a saved version, with the properties that differ) ✅ | ✅ |
| Collaboration | Live cursors, comment notifications and @mentions, branching, team libraries | ❌ needs a backend |

## 11. QA report (owner's Google Doc "farsha Report.", 2026-10-31)

| # | Issue | Status |
|---|-------|--------|
| 1 | Sort the menu by category (picture: the bottom toolbar) | ✅ the toolbar is grouped like Figma: Move / Hand / Scale, Frame / Section / Slice, Rectangle / Line / Arrow / Ellipse / Polygon / Star, Pen / Pencil, Text, Comment; each group shows the tool used last and an arrow opens the rest. The Actions palette is grouped by category too |
| 2 | Aspect ratio lock icon beside width / height | ✅ lock button next to W and H (also keeps the ratio when dragging a handle) |
| 3 | Add video | ✅ Fill type > Video on a rectangle, Place image… (Ctrl+Shift+K), drag and drop: MP4 and WebM up to 25 MB become a video layer that shows its first frame and plays when previewed; not in SVG/PNG/PDF export |
| 4 | "UX of this part" (picture: corner radius, smoothing, independent corners) | ✅ one row for opacity, radius and the independent-corners button; corner icons; Smoothing labelled |
| 5 | Auto layout over two frames ignores the spacing between them | ✅ the direction is now chosen from how the frames sit (side by side = row), so a tall frame next to a short one keeps its gap |
| 6 | PDF download | ✅ PDF is a format in the Export section and the Export dialog (print dialog, "Save as PDF") |
| 7 | Prototype did not seem to work | connector arrows on the canvas in the Prototype tab, a Preview button in the toolbar ✅ |
| 8 | Collapse all layers in the sidebar | ✅ button beside the layer search (Alt+L) |
| 9 | Clicking outside an open comment reply does not close it | ✅ |
| 10 | Dragging a frame often does not create one | ✅ pointer capture now sits on the canvas, so a drag survives re-rendering and ends outside the canvas |
| 11 | Preview option outside the Prototype tab | ✅ toolbar Preview button |
| 12 | Layout grid is confusing, make it easy like Figma | ✅ + adds a 10 px grid like Figma, each type explains itself, fields are spelled out (Count, Gutter, Margin, Size) |
| 13 | Right sidebar UX | owner will do |
| 14 | Double click a layer to jump to it on the canvas | ✅ double click the icon or the row (double click the name still renames) |
| 15 | Text (string) variables | ✅ Variables dialog has Color and Text tabs (a text per mode); a text layer follows one through the Variable field of the Typography section. Number and boolean variables are not built |
| 16 | Some options are cut off, make panels scrollable | ✅ main menu lists and submenus scroll and stay on screen, the right-click menu scrolls |

## 12. Deep Figma audit (2026-10-31, read from the owner's logged-in Figma, Free plan)

How it was done: the live Figma editor (menus, toolbar flyouts, Design / Prototype panels, Type settings, colour picker, Frame presets, Variables page,
Assets / Tools / Agents rails, context menu, Share dialog, Dev Mode paywall). Nothing in the owner's files was changed. Pro-only screens
(Dev Mode, shared libraries, branching, advanced prototyping) were read from Figma's own upgrade screen and the menus, not used.

### 12.1 Shortcuts that differ from Figma today (cheap fixes)
| Command | Figma | Farsha now |
|---|---|---|
| Flatten | Alt+Shift+F | ✅ same |
| Outline stroke | Ctrl+Alt+O | ✅ same |
| Union / Subtract / Intersect / Exclude selection | Alt+Shift+U / S / I / E | ✅ same |
| Open layers / libraries / design / prototype panel | Alt+1 / 2 / 8 / 9 | ✅ same |
| Find next / previous | Ctrl+Shift+F / Ctrl+Shift+D | ✅ same while the Find bar is open (Enter / Shift+Enter also work) |
| Rename layer | Ctrl+R | ✅ same |
| Find previous / next frame | Home / End | ✅ same |
| Create link | Ctrl+Shift+U | ✅ same (whole text) |
| Bulleted / numbered list | Ctrl+Shift+8 / 7 | ✅ same |
| Text align justified / top / middle / bottom | Ctrl+Alt+J, menu | ✅ same |
| Increase / decrease font size, weight, line height, letter spacing (indentation not yet) | Ctrl+Shift+> / < , Ctrl+Alt+> / < , Alt+Shift+> / < , Alt+> / < , Ctrl+] / [ | ✅ same |
| Zoom to previous / next frame | Shift+N / N | ✅ same (checked in the browser) |
| Paste to replace | Ctrl+Shift+R | Ctrl+Alt+Shift+V (browser reserves Ctrl+Shift+R) |
| Delete and heal | Shift+Backspace | ✅ same (while editing a path) |

### 12.2 Missing, free to build (P1, most used by designers)
- ✅ Design panel for several text layers: the full font controls (family, weight, size, line height, letter spacing) and Bold / Italic / Underline / Strikethrough buttons apply to every selected text layer (the controls show the first layer's values).
- ✅ Dev Mode: Flutter code (a Flutter tab: a StatelessWidget with Container, BoxDecoration, Row / Column with spacing and Padding, Stack / Positioned, Text with TextStyle, Opacity, Transform, Expanded; gradients and shadows; images and vectors are placeholders; checked on the starter board for crashes and balanced brackets, not compiled with Flutter).
- ✅ Dev Mode: a Vue tab (single-file component: template plus scoped style); class names of long text layers are cut to a few words; React component names never start with a digit.
- ✅ Layers panel: press an eye (or a lock) and drag down the list to hide, show, lock or unlock every layer you cross (like Figma). A slow drag can take more than one undo step.
- ✅ Share dialog: "Copy embed code" gives an iframe for a view-only link (needs a signed-in Drive file, so only the code builder is unit-tested; the dialog itself was not exercised with a real account).
- ✅ Auto layout > First on top (Figma's canvas stacking): the first layer of the frame is drawn above the others (canvas, hit-testing, SVG export; the Layers list order is unchanged). ✅ Alignment across a row has a "Text baseline" option (text layers hang from their first baseline, other layers by their bottom edge; Dev Mode CSS align-items: baseline). ✅ "Strokes in layout" toggle (centred strokes widen each child by their width, outside ones by twice that, so gap and padding are measured from the stroke edge; inside strokes are unchanged).
- ✅ Strokes on text (a Stroke section on text layers: colour or gradient, weight, Center / Outside; Inside is drawn like Center; only the first stroke is drawn, no dash or caps; canvas and SVG / PNG export).
- ✅ Enter on a selected text layer opens its text editor (Esc closes it); Enter on anything else still selects the children.
- ✅ Layers panel: Alt+click on a chevron opens (or closes) the layer and everything inside it.
- ✅ Layers panel: Alt+click on a layer's eye shows only that layer (everything else on the page is hidden; Alt+click again brings them back).
- ✅ Design panel for several layers: an Effects section (+ adds a drop shadow to every selected layer, − removes all their effects, "Mixed" when the counts differ).
- ✅ Ctrl+D after an Alt+drag copy repeats that move (Figma's duplicate and repeat last move): the next copies land the same distance further, again and again. Any other selection duplicates with the plain 10 px offset.
- ✅ Create component with several layers selected makes one component for each layer (Figma's "Create multiple components"); before, they were wrapped in one.
- ✅ Rename layers (Ctrl+R with several layers selected, or Rename layer in Actions): a name pattern with $& (old name), $n (count from a start number), $00 (zero padded), $p (parent name), find and replace, and a live preview; one undo step.
- ✅ Dev panel sections for Typography (font, size, weight, line height, letter spacing, alignment), Auto layout (direction, gap, padding) and shadows, each value copyable with a click.
- ✅ Dev panel: click a measurement (width, height, X, Y, radius, rotation, opacity) or a colour to copy it, like Figma's Dev Mode.
- ✅ Share link to one layer: the Share dialog has "Open on the selected layer" (adds `?node=<layer id>`); the viewer then opens on that layer's page, selects it and zooms to it.
- ✅ View > Zoom to 50% and Zoom to 200% (also in the Actions palette), next to Zoom to 100% (Shift+0).
- ✅ Layers list: Shift+click selects the range from the layer clicked before, Ctrl / Cmd+click adds or removes one (like Figma; on the canvas Shift+click still adds or removes).
- ✅ Design panel for several layers: X, Y, W, H of the box round them (moving and scaling them together; layers of different frames can only be moved), opacity and corner radius ("Mixed" when they differ) one fill for all, one stroke colour and weight for all, and font size and weight for the text layers among them. Effects and the other text settings are still only for one layer at a time.
- ✅ Drawing shapes: Shift makes a square (or circle), Alt draws from the centre.
- ✅ Shift while dragging layers keeps them on one line (horizontal or vertical, whichever the pointer went further on).
- ✅ Dropping dragged layers on another frame moves them into it, and dropping them on empty canvas moves them out to the page (they keep their place on the canvas; into an auto layout frame they take the slot under the pointer; layers inside instances and locked layers stay put).
- ✅ Dragging a layer inside an auto layout frame reorders it: it takes the slot under the pointer (one layer at a time; it snaps into place when the mouse is released).
- ✅ Reorder pages by dragging one onto another in the page list (one undo step).
- ✅ Ellipse arc: Start, Sweep and Ratio fields in an Arc section for ellipses (pie, ring, ring sector; canvas and SVG / PNG export). Boolean operations and flatten follow the arc (a ring with a hole is one outline with a slit); CSS code and hit-testing still treat it as a full ellipse; no handles on the canvas.
Menus and commands
- Edit: ✅ Copy as text, Copy as CSS (all layers), Select all with same text properties / instance / variant. ✅ Select all matching properties (Ctrl+Alt+A, checked in the browser). Still missing: animated SVG
- View: ✅ Show slices, Annotations (Shift+Y, the dev notes on the canvas), Pixel preview (Ctrl+Shift+P, crisp edges), Mask outlines, Frame outlines, Find previous / next frame (Home / End). ✅ Minimize left bar and Toggle variables panel (View > Panels, and Actions). Still missing: Additional labels, Switch to Draw
- ✅ Object > More layout options (Resize to fit, hug and fill width / height, lock and unlock aspect ratio; Suggest auto layout is the same as Add auto layout) and rotate / flip buttons in the Position section. Still missing in Object: Restore / Set default thumbnail, ✅ Push changes to main component (Object menu and right-click on an instance: the overridden properties are written to the main and cleared, other instances follow). Restore main component is not needed (deleting a main turns its instances into plain frames). Still missing: Slots
- ✅ Right-click > Move to page (a "Move to page" group lists the other pages and New page; layers keep their canvas position, a frame takes its children along, layers inside an instance stay; one undo step). It is a flat group like Copy/Paste as, not a flyout, and the Actions palette has "Move to page: <name>" and "Move to new page" too.
- Text: justified alignment, top / middle / bottom commands, Adjust (indent, font size / weight / line height / letter spacing steps), Title case + small caps (✅ both; small caps is a Text case option, drawn with `font-variant`)
- Preferences: ✅ Highlight layers on hover, Show dimensions on objects, Right-click and drag to pan. ✅ Rename duplicated layers (Preferences: Card 1 becomes Card 2). ✅ Use smart quotes (off by default; curly quotes while typing in a text layer, but a quote typed over a selection stays straight). ✅ Use Ctrl+Alt+arrows to rotate (off by default; Left / Right turn 1°, Shift 15°; Up / Down not used). ✅ Flip objects while resizing (on by default like Figma; with Shift or locked proportions the layer still stops at the opposite side). ✅ Hide canvas UI during changes (off by default; the selection box, handles and size pill hide while moving, resizing or rotating). ✅ Accessibility: Reduce motion (a Preferences switch; animations, transitions and smooth scrolling become instant, and the system's reduced motion setting does the same). Still missing: Color profile, Keyboard layout

Design panel
- ✅ Frame size presets (Phone, Tablet, Desktop, Presentation, Watch, Paper) in the Layout section; ✅ with the Frame tool chosen and nothing selected, the Design panel lists the same sizes and a click places a frame of that size in the middle of the view
- Auto layout: ✅ min / max width and height (a "Size limits" section on auto layout frames, and in Resizing for layers inside one; a layer that fills stops at its max and keeps its min; a hugging frame grows to its min and stops at its max). ✅ Grid flow in a simple form (Wrap on a horizontal frame, then Grid columns: children line up in that many columns, each as wide as its widest child, rows as tall as their tallest; CSS becomes display: grid). Still missing: grid cells that span, rows and columns with their own sizing, "Hug" / "Fill" as commands
- ✅ (done above) Position section flip and rotate buttons
- Colour picker: ✅ custom picker (square, hue, eyedropper where the browser has it, HEX / RGB / HSL, "On this page" colours). ✅ HSB and CSS modes (the CSS box reads hex, rgb(), hsl() and hsb()). ✅ fill blend mode (per fill, `blendMode` on a paint, drawn with `mix-blend-mode`; not applied to angular and diamond fills). Still missing: library colours
- Fills: ✅ angular and diamond gradients (drawn as wedges; CSS uses conic-gradient and a radial stand-in). ✅ Tile image mode (a Tile scale field, repeats the picture at its own size; pictures added before this repeat at 256 px). ✅ Crop image mode (Zoom %, Move X, Move Y fields in an image fill; the picture is scaled about the centre of the layer; CSS is approximate). Still missing: Pattern, image adjustments beyond exposure, contrast, saturation, temperature, tint, highlights and shadows (✅ all six: fields in an image fill, drawn with an SVG filter; highlights and shadows use a five point tone curve), ✅ a gradient handle on the canvas (a dot on the edge of the selected layer: drag it to turn the gradient, Shift snaps to 15 degrees; the stops and the angle are also in the Fill section). ✅ the colour stops of a linear gradient show as dots on the gradient line of the selected layer; drag one to move it along the line (Shift snaps to 5%; one undo step). Clicking the line adds a stop there (colour mixed from its neighbours, up to 16 stops, then you can keep dragging it). Alt+click on a stop removes it (two always stay). ✅ the same for radial gradients (stops sit on the radius from the middle to the right edge; the angle handle is hidden because radial ignores the angle). Still missing: moving the start and end points of the line or the centre, angular / diamond stops on the canvas
- Strokes: ✅ miter angle (`strokeMiterAngle`, becomes `stroke-miterlimit`). ✅ stroke styles (a Stroke style picker in the Stroke section: create from a layer's stroke, apply, rename, delete; a style carries stroke colours, weight, position, dashes, caps, joins and miter angle; changing the stroke by hand detaches). Still missing: variable width and brush strokes
- Effects: ✅ Noise, Texture, Glass (a blurred, lightly tinted backdrop; canvas and CSS, not in SVG/PNG export). ✅ effect styles (create from a layer's effects, apply, delete; editing effects detaches; listed under Styles). ✅ drop shadow "Show behind transparent areas" (checkbox, `showBehind`; canvas and SVG / PNG export, not in generated CSS). ✅ rename an effect style and a grid style in place (a name box under the style picker). ✅ stroke styles are created and renamed in the Stroke section
- Typography: ✅ paragraph spacing, indent, truncate text (max lines). ✅ font picker with search, ~70 Google Fonts (downloaded from fonts.googleapis.com only when a file uses one; PNG export may use a stand-in font) and installed fonts (Chromium asks permission). ✅ decoration style (solid, dotted, wavy; `textDecorationStyle`, whole layer, not per range). ✅ OpenType features (tabular and old-style numbers, slashed zero, fractions, stylistic sets 1 and 2, no ligatures; whole layer, and the box width is not re-measured for them). ✅ colour per range of characters (while editing text, a bar of colour swatches appears above the box and colours the selected characters; "A⃠" gives the layer's colour back; the colour is saved with the text runs and drawn on the canvas and in SVG / PNG export). Still missing: vertical trim, variable font axes, size and font per range, a free colour picker for ranges
- Export: ✅ several export settings per layer (scale, suffix, format incl. WebP and PDF) saved with the layer. ✅ "Contents only" for a frame (a checkbox per export setting; not for PDF). ✅ export presets (iOS: 1x 2x 3x, Android: mdpi to xxxhdpi, added from an "Add preset…" picker in the Export section; custom presets are not saved)
- ✅ Grid styles (create from a frame's layout grids, apply, delete; listed under Styles). Still missing: stroke styles, renaming and editing styles in place
- Layers panel: ✅ filter by type (a dropdown beside the search: frames, sections, groups, components, instances, text, rectangles, ellipses, vectors, images; combines with the search). Rename shortcut and hover highlight were already done

Prototype
- Triggers: While pressing (Mouse enter / leave / down / up done ✅)
- Actions: ✅ Set variable mode (`SET_MODE`, undone when the presentation ends). ✅ Set variable (colour, text, number or boolean, in the active mode; undone when the presentation ends or restarts). ✅ Conditional (if a variable is / is not / is greater / less than a value, go to one frame, else to another; one condition, navigation only). ✅ Media controls (play, pause, play / pause, mute, unmute, mute / unmute, skip forward / back by N seconds on a video layer while presenting; the video is chosen from the video layers of the file). ✅ several conditions in a Conditional ("+ Add condition", up to 5 more, all must hold or any can hold). (Scroll to and Swap overlay done ✅)
- Overlay position, dim and close on outside click done ✅
- Animations: ✅ Move out and Push (all four sides; the old frame is drawn over the new one while it leaves). ✅ Move in and Slide out (Slide in and Slide out now move the other frame half as far, underneath or arriving, like Figma; Move in and Move out do not). (easing curves and spring done ✅)
- Scrolling: fixed (sticky) layers (horizontal and both done ✅)
- Prototype settings: ✅ restart (R while presenting) and hotspot hints (the clickable areas flash when a click hits nothing). ✅ named flows (`flowName` on a starting frame, "Flows" buttons in the Prototype tab present one flow, the canvas label shows the name). ✅ background colour (Prototype tab, kept for this session only). ✅ scale options (fit, fill, 100%; fill and 100% crop a frame bigger than the window). ✅ a "Go to flow…" picker inside the Present screen (shown when the file has more than one flow). Set variable action is done above
- ✅ Interactive components: a "Change to" action turns an instance into another component or variant while presenting (undone afterwards). Still missing: variant switching on hover as a component-level setting

Dev Mode
- ✅ Code for iOS in SwiftUI (a SwiftUI tab in the Dev panel: stacks from auto layout, ZStack with offsets, shapes with fills, gradients, strokes, shadows, blur, text fonts; image / vector layers are placeholders, inner shadows and several fills per layer are not covered). ✅ Code for Android in Jetpack Compose (a Compose tab: Row / Column / Box, Modifier chain with size, offset, background brush, border, shadow, blur, text arguments; image / vector layers are drawable placeholders; shadow offsets are not expressible). ✅ Code for iOS in UIKit (a UIKit tab: a UIView subclass that builds the layers in setup(); auto layout becomes UIStackView, other layers get frames; fills, gradients (linear), borders, corner radius, shadow, alpha, rotation, labels). ✅ Code for Android in XML (an Android XML tab: the layout file, with LinearLayout for auto layout and FrameLayout with margins otherwise, then the shape drawables for fills, gradients, borders and corners; gradients snap to Android's 45 degree angles, text uses the font name as a font family resource). Nothing missing in the code tabs for now
- ✅ Box-model visual (border and padding) in Layer properties (Dev tab, for frames and shapes with a stroke or auto layout padding)
- ✅ Ready for dev list (shown in the Dev panel when nothing is selected: layers marked Ready for dev or Completed on this page, click to go to one; Figma puts it in the left panel). ✅ annotations shown on the canvas. ✅ dev resources (a Dev resources section in the Dev panel: named http(s) links saved on the layer, at most 20; other addresses are refused and also ignored when read from a file).
- ✅ Code Connect style mapping (local, no Figma service: a Component code box on a main component in the Dev panel; its instances show the snippet with a Copy button. Snippets are plain text, up to 20 000 characters, saved in the file)

Variables
- ✅ Number and boolean variables (Variables dialog tabs; the Variables section of the Design panel binds width, height, radius, opacity, gap, padding, font size, stroke weight, rotation and visibility; checked in the browser). ✅ groups by name (a name like brand/primary puts the variable in the group brand: a header row in the Variables dialog, the name box shows the part after the last slash; the binding menus still list full names). ✅ aliases (the ⛓ button beside a value makes it follow another variable of the same type, per mode; a loop or a different type is refused; detaching keeps the value it showed; deleting the target turns aliases into plain values; JSON export writes the shown value). ✅ scopes for number variables (a Scope line under each number variable in the Variables dialog: tick the property groups it may drive, and the Bind a property menu then only offers it for those; a binding made before the scope changed keeps working). ✅ scopes for colour variables too (shape and frame fills, text fills, strokes; the ◆ menu of each only lists the variables that allow it). Still missing: several collections, scopes for text variables, scopes
- Bind variables to number properties (spacing, radius, size, opacity, font size) and to visibility
- ✅ Import and export as JSON (Export JSON / Import JSON in the Variables dialog; values by mode name, bad values repaired, imported variables are added as new ones). ✅ explicit mode per frame (`explicitMode`, "Mode:" picker on a frame; inner frames can override). Still missing: variable collections and aliases

Components
- ✅ Component descriptions (a Description box on a main component, shown in the Assets list). ✅ Swap instance picker (`swapInstance`, in the Design panel of an instance). Still missing: instance-swap properties, nested instances, slots
- Assets panel: ✅ search (name, description, variant values). ✅ right-click a component to go to its main. ✅ drag a component onto the canvas (it lands inside the frame under the pointer; checked with synthetic drag events). ✅ dragging a component from Assets shows a small picture of it (up to 160 px, drawn when the pointer enters the row; checked by calling dragstart with a spy, the real drag ghost was not seen)

Other
- Plugins and widgets: a small sandboxed plugin API (large)
- Figma Draw tools (brush, marker, highlighter) and the Switch to Draw mode
- Import: PDF, Sketch, .fig (partial)
- ✅ Autosave history entries (every 10 minutes of editing, in the browser). ✅ version descriptions (a Description box when saving a version). Still missing: version history shared through Drive

### 12.3 Needs a server (cannot be free and offline, documented, not planned)
Live cursors, observation mode, cursor chat, audio, comment notifications and @mentions, branching and merging, team and shared libraries,
projects / teams / permissions / password-protected links, community publishing, org features (SSO, analytics).

### 12.4 AI features (need an AI service; a "bring your own key" option could be added later)
Agents, Actions (AI), Make / code layers, Build this with code, generate image, remove background, AI rename layers, translate, shaders and generative tools.

### 12.5 Separate Figma products (not part of the editor)
FigJam (whiteboard), Slides, Buzz, Sites. FigJam-like sticky notes and connectors or a Slides mode could be built later as new modes.

AI features are listed in `docs/AI_PLAN.md` (planned for later). The server-bound items of 12.3 are not planned: they cannot be done without a server.
