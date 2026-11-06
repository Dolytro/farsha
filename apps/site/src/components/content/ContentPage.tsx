import type { ReactNode } from "react";
import { SocialLinks } from "./SocialLinks";
import { CookieSettingsLink } from "@farsha/ui/analytics";
import "../../styles/content-page.scss";
import { CONTACT_EMAIL, DONATE_URL, MAKER, REPO_URL, SITE_URL } from "../../lib/seo";

type Props = {
  /** Path of this page, for the breadcrumb data, e.g. "/features". */
  path: string;
  title: string;
  children: ReactNode;
};

/** Header, breadcrumb and footer shared by the plain content pages (features, Figma alternative). */
export function ContentPage({ path, title, children }: Props) {
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Farsha", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}${path}` },
    ],
  };
  return (
    <div className="content-page">
      <header className="content-page__bar">
        <a className="content-page__brand" href="/">
          Farsha
        </a>
        <nav className="content-page__nav" aria-label="Main">
          <a href="/features">Features</a>
          <a href="/figma-alternative">Figma alternative</a>
          <a href={REPO_URL}>GitHub</a>
        </nav>
        <a className="content-page__cta" href="/app">
          Open the editor
        </a>
      </header>
      <main className="content-page__main" id="main">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, "\\u003c") }} />
        <p className="content-page__crumbs">
          <a href="/">Farsha</a> / {title}
        </p>
        {children}
      </main>
      <footer className="content-page__foot">
        <span>
          Made by <a href={MAKER.url}>{MAKER.name}</a>. Free and open source (MIT). Not affiliated with Figma, Inc.
        </span>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        {DONATE_URL ? <a href={DONATE_URL}>Buy me a coffee</a> : null}
        <CookieSettingsLink gaId={process.env.NEXT_PUBLIC_GA_ID} />
        <SocialLinks tone="dark" />
      </footer>
    </div>
  );
}
