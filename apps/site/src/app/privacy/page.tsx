import type { Metadata } from "next";
import { ContentPage } from "../../components/content/ContentPage";
import { CONTACT_EMAIL, MAKER } from "../../lib/seo";

const TITLE = "Privacy Policy";
const DESCRIPTION =
  "How Farsha handles your data: no server, no database, designs stay in your browser and your own Google Drive. Optional Google Analytics only after you accept. Plain-language privacy policy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: { title: `Farsha ${TITLE}`, description: DESCRIPTION, url: "/privacy", type: "website" },
};

export default function PrivacyPage() {
  return (
    <ContentPage path="/privacy" title={TITLE}>
      <h1>Privacy Policy</h1>
      <p>Last updated: 4 November 2026</p>
      <p className="cp__lead">
        Farsha is a free, open source design tool at <a href="https://farsha.org">farsha.org</a>. It has no server or database of its own,
        so your designs are never sent to us. This page explains what does happen to data when you use it.
      </p>

      <h2 id="who">Who is responsible</h2>
      <p>
        Farsha is made and run by <a href={MAKER.url}>{MAKER.name}</a> (“we”, “us”). For questions, requests or complaints about this
        policy write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2 id="summary">In short</h2>
      <ul>
        <li>We do not collect, store or sell your designs or personal data, and we have no accounts or user database.</li>
        <li>Your designs stay in your browser and, if you sign in with Google, in your own Google Drive.</li>
        <li>We use no advertising trackers. Google Analytics is optional and is off until you press Accept.</li>
        <li>The website is hosted by Vercel and loads fonts and sign-in scripts from Google, which means those companies can see your IP address (details below).</li>
      </ul>

      <h2 id="data">What data is involved and where it goes</h2>
      <div className="cp__wrap">
        <table className="cp__table">
          <thead>
            <tr><th scope="col">Data</th><th scope="col">Where it lives</th><th scope="col">Who can see it</th></tr>
          </thead>
          <tbody>
            <tr><td>Your designs (<code>.farsha</code> files, including images and comments inside them)</td><td>Your browser; your Google Drive if you save there; a file you download</td><td>You, and anyone you share a view link with. Not us.</td></tr>
            <tr><td>Name, email address and profile photo from Google</td><td>Your browser only, to show who is signed in</td><td>You. Not sent to us.</td></tr>
            <tr><td>Google sign-in token</td><td>Your browser session (about one hour)</td><td>Your browser and Google</td></tr>
            <tr><td>Settings (theme, preferences, rulers, defaults)</td><td>Your browser (local storage)</td><td>You</td></tr>
            <tr><td>Working copy of the open file</td><td>Your browser (IndexedDB)</td><td>You</td></tr>
            <tr><td>Your cookie choice</td><td>Your browser (local storage, <code>farsha-analytics-consent</code>)</td><td>You</td></tr>
            <tr><td>Visit statistics (only if you accept analytics)</td><td>Google Analytics</td><td>Us, through Google Analytics</td></tr>
            <tr><td>Web server request logs (IP address, browser, page, time)</td><td>Our hosting provider, Vercel</td><td>Vercel, and us if we look at the logs</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="google-drive">Google sign-in and Google Drive</h2>
      <p>
        Signing in is optional. You sign in with your Google account and Farsha asks for one permission, <code>drive.file</code>. It lets
        Farsha see and edit only the files it creates, or that you open with it, in your own Google Drive. It cannot see your other
        Drive files. Your designs are saved as <code>.farsha</code> files in your Drive and are protected by your Google account.
      </p>
      <p>
        Your name, email address and photo are read from Google to show who is signed in. They stay in your browser and are not sent to us.
        The sign-in token is kept in your browser session, expires after about one hour, and is removed when you sign out. To remove
        Farsha’s access completely, visit <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>.
      </p>
      <p>
        Farsha’s use and transfer of information received from Google APIs adheres to the{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including the
        Limited Use requirements. We do not use Google user data for advertising, we do not sell it, and no person at Farsha reads it.
      </p>

      <h2 id="sharing">Sharing</h2>
      <p>
        If you turn on “Anyone with the link can view”, Farsha adds a view-only link permission to that file in your Google Drive. Anyone
        who has the link can open the design, and Google can see their IP address. You can turn sharing off at any time, which removes the
        permission. Share links are kept out of search engines. Do not share a link to a design that holds information you want to keep private.
      </p>

      <h2 id="storage">Browser storage</h2>
      <p>
        Farsha stores settings, your working copy and your cookie choice in your browser’s local storage and IndexedDB, and the Google
        sign-in token in session storage. This is needed for the editor to work and is not used to track you. You can clear it in your
        browser settings; unsaved work that exists only in your browser will then be lost, so save or download your files first.
      </p>

      <h2 id="analytics">Analytics (optional)</h2>
      <p>
        If the site owner has turned it on, Farsha asks once whether it may use Google Analytics 4 to count visits and see which pages
        are useful. It is <strong>off until you press Accept</strong>: before that no analytics script is loaded and no analytics cookie is
        stored. “Accept” and “Decline” are equally easy, and declining changes nothing about how Farsha works. If your browser sends
        Global Privacy Control or Do Not Track, Farsha does not ask and does not load analytics.
      </p>
      <p>
        If you accept, Google Analytics sets cookies (such as <code>_ga</code>) and receives your page views, approximate location,
        browser and device type, and an identifier. IP addresses are anonymised, and Google signals and ad personalisation are switched
        off. Google acts as our processor under <a href="https://policies.google.com/privacy">Google’s privacy policy</a>. Your designs
        and the content of the editor are never sent to analytics.
      </p>
      <p>
        You can change your choice at any time with “Cookie settings” in the footer. Withdrawing consent removes the analytics cookies from
        this browser. Withdrawing does not affect anything before the withdrawal. You can also block analytics with a browser setting or{" "}
        <a href="https://tools.google.com/dlpage/gaoptout">Google’s opt-out add-on</a>.
      </p>

      <h2 id="third-parties">Other services that see your IP address</h2>
      <ul>
        <li><strong>Vercel</strong> hosts the website and keeps ordinary request logs for security and operation, under <a href="https://vercel.com/legal/privacy-policy">Vercel’s privacy policy</a>.</li>
        <li><strong>Google Fonts</strong> (fonts.googleapis.com, fonts.gstatic.com) delivers the fonts used on the site and in the editor. Google receives your IP address and browser details when fonts load.</li>
        <li><strong>Google sign-in and Google Drive</strong> (accounts.google.com, googleapis.com) are contacted only when you sign in or save, open or share a file from Drive.</li>
        <li><strong>Cloudflare</strong> provides the DNS service for farsha.org.</li>
        <li><strong>GitHub</strong> and the social networks linked in the footer are separate sites with their own policies; they receive data only if you click through to them.</li>
      </ul>

      <h2 id="legal-bases">Why we may process this data (EEA and UK visitors)</h2>
      <ul>
        <li><strong>Consent</strong> for Google Analytics and its cookies. You can withdraw it at any time.</li>
        <li><strong>Legitimate interests</strong> in running, securing and delivering the website (server logs, fonts, hosting).</li>
        <li><strong>Doing what you ask</strong> when you sign in and save, open or share a file through Google Drive.</li>
      </ul>

      <h2 id="retention">How long data is kept</h2>
      <p>
        Data in your browser stays until you clear it. Files in your Google Drive stay until you delete them. Google Analytics data is kept
        for the period set in our Google Analytics property, and server logs for the period set by Vercel. We do not keep other personal data.
      </p>

      <h2 id="transfers">International transfers</h2>
      <p>
        Vercel, Google and Cloudflare operate in many countries, including outside the EEA and the UK. When your data is sent to them they
        rely on the safeguards described in their own terms and privacy policies.
      </p>

      <h2 id="rights">Your rights</h2>
      <p>
        Depending on where you live (for example under the GDPR or UK GDPR) you may have the right to access, correct, delete, restrict or
        object to the processing of your personal data, to withdraw consent, and to complain to your data protection authority. Because
        we do not hold your designs or an account for you, most of this you can do yourself in your browser and your Google account. For
        anything we do hold, such as analytics data, write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will reply
        within a month.
      </p>

      <h2 id="children">Children</h2>
      <p>
        Farsha is not directed at children under 13, or under 16 where the law of your country requires a parent’s consent. If you believe a
        child has given us personal data, email us and we will remove it.
      </p>

      <h2 id="security">Security</h2>
      <p>
        The site is served over HTTPS. Sign-in is handled by Google, we never see your Google password, and the app asks for the narrowest
        Drive permission it can. No system is perfectly secure. Report a vulnerability privately as described in{" "}
        <a href="https://github.com/Dolytro/farsha/blob/main/SECURITY.md">SECURITY.md</a>.
      </p>

      <h2 id="changes">Changes to this policy</h2>
      <p>
        We will update this page when Farsha’s data handling changes and change the “Last updated” date above. If a change needs your
        consent, we will ask again. Earlier versions are in the{" "}
        <a href="https://github.com/Dolytro/farsha/commits/main/apps/site/src/app/privacy/page.tsx">public repository history</a>.
      </p>

      <h2 id="contact">Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> · Source code: <a href="https://github.com/Dolytro/farsha">github.com/Dolytro/farsha</a> · Made by{" "}
        <a href={MAKER.url}>{MAKER.name}</a>.
      </p>
    </ContentPage>
  );
}
