# Canvylo — Full Product & Architecture Plan

> **Revision notes (v1.1):** Fastify chosen over NestJS. Yjs document is the single source of truth; undo/redo uses `Y.UndoManager`. Child ordering uses fractional indexes (`parentId` + `orderKey`), not `children: string[]`. IDs are nanoid. Renderer must stay abstracted (SVG first, hot paths may move to Canvas). Text rendering gets its own spike in Phase 1. A small vertical-slice milestone (Section 50a) precedes the full MVP. PDF export runs server-side in `apps/worker` (headless render).

> **Goal:** Build a free, self-hostable design tool that covers the core 80–90% everyday workflow of Figma for UI/UX design, prototyping, developer handoff, sharing, and collaboration.
>
> **Scope rule:** Advanced/rare features are intentionally excluded from the core build. The product should be highly usable without trying to reproduce every Figma feature.

---

## 1. Product Goal

The tool should allow a designer to:

1. Create a design from scratch.
2. Organize pages, frames, sections, and layers.
3. Create UI elements with vector shapes, text, images, and reusable components.
4. Build responsive layouts using Auto Layout and constraints.
5. Create design systems with components, variants, styles, and variables.
6. Create clickable prototypes.
7. Share a view-only or developer-inspection link.
8. Let developers inspect dimensions, spacing, typography, colors, CSS, React, and Tailwind.
9. Export designs and assets.
10. Collaborate with other users.
11. Comment and review work.
12. Restore previous versions.

The primary workflow is:

```text
Design
  ↓
Organize
  ↓
Style
  ↓
Responsive Layout
  ↓
Components / Design System
  ↓
Prototype
  ↓
Developer Handoff
  ↓
Share / Review
  ↓
Version History
```

---

# 2. Core Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Zustand
- SCSS + BEM
- SVG-based rendering initially

## Backend

- Node.js
- Fastify
- TypeScript
- PostgreSQL
- Drizzle ORM

## Realtime Collaboration

- WebSocket
- Yjs / CRDT-based synchronization

## File / Asset Storage

- S3-compatible object storage
- Cloudflare R2 for hosted deployment
- MinIO for local/self-hosted development

## Local Storage

- IndexedDB

## Authentication

- Email/password initially
- OAuth later

## Testing

- Vitest
- React Testing Library
- Playwright

## Deployment

- Docker
- Caddy or Nginx
- PostgreSQL
- Object storage

## Monorepo

Use pnpm + Turborepo.

Suggested structure:

```text
design-tool/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
│
├── packages/
│   ├── design-core/
│   ├── canvas-engine/
│   ├── layout-engine/
│   ├── prototype-engine/
│   ├── collaboration/
│   ├── code-generator/
│   ├── ui/
│   └── types/
│
├── database/
├── docker/
└── docs/
```

---

# 3. The Most Important Architecture Decision

The application must be based around a **single structured Design Document Model**.

The canvas, layers panel, properties panel, prototype player, developer mode, export system, and collaboration system should all consume the same model.

```text
                    DESIGN DOCUMENT
                          │
          ┌───────────────┼────────────────┐
          │               │                │
        Editor         Prototype       Developer
          │               │                │
          ├───────────────┼────────────────┤
          │
        Export
          │
      Collaboration
```

Do NOT build separate data structures for each feature.

---

# 4. Design Document Model

A design is a tree of nodes.

Example:

```text
Document
├── Page
│   ├── Section
│   │   ├── Frame
│   │   │   ├── Text
│   │   │   ├── Rectangle
│   │   │   └── Image
│   │   └── Frame
│   └── Frame
│
└── Components
    ├── Button
    └── Card
```

Basic node structure:

```ts
interface BaseNode {
  id: string;
  type: NodeType;
  name: string;
  parentId: string | null;
  orderKey: string; // fractional index among siblings (CRDT-safe); children are derived by parentId

  x: number;
  y: number;
  width: number;
  height: number;

  rotation: number;
  opacity: number;

  visible: boolean;
  locked: boolean;
}
```

The actual implementation should use typed node interfaces rather than one huge loose object.

