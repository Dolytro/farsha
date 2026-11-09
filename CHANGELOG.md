# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The live site at https://farsha.org always runs `main`.

## Unreleased

## [0.0.2] - 2026-11-09

A big editor release: about 200 new editor features, a rebuilt site, and SEO and legal pages.

### Added
- **Editor shortcuts and search**: keyboard shortcuts cheat sheet (Ctrl+Shift+?), recent actions and page / layer search in the Actions palette, layer type filter, Find next / previous, Shift+Backspace for Delete and heal, View > Minimize left bar and Toggle variables panel.
- **Preferences**: rename duplicated layers, keyboard zoom into selection, Ctrl+click opens the menu, smart quotes, Ctrl+Alt+arrows to rotate, flip objects while resizing, hide canvas UI during changes, reduce motion.
- **Shapes and fills**: polygon and star (sides, points, ratio, corner radius), ellipse arc and sweep, gradient strokes, several fills and strokes on text, fill blend modes, image adjustments (exposure, contrast, saturation, temperature, tint, highlights, shadows), tile and crop image modes, gradient handle on the canvas, luminance mask.
- **Text**: small caps, OpenType features, decoration style (solid, dotted, wavy), colour per range of characters.
- **Selection and layout**: resize and rotate several layers at once, smart guides while resizing, equal spacing guides, snap to pixel grid and layout grids, drag layers into or out of frames, auto layout grid, min / max size limits, reorder auto layout children by dragging, text baseline alignment, Rename layers dialog, Design panel editing for several layers.
- **Layers and pages**: Shift / Ctrl select, Alt+click eye and chevron shortcuts, drag across eyes and locks, reorder and duplicate pages, folders in Assets and Styles.
- **Components**: descriptions, search and drag from Assets, swap instance picker, push changes to main, keep overrides when switching variants, dashed component set frame.
- **Styles**: effect, grid and stroke styles with in-place rename.
- **Variables**: several collections with their own modes, aliases, groups, scopes, explicit mode per frame, JSON export and import.
- **Prototype**: named flows, Set variable, Set variable mode, Conditional, Change to and media controls actions, Move in / out, Push and Slide transitions, background colour and scale options, R restarts Present.
- **Dev Mode**: box model, SwiftUI, Jetpack Compose, UIKit, Android XML, Vue and Flutter output, Ready for dev list, dev resources, copyable sections, better CSS for strokes and gradient text.
- **Sharing and files**: link that opens on a selected layer, embed code for view-only links, drop a `.farsha` file on the canvas, iOS and Android export presets, export contents only.
- **Versions and offline**: automatic versions every ten minutes, descriptions for saved versions, the editor opens offline after the first visit (service worker and web app manifest).
- **Site**: privacy policy and terms of service pages, features and Figma alternative pages, SEO metadata, sitemap and social cards, consent-based analytics with cookie settings, social links.
- **Accessibility**: roles and keyboard navigation in the layers tree.

### Changed
- The site styles moved to SCSS with BEM blocks.
- The layers list draws only the rows in view and text widths are cached.
- The README has a star history chart.

### Fixed
- Boolean operations keep arcs, rounded polygons and rounded stars as their real outline.
- Keyboard focus stays on the selected layer row after the list scrolls.

## [0.0.1] - 2026-11-04

First public release of Farsha, a free and open source, Figma-like design tool that runs in the browser.

### Added
- The design editor with Figma's names, shortcuts and panels, saving `.farsha` files to your own Google Drive (no backend).
- Dev Mode with code generation, and share links.
- The landing site at https://farsha.org and a starter file that opens on a fresh canvas.
- Open source project files: contributing guide, code of conduct, security policy, support guide, issue and pull request templates, CI, Dependabot, CODEOWNERS and EditorConfig.

### Notes
- Google sign-in is not public yet because the Google Cloud project is not published. Drive saving stays off for visitors until then.
