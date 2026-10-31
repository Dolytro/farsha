# Canvylo vs Figma: feature gap

Status: ✅ done · 🟡 partial · ❌ missing. Priority: **P1** (needed to design real screens), **P2** (daily convenience), **P3** (later / optional).

Sources: items marked (menu) were read from Figma's live editor menus (File, Edit, View, Object, Preferences). The test file was view-only, so Edit and Object showed fewer items than a full editor; the rest comes from Figma's regular editor.

## 1. Tools

| Feature | Status | Pri |
|---|---|---|
| Move (V), Hand (H) | ✅ | |
| Frame (F), Rectangle (R), Ellipse (O), Text (T) | ✅ | |
| Scale tool (K) | ✅ | One layer at a time; keeps the ratio (Alt scales from the centre) |
| Section, Slice | ❌ | P3 |
| Line (L), Arrow (Shift+L) | 🟡 | Drawn by dragging (Shift snaps to 15°), editable stroke colour / width, rotation. Missing: arrow head types, stroke caps, the arrow head stretches when the width changes, no handles on the line ends |
| Polygon, Star | 🟡 | Toolbar buttons, fill and stroke editable. Missing: side count / star ratio controls, corner radius |
| Image / video placement, paste or drop an image | ❌ | P1 |
| Pen tool (P) | 🟡 | Click for corner points, drag for curve handles, click the first point to close, Enter / double-click / Esc to finish, Backspace removes the last point; result is a vector layer with editable stroke and fill. Point editing done (Enter or double-click a pen path: drag anchors and handles, click the path to add a point, Alt+click or Delete removes one, double-click a point to switch corner / smooth; needs no rotation or flip). Missing: Pencil, joining / splitting paths, editing imported SVG vectors, boolean operations |
| Comment tool (C) | ❌ | P2 |
| Color picker / eyedropper (I) (menu) | 🟡 | Eyedropper (I or Actions) picks a colour anywhere on the screen and applies it to the selection (copies it when nothing is selected); needs Chromium's EyeDropper API. Real screen picking could not be driven in the test browser (a stub was used). Missing: a colour picker popover with a spectrum |
| Tool dropdowns with variants in the toolbar | ❌ | P2 |
| "Keep tool selected after use" setting (menu) | ✅ | Preferences |

## 2. Selection and editing