**IDs and ordering (decided):** IDs are collision-safe nanoids from Phase 0 (safe for offline/concurrent creation). Child order is derived from `parentId` + `orderKey` (fractional indexing), so concurrent reorders/inserts merge cleanly in Yjs. Children are computed by indexing, never stored as an array.

---

# 5. Core Node Types

## Document Structure

- DOCUMENT
- PAGE
- SECTION
- FRAME
- GROUP

## Basic Design Elements

- RECTANGLE
- ELLIPSE
- LINE
- POLYGON
- STAR
- VECTOR
- TEXT
- IMAGE

## Reusable Design System

- COMPONENT
- INSTANCE

These are the required core node types.

---

# 6. Canvas

## Features

- Infinite canvas
- Zoom
- Pan
- Selection
- Multi-selection
- Move
- Resize
- Rotate
- Duplicate
- Delete
- Copy/paste
- Alignment
- Distribution
- Smart guides
- Snapping
- Rulers
- Guides
- Pixel grid
- Lock/unlock
- Hide/show

## How it works

The canvas renders the design document.

User interaction follows:

```text
Pointer Event
    ↓
Hit Testing
    ↓
Selected Node
    ↓
Transform Controller
    ↓
Design Model Update
    ↓
Renderer Update
```

A transform should not directly manipulate random DOM elements. It must update the design model.

---

# 7. Rendering Architecture

## Initial renderer

Use SVG as the first renderer.

Reasons:

- Excellent vector support
- Easy text rendering
- Easy selection overlays
- Easy export to SVG
- Easy mapping to CSS-like properties
- Easier initial implementation than a complete WebGL engine

Architecture:

```text
Design Model
     ↓
Scene Graph
     ↓
SVG Renderer
     ↓
Canvas
```

The renderer should be abstracted so a faster Canvas/WebGL renderer can be introduced later without rewriting the design model.

**Note (decided):** SVG stays the default renderer, but hot paths (selection overlay, drag/resize feedback, large node counts) may move to Canvas. Therefore a `Renderer` interface (mount, render(scene), hitTest, setViewport, dispose) must exist **from Phase 1**, and the editor must never touch renderer DOM directly.

Performance note: SVG DOM degrades with thousands of nodes. Hot paths (selection overlay, drag handles, guides) should be drawn in a separate overlay layer from Phase 1, and the `Renderer` interface must be defined in Phase 1 so a Canvas/WebGL backend can replace SVG.

---

# 8. Layer System

The Layers panel represents the design tree.

Features:

- Nested layers
- Rename
- Reorder
- Drag/drop
- Group
- Ungroup
- Lock
- Hide
- Search
- Expand/collapse
- Select layer
- Multiple selection

Layer operations must update the document tree rather than maintaining a separate layer state.

---

# 9. Basic Shapes

Required:

- Rectangle
- Rounded rectangle
- Ellipse
- Line
- Arrow
- Polygon
- Star
- Basic vector/path

## Vector scope

Support:

- Pen tool
- Points
- Handles
- Basic path editing
- Fill
- Stroke
- Basic boolean operations

Do NOT attempt Illustrator-level vector editing in the core version.

---

# 10. Text System

Required:

- Font family
- Font size
- Weight
- Line height
- Letter spacing
- Text alignment
- Paragraph alignment
- Text color
- Text transform
- Text box sizing
- Basic text wrapping

Text should remain a structured TEXT node.

Example:

```ts
interface TextNode {
  type: "TEXT";
  characters: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number | "AUTO";
  letterSpacing: number;
  textAlign: "LEFT" | "CENTER" | "RIGHT";
}
```

---

# 11. Image System

Required:

- Upload image
- Place image
- Crop
- Resize
- Image fill
- Basic masking
- Replace image
- Export image

Asset flow:

```text
Browser
  ↓
Upload API
  ↓
Object Storage
  ↓
Asset ID
  ↓
IMAGE Node
```

Images should not be embedded directly into the design JSON.

---

# 12. Styling System

Every compatible node can support:

- Fill
- Multiple fills
- Stroke
- Stroke width
- Stroke alignment
- Border radius
- Individual corner radius
- Opacity
- Blend mode
- Shadow
- Multiple shadows
- Blur
- Background blur
- Gradient
- Image fill

Styles should be represented as structured values so the inspector and code generators can read them.

---

# 13. Typography System

Typography properties:

- Font family
- Font size
- Font weight
- Line height
- Letter spacing
- Alignment
- Text case
- Paragraph spacing

Later these properties can be bound to design tokens.

---

# 14. Auto Layout

Auto Layout is a core feature and must have its own layout engine.

Properties:

- Horizontal
- Vertical
- Gap
- Padding
- Alignment
- Distribution
- Fixed width
- Fixed height
- Hug contents
- Fill container
- Min width
- Max width
- Min height
- Max height
- Wrapping
- Nested layouts

Concept:

```text
Parent Frame
  ↓
Layout configuration
  ↓
Calculate available space
  ↓
Calculate child sizes
  ↓
Apply gap/padding
  ↓
Apply alignment
  ↓
Final child positions
```

Do not implement Auto Layout as simple UI positioning hacks. It should be a deterministic layout engine.

---

# 15. Constraints / Responsive Layout

Support:

- Left
- Right
- Top
- Bottom
- Center
- Scale
- Fixed position

A child should store its relationship to its parent.

Example:

```text
Parent: 1440px
Child:
  left = 40
  right = 40
```

When the parent changes size, the constraint engine calculates the new position/size.

---

# 16. Responsive Preview

Core support:

- Desktop
- Tablet
- Mobile
- Custom viewport width

A designer should be able to preview the same design at different viewport sizes.

Optional later feature:

- Named breakpoints

---

# 17. Components

Components are reusable master designs.

Structure:

```text
Main Component
    ↓
Instance
    ↓
Instance
    ↓
Instance
```

Features:

- Create component
- Create instance
- Edit main component
- Instance updates
- Instance overrides
- Detach instance
- Swap instance

The component system should reference nodes rather than duplicate the full master data unnecessarily.

---

# 18. Variants

Support:

- Variant sets
- Variant properties
- State variations

Example:

```text
Button
├── Primary
├── Secondary
├── Disabled
└── Loading
```

Variant selection should be represented as structured component properties.

---

# 19. Component Properties

Support:

- Boolean properties
- Text properties
- Instance swap properties
- Variant properties

This allows reusable components without requiring advanced plugin systems.

---

# 20. Styles

Reusable styles:

- Color styles
- Text styles
- Effect styles
- Layout-related tokens where appropriate

A style reference should be stored rather than duplicating the style value everywhere.

---

# 21. Variables / Design Tokens

Support variable types:

- Color
- Number
- String
- Boolean

Example:

```text
color.primary = #388BFF
spacing.md = 16
radius.md = 8
font.body = Inter
```

A node can bind a property to a variable:

```text
Button.fill → color.primary
```

Changing the variable updates all bound nodes.

---

# 22. Variable Modes

Core modes:

```text
Light
Dark
```

Example:

```text
color.background
Light → #FFFFFF
Dark  → #111827
```

The same design can preview different modes without duplicating the design.

---

# 23. Undo / Redo

Use operation-based history on top of the Yjs document (`Y.UndoManager`). The Yjs doc is the source of truth; operations are typed commands that mutate it inside transactions.

Operations:

```text
CREATE_NODE
DELETE_NODE
MOVE_NODE
RESIZE_NODE
ROTATE_NODE
CHANGE_STYLE
CHANGE_TEXT
REORDER_NODE
CREATE_COMPONENT
CHANGE_VARIABLE
```

Flow:

```text
User Action
    ↓
Operation
    ↓
Apply to document
    ↓
Add to history
```

Undo reverses the operation.

Redo reapplies it.

---

# 24. Prototype Engine

Prototype is a graph on top of the design document.

Example:

```json
{
  "trigger": "CLICK",
  "action": "NAVIGATE",
  "sourceNode": "button_1",
  "destination": "dashboard",
  "transition": "SMART"
}
```

Support:

- Click
- Hover
- Press
- Drag
- Navigate
- Back
- Open overlay
- Close overlay
- Delay
- Scroll
- Basic transitions
- Basic smart animation

