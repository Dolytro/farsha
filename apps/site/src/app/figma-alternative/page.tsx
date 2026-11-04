import type { Metadata } from "next";
import { ContentPage } from "../../components/content/ContentPage";

const TITLE = "A free, open source Figma alternative";
const DESCRIPTION =
  "Farsha is a free, open source Figma alternative that runs in your browser. Same panel names and shortcuts, Dev Mode code copy, and your files stay in your own Google Drive. See what works today and what does not yet.";

export const metadata: Metadata = {
  title: "Free Figma alternative",
  description: DESCRIPTION,
  alternates: { canonical: "/figma-alternative" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/figma-alternative", type: "website" },
};

const ROWS: [string, string, string][] = [
  ["Price", "Free, no seats or plans", "Free plan, paid plans for teams and more files"],
  ["Source code", "Open source (MIT)", "Closed source"],
  ["Where files live", "Your own Google Drive, or a local .farsha file", "Figma's cloud"],
  ["Panels, tools, shortcuts", "Same names and order as Figma", "The original"],
  ["Auto layout, components, variants", "First versions, still growing", "Complete"],
  ["Dev Mode code", "CSS, HTML, React and Tailwind copy", "CSS and more, with extra developer features"],
  ["Prototype", "Click to navigate and present full screen", "Rich interactions and animation"],
  ["Live multiplayer editing", "Not yet", "Yes"],
  ["Plugins and libraries", "Not yet", "Yes"],
];

export default function FigmaAlternativePage() {
  return (
    <ContentPage path="/figma-alternative" title="Figma alternative">
      <h1>A free, open source Figma alternative</h1>
      <p className="cp__lead">
        Farsha is a design tool that runs in your browser and costs nothing. It follows Figma&apos;s panel names, tool order and
        shortcuts, so you can start without relearning anything, and your files stay in your own Google Drive.
      </p>
      <div className="cp__actions">
        <a className="cp__cta" href="/app">Open the editor</a>
        <a className="cp__cta cp__cta--ghost" href="https://github.com/Dolytro/farsha">Star on GitHub</a>
      </div>

      <h2>Who Farsha is for</h2>
      <ul>
        <li>Students, hobbyists and small teams who want to design screens without paying for seats.</li>
        <li>Developers who want to inspect a design and copy CSS, HTML, React or Tailwind.</li>
        <li>People who prefer open source tools and want to keep their own files.</li>
      </ul>

      <h2>Farsha and Figma side by side</h2>
      <div className="cp__wrap">
        <table className="cp__table">
          <thead>
            <tr><th scope="col">&nbsp;</th><th scope="col">Farsha</th><th scope="col">Figma</th></tr>
          </thead>
          <tbody>
            {ROWS.map(([what, farsha, figma]) => (
              <tr key={what}>
                <th scope="row">{what}</th>
                <td>{farsha}</td>
                <td>{figma}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Honest about the gaps</h2>
      <p>
        Farsha is early. It covers everyday design work, but it is not at full Figma parity. Live multiplayer editing, component
        libraries and plugins are not there yet, and pasting from Figma does not bring over auto layout, components or effects.
        The full, public checklist is the{" "}
        <a href="https://github.com/Dolytro/farsha/blob/main/docs/FEATURE_GAP.md">feature gap list</a>, and it is updated as features land.
      </p>

      <h2>Try it in a minute</h2>
      <ol>
        <li>Open the <a href="/app">editor</a>. No account is needed to start; your work is kept in your browser.</li>
        <li>Press Ctrl+K to search every action and its shortcut.</li>
        <li>Download a local <code>.farsha</code> copy or save to Google Drive to keep your file.</li>
      </ol>
      <p className="cp__note">
        Farsha is an independent project, not affiliated with, endorsed by or sponsored by Figma, Inc. &quot;Figma&quot; is a trademark of
        Figma, Inc., used here only to describe compatibility of workflow.
      </p>
    </ContentPage>
  );
}