| Feature | Status | Pri |
|---|---|---|
| Click select, Shift multi-select, marquee | ✅ | |
| Move, resize from corners, nudge with arrows | ✅ | |
| Duplicate (Ctrl+D), delete, group / ungroup | ✅ | |
| Bring forward / backward / to front / to back | ✅ | |
| Undo / redo | ✅ | |
| Copy, cut, paste (Ctrl+C / X / V), paste text | ✅ | |
| Paste over selection (Ctrl+Shift+V), paste to replace (Ctrl+Alt+Shift+V) | ✅ | |
| Copy / paste properties (Ctrl+Alt+C / V) (menu) | ✅ | |
| Copy as PNG (Ctrl+Shift+C); Dev Mode Ctrl+C copies CSS | ✅ | |
| Copy as SVG / CSS / PNG from the right-click menu | ✅ | |
| Paste SVG (shapes, text and paths become layers; no gradients or transforms beyond translate) | ✅ | |
| Paste layers copied in Figma (frames, text, shapes, vectors; no auto layout, components, images, effects) | 🟡 | |
| Paste images from the clipboard, drag and drop image files (PNG / JPEG / WebP / GIF; stored inside the .canvylo file) | ✅ | |
| Image fills on shapes, crop, replace image | ❌ | P1 |
| Select all (Ctrl+A) | ✅ | |
| Select inverse (Ctrl+Shift+A), select all matching (Ctrl+Alt+A) | ✅ | Select none is Esc. Matching = same type, fills, strokes (and font for text) |
| Select children (Enter), select parent (Shift+Enter), Tab / Shift+Tab to next / previous sibling | ✅ | |
| Double-click to enter a group; Figma selects the top-level layer first | ❌ | P1 |
| Resize from all 8 handles, Shift = keep ratio, Alt = from center | 🟡 | All 8 handles (sides are invisible strips like Figma), Shift, Alt done. Missing: resizing several layers at once, rotated layers, flipping when dragged past the opposite side, children scaling (constraints) |
| Rotate handle, rotate with Ctrl+Alt+arrows (menu) | 🟡 | Drag just outside a corner of a single layer to rotate it (Shift snaps to 15°), plus the numeric field. While a layer is rotated only the rotated outline shows (no resize handles; resize with the W / H fields). Missing: Ctrl+Alt+arrows, rotating several layers together, resizing a rotated layer by its handles |
| Flip horizontal / vertical (Shift+H / Shift+V) | 🟡 | Each selected layer flips about its own centre (Figma flips a multi-selection about the selection centre). Missing: menu entries |
| Rename (F2 / Ctrl+R / double-click), lock (Ctrl+Shift+L), hide (Ctrl+Shift+H); locked layers cannot be picked or nudged on the canvas | ✅ | |
| Snapping, smart guides, pixel snapping | 🟡 | Moving snaps to edges and centres of sibling layers and the parent frame, red guide lines, hold Ctrl to turn off. Missing: snapping while resizing, equal-spacing guides, distance labels while dragging, pixel snapping, a setting to turn it off |
| Align and distribute, Tidy up | 🟡 | Align (6 modes, Alt+A/H/D/W/V/S, panel row) and distribute spacing (panel buttons, 3+ layers) done. Missing: Tidy up, distribute shortcuts, aligning to the selection when a single layer is on a page |
| Boolean operations (union, subtract, intersect, exclude), flatten, outline stroke | 🟡 | Union / Subtract / Intersect / Exclude (Ctrl+Alt+U, context menu, Actions) on rectangles, ellipses, polygons, stars and pen paths; the result is one flattened vector (curves become straight segments) with the bottom shape's fill. Flatten (Ctrl+E, Object menu) merges shapes and the shapes inside groups and frames into one vector (curves become straight segments). Outline stroke (Ctrl+Shift+O) turns the stroke into a filled vector above the shape (round joins, round caps on open paths, inside and outside strokes cut to the edge). Missing: keeping the originals editable inside the result, text as input, mitre and bevel joins in the outline |
| Mask (Ctrl+Alt+M), frame selection (Ctrl+Alt+G) | ✅ | Mask: several layers are grouped and the bottom one masks the rest; one layer masks the layers above it; shape mask (alpha), also in SVG export. Missing: luminance masks, outline-only masks |
| Right-click context menu (Figma items; read-only in Dev Mode; none on view links; submenu is a flat "Copy/Paste as" group) | ✅ | |
| Command palette "Actions" (Ctrl+/ or Ctrl+K) | ✅ | Search ~50 actions with their shortcuts (also works as a shortcut cheat sheet). Missing: recent actions, plugins, searching layers / pages from the palette |
| Find (Ctrl+F), find next / previous (menu) | ❌ | P3 |
| Draggable layer reorder, drag to reparent (drop on a frame or group) | ✅ | |
| Layers panel: expand / collapse, search, lock icon, rename (selecting on canvas does not auto-expand parents yet) | ✅ | |
| Pages: add, rename (double-click), delete, switch (click, Page Up / Down); each page remembers its pan and zoom | ✅ | |

## 3. Design panel (right sidebar)