---

# 25. Prototype Player

The prototype player should be separate from the editor.

```text
Design Document
      ↓
Prototype Graph
      ↓
Prototype Runtime
      ↓
Preview
```

This prevents prototype state from interfering with editing state.

---

# 26. Developer Mode

Developer mode is a first-class product feature.

Developer can select any element and see:

```text
Width
Height
X
Y
Spacing
Padding
Margin-like relationships
Typography
Colors
Borders
Radius
Shadows
Assets
```

Developer mode should never modify the original design.

---

# 27. Code Generation

Initial targets:

- CSS
- HTML
- React
- Tailwind CSS

Example:

```css
.button {
  width: 120px;
  height: 44px;
  padding: 0 20px;
  border-radius: 8px;
  background: #388BFF;
}
```

Architecture:

```text
Design Node
   ↓
Computed Style
   ↓
Code Generator
   ├── CSS
   ├── React
   ├── HTML
   └── Tailwind
```

New generators should be addable later without changing the design engine.

---

# 28. Asset Inspection

Developer can:

- Preview asset
- Download asset
- Copy asset URL when allowed
- Export SVG
- Export PNG/JPG
- Inspect dimensions

Asset permissions should be controlled by the share configuration.

---

# 29. Sharing

Share links are separate entities.

Example:

```text
ShareLink
├── token
├── fileId
├── permission
├── passwordHash
├── expiresAt
└── enabled
```

Permissions:

- VIEW
- COMMENT
- INSPECT
- EDIT

Important use case:

```text
https://design.example.com/s/abc123
```

A developer can open the link without editing the design.

---

# 30. View-only Mode

Viewer can:

- View design
- Zoom
- Pan
- Select elements
- Inspect properties if allowed
- Run prototype
- Download allowed assets

Viewer cannot:

- Move elements
- Delete elements
- Modify styles
- Modify text
- Change components
- Save changes

The server must enforce permissions. Hiding editor controls is not sufficient security.

---

# 31. Password-Protected Links

Optional share configuration:

```text
Public
Anyone with link
Password protected
Specific users
```

Password should be stored as a hash, never plaintext.

---

# 32. Link Expiration

Share link can have:

```text
No expiration
1 day
7 days
30 days
Custom date
```

Expired links return an access-denied response.

---

# 33. Comments

Comments attach to nodes or canvas coordinates.

```text
Comment
├── id
├── fileId
├── nodeId
├── authorId
├── position
├── message
├── createdAt
└── resolvedAt
```

Features:

- Add comment
- Reply
- Resolve
- Reopen
- Mention
- Comment indicator

Node references should remain stable when possible so comments survive layout changes.

---

# 34. Collaboration

Core realtime features:

- Multiple users
- Presence
- Cursor
- Live edits
- Selection indicators
- Comments

Architecture:

```text
User A
   ↓
WebSocket
   ↓
Realtime Server
   ↓
CRDT/Yjs
   ↓
User B
User C
```

Yjs/CRDT should be introduced at the document-operation layer rather than tied directly to React state.

---

# 35. Local-first Editing

The editor should remain usable even if the network briefly fails.

Architecture:

```text
Editor
 ↓
Local Design State
 ↓
IndexedDB
 ↓
Sync Queue
 ↓
Server
```

If offline:

```text
Edit
 ↓
IndexedDB
 ↓
Pending operations
```

When online:

```text
Pending operations
 ↓
Sync
 ↓
Server
```

This makes the editor more reliable.

---

# 36. File / Project Structure

Initial hierarchy:

```text
Workspace
└── Projects
    └── Design Files
        ├── Pages
        ├── Assets
        └── Components
```

Do not build complicated enterprise workspace hierarchy initially.

---

# 37. Database

Suggested tables:

```text
users
workspaces
projects
files
file_versions
assets
share_links
comments
comment_replies
permissions
sessions
```

Design nodes should NOT initially be stored as one database row per node.

Instead, use versioned document snapshots/operations.

Example:

```text
file_versions
├── id
├── file_id
├── snapshot
├── created_by
├── created_at
└── version_number
```

