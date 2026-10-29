# Canvylo vs Figma: feature gap

Status: ✅ done · 🟡 partial · ❌ missing. Priority: **P1** (needed to design real screens), **P2** (daily convenience), **P3** (later / optional).

Sources: items marked (menu) were read from Figma's live editor menus (File, Edit, View, Object, Preferences). The test file was view-only, so Edit and Object showed fewer items than a full editor; the rest comes from Figma's regular editor.

## 1. Tools

| Feature | Status | Pri |
|---|---|---|
| Move (V), Hand (H) | ✅ | |
| Frame (F), Rectangle (R), Ellipse (O), Text (T) | ✅ | |
| Scale tool (K) | ❌ | P3 |
| Section, Slice | ❌ | P3 |
| Line, Arrow | ❌ | P1 |
| Polygon, Star | ❌ | P2 |
| Image / video placement, paste or drop an image | ❌ | P1 |
| Pen / vector editing, Pencil | ❌ | P2 |
| Comment tool (C) | ❌ | P2 |
| Color picker / eyedropper (I) (menu) | ❌ | P2 |
| Tool dropdowns with variants in the toolbar | ❌ | P2 |
| "Keep tool selected after use" setting (menu) | ❌ | P3 |

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
| Select none / inverse / matching (Ctrl+Shift+A, Ctrl+Alt+A) (menu) | ❌ | P2 |
| Select children (Enter), select parent (Shift+Enter), Tab to next | ❌ | P2 |
| Double-click to enter a group; Figma selects the top-level layer first | ❌ | P1 |
| Resize from all 8 handles, Shift = keep ratio, Alt = from center | 🟡 corners only | P1 |
| Rotate handle, rotate with Ctrl+Alt+arrows (menu) | 🟡 numeric only | P1 |
| Flip horizontal / vertical | ❌ | P2 |
| Rename (F2 / Ctrl+R / double-click), lock (Ctrl+Shift+L), hide (Ctrl+Shift+H); locked layers cannot be picked or nudged on the canvas | ✅ | |
| Snapping, smart guides, pixel snapping | ❌ | P1 |
| Align and distribute, Tidy up | ❌ | P1 |
| Boolean operations, flatten, outline stroke | ❌ | P3 |
| Mask (Ctrl+Alt+M), frame selection (Ctrl+Alt+G) | ❌ | P2 |
| Right-click context menu (Figma items; read-only in Dev Mode; none on view links; submenu is a flat "Copy/Paste as" group) | ✅ | |
| Command palette "Actions" (Ctrl+K) (menu) | ❌ | P2 |
| Find (Ctrl+F), find next / previous (menu) | ❌ | P3 |
| Draggable layer reorder, drag to reparent (drop on a frame or group) | ✅ | |
| Layers panel: expand / collapse, search, lock icon, rename (selecting on canvas does not auto-expand parents yet) | ✅ | |
| Pages: add, rename (double-click), delete, switch (click, Page Up / Down); each page remembers its pan and zoom | ✅ | |

## 3. Design panel (right sidebar)

| Section | Status | Missing |
|---|---|---|
| Position | 🟡 | Alignment row, constraints, rotation handle |
| Layout | 🟡 | **Auto Layout** (direction, gap, padding, wrap), hug / fill / fixed sizing, min / max, layout grids, clip content toggle |
| Appearance | 🟡 | Independent corner radius done for rectangles and frames (not images). Blend mode (16 modes, no Pass through / Plus darker / Plus lighter) done. Missing: corner smoothing |
| Fill | 🟡 | Solid, linear and radial gradients (add / remove stops, position, opacity, angle) done. Gradient angle is in bounding-box units, so it skews on non-square layers. Gradient text and strokes show the first stop only; SVG / Figma paste still flatten gradients. Missing: multiple fills, image fill, angular / diamond gradients, handles on canvas, hex input, styles, variables |
| Stroke | 🟡 | Color, opacity, weight, position (inside / center / outside) done. Missing: per-side weights, dash, caps, joins, arrowheads, multiple strokes. |
| Effects | 🟡 | Drop shadow, inner shadow, layer blur (hide / remove / change type) done. Missing: shadow spread, background blur, show-behind, multiple blurs. Shadow offset rotates with a rotated layer. Dev Mode CSS shows outside strokes as an inside border. |
| Typography | 🟡 | Content, font family (a short built-in list, system fonts only), weight names, size, line height, letter spacing, text align (left / center / right) done. Missing: Google Fonts, paragraph spacing, vertical align, decoration, case, auto width / height / fixed, wrapping and multi-line text, truncate, lists, mixed styles inside one text box |
| Selection colors | ❌ | |
| Export | ❌ | PNG / JPG / SVG / PDF, 1x–4x, suffix, export frames to PDF (menu) |
| Constraints | ❌ | Left / right / top / bottom / center / scale |