| Section | Status | Missing |
|---|---|---|
| Position | 🟡 | Rotation handle |
| Layout | 🟡 | Auto layout v1 done: Shift+A adds it (wraps loose layers in a frame, keeps their order / gap / padding), horizontal / vertical, gap, padding (horizontal + vertical), alignment on both axes, space between, hug / fixed sizing, flexbox CSS in Dev Mode. Fill container done (Resizing section: W / H of a child = Fixed or Fill container; Dev Mode CSS uses flex: 1 1 0 and align-self: stretch). Per-side padding done (T / R / B / L fields, shown automatically when the sides differ). Wrap done (Wrap button, gap between lines, flex-wrap in Dev Mode CSS; needs a fixed size in the layout direction). Absolute position done (Resizing section checkbox; the layer leaves the flow, also in the Dev Mode CSS). Missing: nothing big in auto layout except min / max sizes. Previously missing:, min / max, nested resizing rules, drag to reorder inside a frame, layout grids, clip content toggle |
| Appearance | 🟡 | Independent corner radius done for rectangles and frames (not images). Blend mode (16 modes, no Pass through / Plus darker / Plus lighter) done. Corner smoothing done (approximate curve, canvas and SVG export; CSS export ignores it) |
Solid, linear and radial gradients, and image fills (upload, Fill / Fit / Stretch, opacity) (add / remove stops, position, opacity, angle) done. Gradient angle is in bounding-box units, so it skews on non-square layers. Gradient text and strokes show the first stop only; SVG / Figma paste still flatten gradients. Multiple fills (stacked, listed top first, shapes only; text keeps one) done. Hex input is editable (3 or 6 digits). Missing: tile / crop image modes, image filters, angular / diamond gradients, handles on canvas, styles, variables |
| Stroke | 🟡 | Color, opacity, weight, position (inside / center / outside) and multiple strokes (stacked, one weight and position for all; frames, rectangles and ellipses; a drawn vector keeps one) done. Dev Mode CSS shows the first stroke only. Missing: per-side weights, dash, caps, joins, arrowheads. |
| Effects | 🟡 | Drop shadow, inner shadow, layer blur (hide / remove / change type) done. Missing: shadow spread, background blur, show-behind, multiple blurs. Shadow offset rotates with a rotated layer. Dev Mode CSS shows outside strokes as an inside border. |
| Typography | 🟡 | Content, font family (a short built-in list, system fonts only), weight names, size, line height, letter spacing, text align (left / center / right) done. Multi-line text (Enter = new line), wrapping, auto width / auto height / fixed (also set by dragging handles like Figma) done; wrapping uses the browser's canvas measureText, so very different fonts may wrap slightly differently in exports. Missing: Google Fonts, paragraph spacing, vertical align, decoration, case, truncate, lists, mixed styles inside one text box, text selection inside the editor styling |
| Selection colors | ✅ | Design panel lists every solid colour in the selection; edit one to change it everywhere |
| Export | 🟡 | Export section in the Design panel: PNG / JPG / SVG at 0.5x–4x, one file per layer, "@2x" file names. Also in the Dev panel. Missing: PDF, saved export settings per layer, suffix, multi-selection export, export frames to PDF |
| Constraints | 🟡 | Left / Right / Left & Right / Center / Scale (and Top / Bottom) for layers inside frames, applied when the frame is resized (also in nested frames). Missing: groups scaling their children, the clickable constraint diagram, children of auto layout frames |

## 4. Components and design system

| Feature | Status | Pri |
|---|---|---|
| Components, instances, detach, overrides | 🟡 | Create component (Ctrl+Alt+K, wraps non-frames), copy / paste a main component to get an instance, edits of the main flow into instances, property overrides kept per layer, Reset all overrides, Go to main component, Detach instance (Ctrl+Alt+B), purple layer icons. Assets tab (click to place an instance). Missing: drag from Assets, search in Assets, Alt-drag, instance swap, nested instances (they flatten), copying or duplicating an instance drops its layer overrides, overrides on deleted / re-ordered layers (deleted layers come back, order follows the main), main component purple selection outline |
| Variants and component properties | 🟡 | Variants: add (copy into a set), properties with values per variant, instance picker. Component properties: boolean (show / hide a layer) and text (change a text layer) defined on the main component, set on instances, with defaults. Missing: instance-swap properties, number properties, a component-set frame on the canvas, keeping overrides when switching variants, properties on nested instances |
| "Main component" (Object menu) (menu) | ✅ | Create component |
| Color / text / effect / grid styles | 🟡 | Color (fill) styles and text styles (font family, weight, size, line height, letter spacing): create from a layer, apply, edit (every layer follows, also inside instances), rename, detach, delete, undo. Missing: effect and grid styles, stroke styles, a styles list in the Assets tab, folders |
| Variables (color, number, string, boolean) and modes (light / dark) | 🟡 | Colour variables with modes: create, rename, edit per mode, add / rename / delete modes, bind a solid fill or stroke (◆ button), switch the active mode (dialog or Actions: "Switch to next variable mode"), undo. Missing: number / string / boolean variables, several collections, groups, per-frame mode override, variables in styles, gradients, variable names in Dev Mode code |
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
| Zoom in / out / 100% / fit / selection, pan, canvas-only zoom | ✅ | |
| Zoom to next / previous frame (N / Shift+N) | ✅ | Home / End missing |
| Pixel grid (Shift+') and pixel preview (menu) | 🟡 | Pixel grid from 800% zoom (Shift+' or Actions). Missing: pixel preview |
| Rulers (Shift+R) and guides, layout guides (Shift+G) (menu) | 🟡 | Rulers with selection range, drag out guides, move them, drop on a ruler to delete, layers snap to guides, guides are saved per page and undoable. Layout grids done: a Layout grid section on frames (columns, rows or a square grid with count, gutter, margin, size, colour, opacity, show / hide) and Shift+G shows or hides them; grids are not exported and layers do not snap to them yet. Missing: frame-level rulers, guide value editing, hiding guides without hiding rulers, a guide readout while dragging layers |
| Outlines, mask outlines, frame outlines (menu) | ❌ | P3 |
| Minimize UI / hide UI (Ctrl+\\) (menu) | ✅ | Hides both panels and the toolbar; also in Actions |
| Multiplayer cursors (menu) | ❌ | P3 |
| Comments (Shift+C) and annotations (Shift+Y) visibility (menu) | ❌ | P2 |
| Dev Mode toggle (Shift+D) | ✅ | |