---

# 38. Version History

Support:

- Automatic versions
- Named versions
- Restore
- Version list
- Basic compare

Do not initially implement full Git-like branching/merging.

Version strategy:

```text
Snapshot
  +
Operations
  +
Operations
  +
Snapshot
```

Periodic snapshots prevent long replay chains.

---

# 39. Export

Required:

- SVG
- PNG
- JPG
- PDF
- JSON/design file

**PDF approach (decided):** server-side headless render in `apps/worker` (headless Chromium via Playwright prints the SVG/HTML render of the selected frames to PDF). Fonts are loaded server-side to match the editor. No client-side PDF library.

Export flow:

```text
Design Model
 ↓
Export Adapter
 ├── SVG
 ├── Raster
 ├── PDF
 └── JSON
```

---

# 40. Import

Core import:

- SVG
- Native JSON/design file

Later:

- Figma-compatible importer if technically/legal feasible

Do not make reverse-engineering proprietary binary formats a foundation requirement.

---

# 41. Keyboard Shortcuts

Core shortcuts:

- V — Move/select
- R — Rectangle
- T — Text
- F — Frame
- P — Pen
- G — Group
- Cmd/Ctrl + C
- Cmd/Ctrl + V
- Cmd/Ctrl + Z
- Cmd/Ctrl + Shift + Z
- Delete
- Arrow movement
- Shift + arrow
- Zoom shortcuts

Shortcut system should be configurable internally.

---

# 42. Context Menu

Right-click actions:

- Cut
- Copy
- Paste
- Duplicate
- Delete
- Group
- Ungroup
- Bring forward
- Send backward
- Lock
- Hide
- Create component
- Detach instance
- Copy CSS
- Copy link

Actions should be permission-aware.

---

# 43. Command Palette

A command palette can provide:

```text
Search commands...
```

Examples:

```text
Create frame
Create component
Show prototype
Export selection
Copy CSS
Lock selection
Toggle developer mode
```

This is useful but not a blocker for the first canvas milestone.

---

# 44. Search

Search within a file for:

- Layer name
- Text
- Component
- Page
- Variable

Later add workspace-wide search.

---

# 45. Performance Architecture

Performance targets:

- Smooth editing with hundreds/thousands of nodes
- Fast layer tree
- Lazy-load assets
- Avoid unnecessary React rerenders
- Batch document operations
- Memoize computed styles
- Use Web Workers for heavy calculations where useful

Important systems:

```text
Virtualized Layer Tree
Incremental Rendering
Memoized Layout
Lazy Assets
Batched Operations
```

---

# 46. Security

Server-side permission checks are mandatory.

Never trust:

```text
frontend hidden button
```

as security.

Every API must verify:

```text
User
 ↓
File permission
 ↓
Share permission
 ↓
Requested operation
```

For view-only links, the server must reject mutation requests.

---

# 47. Testing Strategy

## Unit tests

Test:

- Geometry
- Layout
- Constraints
- Variables
- Components
- Operations
- Undo/redo
- Prototype graph
- Code generation

## Integration tests

Test:

- Save/load
- Sharing
- Permissions
- Asset upload
- Version restore
- Collaboration sync

## E2E tests

Use Playwright for:

```text
Create file
 ↓
Create frame
 ↓
Add elements
 ↓
Style
 ↓
Auto Layout
 ↓
Component
 ↓
Prototype
 ↓
Share
 ↓
Developer inspect
```

This should be the primary golden-path test.

---

# 48. Development Phases

## Phase 0 — Foundation

- Monorepo
- TypeScript
- Design schema (Yjs-backed, nanoid IDs, parentId + orderKey)
- API
- Database
- Authentication
- File model
- Basic UI shell

## Milestone 0.5 — First Vertical Slice (before full MVP)

Goal: prove the whole pipeline end to end with the smallest feature set.

```text
Frame + Rectangle + Text
   ↓
Select / Inspect (size, position, colors, typography)
   ↓
Copy CSS
   ↓
View-only share link (server enforces read-only)
```

Only after this slice works do we build out the full MVP workflow (section 50).