## 4. Components and design system

| Feature | Status | Pri |
|---|---|---|
| Components, instances, detach, overrides | ❌ | P1 |
| Variants and component properties | ❌ | P2 |
| "Main component" (Object menu) (menu) | ❌ | P1 |
| Color / text / effect / grid styles | ❌ | P2 |
| Variables (color, number, string, boolean) and modes (light / dark) | ❌ | P2 |
| Libraries, publish, update | ❌ | P3 |

## 5. Prototype

Interactions (click / hover / drag), navigate / overlay / back, transitions, smart animate, flows, present mode, device frames: all ❌ (P2).

## 6. Dev Mode

| Feature | Status |
|---|---|
| Inspect size, position, colors, typography | ✅ |
| Copy CSS / HTML / React / Tailwind | ✅ |
| Alt-hover distances | ✅ |
| Asset export (SVG / PNG) from inspect | ❌ |
| Ready-for-dev status, annotations, compare changes | ❌ |
| iOS / Android snippets, Code Connect, variables in code | ❌ |
| Spacing and padding visualization (box model) | ❌ |

## 7. View menu and canvas helpers

| Feature | Status | Pri |
|---|---|---|
| Zoom in / out / 100% / fit / selection, pan, canvas-only zoom | ✅ | |
| Zoom to next / previous frame (N / Shift+N), Home / End (menu) | ❌ | P2 |
| Pixel grid (Shift+') and pixel preview (menu) | ❌ | P2 |
| Rulers (Shift+R) and guides, layout guides (Shift+G) (menu) | ❌ | P1 |
| Outlines, mask outlines, frame outlines (menu) | ❌ | P3 |
| Minimize UI / hide UI (Ctrl+\\) (menu) | ❌ | P3 |
| Multiplayer cursors (menu) | ❌ | P3 |
| Comments (Shift+C) and annotations (Shift+Y) visibility (menu) | ❌ | P2 |
| Dev Mode toggle (Shift+D) | ✅ | |

## 8. File and project

| Feature | Status | Pri |
|---|---|---|
| Save / open / autosave (Google Drive), new file | ✅ | |
| Rename the file (title in the top bar) | ❌ | P1 |
| Home / recent files / folders / trash | ❌ | P2 |
| Duplicate, "Save local copy" (.canvylo download), import local file (menu) | ❌ | P1 |
| Export all (File → Export, Ctrl+Shift+E), export frames to PDF (menu) | ❌ | P2 |
| Import SVG / images / drag and drop files | ❌ | P1 |
| Version history, restore | ❌ | P2 |
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
| Keep tool selected after use | ❌ |
| Use alternate zoom handling | ❌ |
| Highlight layers on hover | ✅ always on |
| Show dimensions on objects | ✅ always on |
| Hide canvas UI during changes | ❌ |
| Keyboard zooms into selection | ❌ |
| Invert zoom direction | ❌ |
| Ctrl+click opens right-click menus | ❌ |
| Use scroll wheel zoom (instead of pan) | ❌ |
| Right-click and drag to pan | ❌ |
| Theme (light / dark / system) | ❌ (light only) |
| Snapping, nudge amount, color profile | ❌ |
| Keyboard layout, accessibility settings | ❌ |
| Keyboard shortcuts cheat sheet (Ctrl+Shift+?) | ❌ |
| Help and account menu, sign out in a profile menu | 🟡 sign out is in ☁ |

## 11. Quality

- Performance: SVG renderer slows with thousands of nodes; no Canvas / WebGL path yet.
- Text: no real measurement or line breaking; auto-width is approximate; limited fonts.
- Images are not supported yet, so there is no asset pipeline.
- Accessibility: keyboard navigation and screen-reader support are minimal.
- Touch / trackpad gestures beyond pinch zoom, mobile layout of the editor.

## Suggested build order

1. **Copy / cut / paste, select all, right-click menu, rename / lock, layer drag-reorder, pages.**
2. **Stroke, effects (shadow / blur), text controls, gradients, export (PNG / SVG).**
3. **Auto Layout + constraints, snapping and smart guides, align / distribute, rulers and guides.**
4. **Images (paste / drop / fill), Line / Arrow / Polygon / Star, Pen.**
5. **Components, variants, styles, variables.**
6. **Prototype, comments, live collaboration.**