## 8. File and project

| Feature | Status | Pri |
|---|---|---|
| Save / open / autosave (Google Drive), new file | ✅ | |
| Rename the file (click the name at the top of the left panel) | 🟡 | Local name and the Drive file name (Drive rename not tested with a real account). Missing: rename from the Home screen |
| Home / recent files / folders / trash | ❌ | P2 |
| Save local copy (.canvylo download), open local file | ✅ | In the cloud menu, works without signing in. Missing: Duplicate file, drag a .canvylo onto the canvas |
| Export all (File → Export, Ctrl+Shift+E), export frames to PDF (menu) | ❌ | P2 |
| Import SVG / images / drag and drop files | ❌ | P1 |
| Version history, restore | 🟡 | Save a named version (Ctrl+Alt+S, Actions, cloud menu → Version history), list, restore (the current state is saved first), delete; newest 30 kept in this browser per file. Missing: automatic versions, versions on Drive (shared across devices), visual compare |
| Branching (menu: Create branch) | ❌ | P3 |
| Offline editing and sync queue | ❌ | P3 |

## 9. Sharing and collaboration

| Feature | Status | Pri |
|---|---|---|
| Public view link, Inspect link needs sign-in | ✅ | |
| Per-person invite (edit / comment / view) | ❌ | P2 |
| Password and expiry on links | ❌ | P3 |
| Live multi-user editing and cursors | ❌ | P2 |
| Comments, replies, mentions, resolve | ❌ | P2 |

## 10. Preferences (Figma → Preferences menu) (menu)

| Setting | Canvylo |
|---|---|
| Keep tool selected after use | ✅ |
| Use alternate zoom handling | ❌ |
| Highlight layers on hover | ✅ always on |
| Show dimensions on objects | ✅ always on |
| Hide canvas UI during changes | ❌ |
| Keyboard zooms into selection | ❌ |
| Invert zoom direction | ✅ |
| Ctrl+click opens right-click menus | ❌ |
| Use scroll wheel zoom (instead of pan) | ✅ |
| Right-click and drag to pan | ❌ |
| Theme (light / dark / system) | ✅ (cloud menu or Actions; the canvas and panels follow, design layers are never recoloured) |
| Snapping, nudge amount, color profile | 🟡 snapping on / off and nudge amounts done (Preferences in the cloud menu or Actions); no colour profile |
| Keyboard layout, accessibility settings | ❌ |
| Keyboard shortcuts cheat sheet (Ctrl+Shift+?) | ❌ |
| Help and account menu, sign out in a profile menu | 🟡 sign out is in ☁ |

## 11. Quality

- Performance: SVG renderer slows with thousands of nodes; no Canvas / WebGL path yet.
- Text: wrapping uses canvas measureText in the browser (an estimate in exports); limited fonts, no Google Fonts yet.
- Images are stored inline in the document (no separate asset pipeline).
- Accessibility: keyboard navigation and screen-reader support are minimal.
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
Canvylo had **no menu bar at all**; everything was a shortcut, a right-click or the Actions palette. Status here is kept up to date as items are built (✅ done · ❌ missing).