## Phase 1 — Canvas MVP

- Renderer interface (SVG implementation; Canvas-ready)
- **Text-rendering spike:** evaluate font loading, measurement, wrapping, and SVG `<text>` vs foreignObject vs canvas for TEXT nodes; decide the measuring strategy before building the typography system
- Canvas
- Zoom
- Pan
- Frame
- Rectangle
- Ellipse
- Text
- Image
- Text rendering spike (font loading, measurement, line breaking)
- Renderer interface (SVG backend + overlay layer)
- Selection
- Move
- Resize
- Rotate
- Layers
- Undo/redo

## Phase 2 — Design Engine

- Fill
- Stroke
- Radius
- Shadow
- Typography
- Gradient
- Opacity
- Alignment
- Distribution
- Guides
- Snapping

## Phase 3 — Layout

- Auto Layout
- Constraints
- Responsive preview
- Nested layout

## Phase 4 — Design System

- Components
- Instances
- Variants
- Component properties
- Styles
- Variables
- Modes

## Phase 5 — Prototype

- Interactions
- Navigation
- Overlays
- Scrolling
- Transitions
- Prototype player

## Phase 6 — Developer Mode

- Inspector
- Measurements
- Typography
- Colors
- Assets
- CSS
- HTML
- React
- Tailwind

## Phase 7 — Sharing

- View links
- Inspect links
- Comment links
- Permissions
- Password
- Expiration

## Phase 8 — Collaboration

- WebSocket
- Yjs/CRDT
- Presence
- Cursor
- Live editing
- Comments

## Phase 9 — Versioning

- Snapshots
- Named versions
- Restore
- Basic comparison

## Phase 10 — Polish

- Keyboard shortcuts
- Context menus
- Command palette
- Search
- Performance
- Accessibility
- Responsive editor UI
- Error handling

---

# 49. Explicitly Out of Scope

The following are intentionally NOT part of the core product:

## Advanced Vector / Illustration

- Illustrator-level vector tools
- Mesh gradients
- Advanced brushes
- Complex vector networks
- Advanced path editing

## Advanced Animation

- Full timeline editor
- Keyframe editor
- Advanced physics
- After Effects-style animation
- Video editing
- Lottie editor

## Enterprise

- SCIM
- Enterprise SSO
- Advanced audit systems
- Enterprise governance
- Complex organization administration

## Product Ecosystem

- Full plugin marketplace
- Plugin runtime
- Developer marketplace

## Other Figma Products

- FigJam
- Figma Slides
- Figma Sites

## AI

- AI design generation
- AI writing
- AI image generation
- AI prototype generation

## Advanced Collaboration

- Complex branching/merging
- Git-style design branches
- Enterprise-grade conflict management

These may be future modules, but they should not influence the core architecture.

---

# 50. Recommended MVP Definition

The first genuinely useful release should support this exact workflow:

```text
Create file
    ↓
Create frame
    ↓
Create UI
    ↓
Add text / shapes / images
    ↓
Style everything
    ↓
Use Auto Layout
    ↓
Create components
    ↓
Create variables
    ↓
Create mobile layout
    ↓
Create prototype
    ↓
Preview prototype
    ↓
Generate developer link
    ↓
Developer selects element
    ↓
Inspect dimensions / typography / colors
    ↓
Copy CSS / React / Tailwind
    ↓
Download assets
```

If this workflow works reliably, the product has achieved its primary goal.

---

# 50a. First Vertical Slice (before full MVP)

```text
Frame + Rectangle + Text
    ↓
Select element
    ↓
Inspect dimensions / colors / typography
    ↓
Copy CSS
    ↓
View-only share link
```

Ship this end-to-end first to get early feedback, then grow toward the full MVP above.

---

# 51. Architecture Principles

1. **Design Model First**
2. **Renderer is replaceable**
3. **Editor state is not the source of truth**
4. **All mutations become operations**
5. **Undo/redo uses operations**
6. **Collaboration synchronizes operations/document state**
7. **Developer mode reads the same computed design model**
8. **Prototype reads the same document**
9. **Server enforces permissions**
10. **Offline editing is supported**
11. **Advanced features must not pollute the core model**
12. **Every major engine should be independently testable**

