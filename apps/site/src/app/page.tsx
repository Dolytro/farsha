import { Landing } from "../components/landing/Landing";
import { FAQ } from "../components/landing/faq-data";
import { CONTACT_EMAIL, MAKER, REPO_URL, SOCIALS, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "../lib/seo";
import "../styles/landing.scss";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${MAKER.url}/#organization`,
      name: MAKER.name,
      url: MAKER.url,
      email: CONTACT_EMAIL,
      contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: CONTACT_EMAIL, availableLanguage: "English" },
      sameAs: ["https://github.com/Dolytro", ...SOCIALS.map((x) => x.url)],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${MAKER.url}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "DesignApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires a modern web browser with JavaScript",
      softwareVersion: "0.0.1",
      license: "https://opensource.org/licenses/MIT",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@id": `${MAKER.url}/#organization` },
      publisher: { "@id": `${MAKER.url}/#organization` },
      sameAs: [REPO_URL],
      codeRepository: REPO_URL,
      installUrl: `${SITE_URL}/app`,
      potentialAction: { "@type": "UseAction", target: `${SITE_URL}/app` },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQ.map(([name, text]) => ({
        "@type": "Question",
        name,
        acceptedAnswer: { "@type": "Answer", text },
      })),
    },
  ],
};

export default function Home() {
  return (
    <main id="main">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Landing />
    </main>
  );
}
