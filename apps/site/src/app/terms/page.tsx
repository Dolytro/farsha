import type { Metadata } from "next";
import { ContentPage } from "../../components/content/ContentPage";
import { CONTACT_EMAIL, MAKER } from "../../lib/seo";

const TITLE = "Terms of Service";
const DESCRIPTION =
  "The terms for using Farsha, the free and open source design tool at farsha.org: your files stay yours, acceptable use, no warranty, and how the open source licence fits in.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: { title: `Farsha ${TITLE}`, description: DESCRIPTION, url: "/terms", type: "website" },
};

export default function TermsPage() {
  return (
    <ContentPage path="/terms" title={TITLE}>
      <h1>Terms of Service</h1>
      <p>Last updated: 4 November 2026</p>
      <p className="content-page__lead">
        These terms apply when you use the Farsha website and editor at <a href="https://farsha.org">farsha.org</a> (the “Service”). By
        using the Service you agree to them. If you do not agree, please do not use it.
      </p>

      <h2 id="who">Who we are</h2>
      <p>
        Farsha is made and run by <a href={MAKER.url}>{MAKER.name}</a> (“we”, “us”). Contact:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. How we handle data is explained in the <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2 id="service">The Service</h2>
      <p>
        Farsha is a free, browser-based design tool. It is an early release (version 0.0.1): features can be missing, change or break, and
        the Service can be changed, paused or stopped at any time. Keep your own copies of anything important by downloading your{" "}
        <code>.farsha</code> files or saving to your Google Drive; your work in the browser can be lost if you clear your browser data.
      </p>

      <h2 id="open-source">Open source licence</h2>
      <p>
        The Farsha source code is open source under the{" "}
        <a href="https://github.com/Dolytro/farsha/blob/main/LICENSE">MIT licence</a>. The licence gives you the right to use, copy, modify
        and distribute the code. These terms are about using the hosted Service at farsha.org and do not take away any right the MIT licence
        gives you in the code.
      </p>

      <h2 id="your-content">Your content</h2>
      <ul>
        <li>You keep all rights to the designs, images, text and other content you create or upload (“Your Content”). We do not claim ownership.</li>
        <li>Your Content stays in your browser and your own Google Drive. We do not receive, store or review it.</li>
        <li>You are responsible for Your Content, for having the right to use everything in it, and for the files you choose to share.</li>
        <li>If you turn on “Anyone with the link can view”, anyone who has the link can see that design until you turn sharing off.</li>
      </ul>

      <h2 id="google">Google account and third-party services</h2>
      <p>
        Saving to Drive needs a Google account and is also subject to Google’s terms and privacy policy. The Service uses third-party
        services such as Google (sign-in, Drive, fonts, optional analytics) and Vercel (hosting). We are not responsible for those
        services, and they can change or stop independently of us.
      </p>

      <h2 id="acceptable-use">Acceptable use</h2>
      <p>Please do not use the Service to:</p>
      <ul>
        <li>break the law, or infringe other people’s copyright, trademarks, privacy or other rights;</li>
        <li>create, store or share content that is illegal, hateful, harassing or harmful, or that exploits children;</li>
        <li>distribute malware, phishing or deceptive content, or impersonate a person or organisation;</li>
        <li>attack, overload, scan or probe the Service or try to gain unauthorised access to it or to other people’s data;</li>
        <li>use automated means in a way that harms the Service’s availability.</li>
      </ul>
      <p>We may block access to the Service for abuse. Because we do not hold your files, this does not delete them from your Drive.</p>

      <h2 id="trademarks">Trademarks</h2>
      <p>
        Farsha is an independent project. It is not affiliated with, endorsed by or sponsored by Figma, Inc. “Figma” is a trademark of Figma,
        Inc. and is used only to describe compatibility of workflow. Other product names belong to their owners.
      </p>

      <h2 id="warranty">No warranty</h2>
      <p>
        The Service is provided “as is” and “as available”, free of charge, without warranties of any kind, express or implied, including
        merchantability, fitness for a particular purpose, accuracy and non-infringement. We do not promise that it will be uninterrupted,
        error-free or that your work will never be lost.
      </p>

      <h2 id="liability">Limitation of liability</h2>
      <p>
        To the extent the law allows, we are not liable for any indirect, incidental, special or consequential damages, or for loss of data,
        profits or business, arising from your use of the Service. Because the Service is free, our total liability for any claim is limited
        to the greatest extent the law permits. Nothing in these terms limits liability that cannot be limited by law, and nothing affects
        the mandatory consumer rights you have where you live.
      </p>

      <h2 id="changes">Changes to these terms</h2>
      <p>
        We may update these terms, for example when Farsha gains features. We will change the “Last updated” date above. If you keep using
        the Service after a change, you accept the updated terms. Earlier versions are in the{" "}
        <a href="https://github.com/Dolytro/farsha/commits/main/apps/site/src/app/terms/page.tsx">public repository history</a>.
      </p>

      <h2 id="ending">Stopping</h2>
      <p>
        You can stop using the Service at any time, and remove Farsha’s access to your Google Drive at{" "}
        <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>.
      </p>

      <h2 id="contact">Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </ContentPage>
  );
}