---

# 52. Final Architecture

```text
                           ┌─────────────────────┐
                           │       React UI      │
                           └──────────┬──────────┘
                                      │
                           ┌──────────▼──────────┐
                           │    Editor State     │
                           │      Zustand        │
                           └──────────┬──────────┘
                                      │
                           ┌──────────▼──────────┐
                           │   DESIGN CORE       │
                           │                     │
                           │ Nodes               │
                           │ Components          │
                           │ Variables           │
                           │ Styles              │
                           │ Operations          │
                           └───────┬───────┬─────┘
                                   │       │
                 ┌─────────────────┘       └─────────────────┐
                 │                                           │
        ┌────────▼────────┐                         ┌────────▼────────┐
        │ Canvas Engine   │                         │ Layout Engine   │
        │ SVG Renderer    │                         │ Auto Layout     │
        └────────┬────────┘                         │ Constraints      │
                 │                                  └────────┬────────┘
                 │                                           │
                 └─────────────────┬─────────────────────────┘
                                   │
                      ┌────────────▼────────────┐
                      │    COMPUTED DESIGN      │
                      └──────┬──────┬──────┬────┘
                             │      │      │
                       ┌─────▼─┐ ┌──▼───┐ ┌▼──────────┐
                       │Proto  │ │Dev   │ │ Export    │
                       │Engine │ │Mode  │ │ Engine    │
                       └───────┘ └──────┘ └───────────┘

                                   │
                          ┌────────▼────────┐
                          │   Sync Layer     │
                          │ WebSocket + Yjs  │
                          └────────┬────────┘
                                   │
                          ┌────────▼────────┐
                          │      API         │
                          │ Node + Fastify   │
                          └──────┬─────┬─────┘
                                 │     │
                    ┌────────────▼┐   ┌▼────────────┐
                    │ PostgreSQL  │   │ Object      │
                    │             │   │ Storage     │
                    └─────────────┘   └─────────────┘
```

---

# 53. Success Criteria

The project should be considered a successful core Figma replacement when a designer can complete a professional UI design without needing Figma for:

- Layout
- Styling
- Components
- Responsive design
- Design tokens
- Prototype
- Review
- Developer handoff
- Asset export
- Sharing

The goal is **not feature-count parity with Figma**.

The goal is **workflow parity for normal UI/UX work**.

---

## Final Core Scope

The planned core product contains roughly **70–80 capabilities**, grouped into these major systems:

1. Canvas
2. Layers
3. Shapes
4. Text
5. Images
6. Styling
7. Typography
8. Auto Layout
9. Constraints
10. Responsive preview
11. Components
12. Variants
13. Component properties
14. Styles
15. Variables
16. Modes
17. Undo/Redo
18. Prototype
19. Prototype Player
20. Developer Mode
21. Code Generation
22. Asset Inspection
23. Sharing
24. View-only mode
25. Password/expiration
26. Comments
27. Realtime collaboration
28. Local-first editing
29. Projects/files
30. Version history
31. Import/export
32. Keyboard shortcuts
33. Context menus
34. Command palette
35. Search
36. Performance infrastructure
37. Security/permissions
38. Testing infrastructure

These are the core product areas. Advanced features remain deliberately outside the first architecture and implementation scope.

---

# 54. Locked Decisions (v2)

| Topic | Decision |
|---|---|
| Name | Canvylo |
| Backend | Fastify |
| Source of truth | Yjs `Y.Doc`; React/Zustand hold only ephemeral UI state (tool, selection, viewport) |
| Undo/redo | `Y.UndoManager` |
| Tree structure | `parentId` + fractional `orderKey`; no `children: string[]` |
| IDs | nanoid from Phase 0 |
| Renderer | SVG first, behind a `Renderer` interface from Phase 1; Canvas may take over hot paths |
| Text | Spike in Phase 1 before typography work |
| First milestone | Vertical slice: frame + rect + text → inspect → copy CSS → view-only link |
| PDF export | Server-side headless render in `apps/worker` |
