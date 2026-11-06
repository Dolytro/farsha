import type { Metadata } from "next";
import { ContentPage } from "../../components/content/ContentPage";

const TITLE = "Features";
const DESCRIPTION =
  "What Farsha can do today: Figma-style design tools, auto layout, components, Dev Mode with CSS, HTML, React and Tailwind code, prototype present mode, PNG, JPG, SVG and PDF export, and share links. Free and open source.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/features" },
  openGraph: { title: `Farsha ${TITLE}`, description: DESCRIPTION, url: "/features", type: "website" },
};

export default function FeaturesPage() {
  return (
    <ContentPage path="/features" title={TITLE}>
      <h1>Farsha features</h1>
      <p className="content-page__lead">
        Farsha is a free, open source design tool that runs in your browser. It copies Figma&apos;s panel names, tool order and
        shortcuts, so if you know Figma you already know where things are. This page lists what works today.
      </p>
      <div className="content-page__actions">
        <a className="content-page__cta" href="/app">Open the editor</a>
        <a className="content-page__cta content-page__cta--ghost" href="/figma-alternative">Farsha vs Figma</a>
      </div>

      <h2>Design</h2>
      <ul>
        <li>Frame, rectangle, ellipse, polygon, star, line, arrow, text, pen and pencil tools, with Figma&apos;s keyboard shortcuts.</li>
        <li>Fills (solid, linear and radial gradients, images), strokes, drop and inner shadows, layer and background blur, blend modes.</li>
        <li>Auto layout (a first version): direction, gap, padding, alignment and hug or fixed sizing.</li>
        <li>Constraints, snapping and smart guides, align and distribute, boolean operations, masks, groups and pages.</li>
        <li>Components with variants, properties and instances, colour and text styles, colour variables with light and dark modes.</li>
        <li>Rulers, guides, layout guides and an Actions command palette (Ctrl+K) that doubles as a shortcut cheat sheet.</li>
      </ul>

      <h2>Dev Mode</h2>
      <ul>
        <li>Inspect size, position, colours and typography, and see distances by holding Alt while hovering.</li>
        <li>Copy CSS, HTML, React or Tailwind for any layer.</li>
        <li>Export assets as PNG, JPG or SVG at 0.5x to 4x, or frames to PDF through the print dialog.</li>
        <li>Toggle Dev Mode with Shift+D, the same shortcut as Figma.</li>
      </ul>

      <h2>Prototype</h2>
      <p>Link layers to frames with an On click action, then present full screen and click through the flow.</p>

      <h2>Your files, your Google Drive</h2>
      <ul>
        <li>Designs are saved as <code>.farsha</code> files in your own Google Drive. Farsha has no server or database of its own.</li>
        <li>You can also download a local <code>.farsha</code> copy and open it again without signing in.</li>
        <li>Turn on &quot;Anyone with the link can view&quot; to share a view link, with an Inspect mode for developers.</li>
        <li>Named versions you can restore, and autosave of your working copy in the browser.</li>
      </ul>

      <h2>Bring work from Figma</h2>
      <p>
        Copy frames, text, shapes and vectors in Figma and paste them into Farsha. You can also paste SVG and drop in PNG, JPEG, WebP
        or GIF images. Auto layout, components and effects from Figma do not carry over yet.
      </p>

      <h2>Not built yet</h2>
      <div className="content-page__note">
        Live multi-user editing and cursors, per-person invites, share link passwords, publishing component libraries, branching and a
        full offline sync queue are not built yet. Follow progress in the{" "}
        <a href="https://github.com/Dolytro/farsha/blob/main/docs/FEATURE_GAP.md">feature gap list</a>.
      </div>
    </ContentPage>
  );
}