| Area | Figma item | Status |
|---|---|---|
| Menu bar | Main menu with File / Edit / View / Object / Text / Arrange / Vector / Preferences and shortcut hints | ✅ (hamburger in the left header; every entry is a command of the Actions palette, entries for commands that do not exist yet are hidden) |
| File | New file, Place image… (Ctrl+Shift+K), Duplicate, Open / Save local copy, Save to version history (Ctrl+Alt+S), Show version history, Export… (Ctrl+Shift+E: selection, or every frame of the page) | ✅ |
| File | Export frames to PDF, Create branch | ❌ (PDF later; branching needs a backend) |
| Edit | Undo / Redo, Copy as, Paste over selection, Duplicate, Delete, Copy / Paste properties, Pick color, Select all / matching / none / inverse | ✅ |
| Edit | Find (Ctrl+F: layer names and text, Enter / Shift+Enter step through the matches, Match case), Find and replace (text layers) | ✅ |
| Edit | Paste to replace under Ctrl+Shift+R (the browser reserves it; it stays Ctrl+Alt+Shift+V), Set default properties, Select all with… | ❌ |
| View | Zoom in / out / 100% / fit / selection, previous / next page, zoom to previous / next frame | ✅ |
| View | Outlines, Panels (show / hide each panel), Find previous / next frame (Home / End), Switch to Draw | ❌ |
| Object | Frame selection, Group, Ungroup, Use as mask, Add auto layout, Create component, Reset / Detach instance, Main component, order, Flip, Show / Hide, Lock / Unlock | ✅ |
| Object | Ungroup with Ctrl+Backspace, Rotate 180° / 90° left / 90° right, Hide other layers, Collapse layers (Alt+L), Remove fill (Alt+/), Remove stroke (Shift+/), Swap fill and stroke (Shift+X), Remove interactions | ✅ (Delete contents ❌) |
| Object | Wrap in new section (Ctrl+S), Convert to section / frame, Section tool (Shift+S): sections are bold-labelled folders on the canvas; frames inside them still count as screens | ✅ |
| Object | Flatten (Ctrl+E), Outline stroke (Ctrl+Shift+O) ✅; Slice tool (S), Boolean groups (live), Slots ❌ | ◐ |
| Text | Bold / Italic (Ctrl+B / I), Underline (Ctrl+U), Strikethrough (Ctrl+Shift+X), Alignment (Ctrl+Alt+L / T / R), Case, vertical alignment: whole-layer styles, Text menu and Typography panel | ✅ (formatting applies to the whole text layer) |
| Text | Rich text: different styles inside one text layer, Create link, Bulleted / Numbered list, Text direction, Spell check, Text on path | ❌ |
| Arrange | Align left / centers / right / top / middle / bottom (Alt+A H D W V S) | ✅ |
| Arrange | Round to pixel, Tidy up (Ctrl+Alt+Shift+T), Pack horizontal / vertical, Distribute spacing (Alt+Shift+H / V), Distribute left / centers / right / top / middle / bottom | ✅ (Pack closes all gaps; Tidy up finds rows from the positions) |
| Vector | Join selection (Ctrl+J), Smooth join, Delete and heal, Split vector, Simplify vector, Offset vector | ❌ |
| Preferences | Theme, Nudge amount, keep tool, snapping, zoom options | ✅ (Color profile, Keyboard layout, Accessibility, Permissions: ❌ / browser-bound) |
| Toolbar | Move, Hand, Frame, Rectangle, Line, Arrow, Ellipse, Polygon, Star, Pen, Text | ✅ |
| Toolbar | Section (Shift+S), Scale tool (K: drag a corner, the layer and its text, strokes, radii, shadows and auto layout spacing scale together) | ✅ |
| Toolbar | Image… (Ctrl+Shift+K) | ✅ (video ❌) |
| Toolbar | Comment tool (C): click to drop a pin, thread with replies, resolve, delete, Comments tab, Shift+C shows / hides pins | ✅ local-first: comments are saved inside the document (Drive file, local copy, version history), not synced live |
| Toolbar | Slice (S), Pencil (Shift+P), Text on path | ❌ |
| Canvas | Alt+drag to duplicate, number keys set opacity (1 = 10% … 0 = 100%), rotate handles | ✅ (opacity keys, Alt+drag copies the selection in one undo step) |
| Design panel | Page background colour, Selection colors ✅; Styles on a page, Export on a page ❌ | ◐ |
| Design panel | Stroke dash and gap, caps, joins; arrowheads (line arrow, triangle, circle, square, diamond) on the start and end of a vector / line | ✅ |
| Design panel | Corner smoothing ✅; per-side stroke weights, background blur ❌ | ◐ |
| Prototype | Hover / drag / key triggers, overlays, scroll, transitions, flow starting points, device frames | ❌ |
| Dev Mode | Ready-for-dev status, annotations, compare changes, variables in code | ❌ |
| Collaboration | Live cursors, comment notifications and @mentions, branching, team libraries | ❌ needs a backend |
