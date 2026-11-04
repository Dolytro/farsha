# SEO and promotion

How Farsha is set up for search engines, and the off-page work that only a person can do. Nothing here needs
paid links or tricks: search engines reward a useful, honest site that other people link to.

## On-page (already in the repo)

| What | Where |
|---|---|
| Title, description, canonical, Open Graph, Twitter card, robots, keywords | `apps/site/src/app/layout.tsx`, `apps/site/src/lib/seo.ts` |
| Structured data (SoftwareApplication, WebSite, Organization = Dolytro, FAQPage, BreadcrumbList) | `apps/site/src/app/page.tsx`, `apps/site/src/components/content/ContentPage.tsx` |
| `robots.txt`, `sitemap.xml`, web manifest, social image, Apple icon | `apps/site/src/app/*.ts(x)` |
| Content pages that match what people search for | `/features`, `/figma-alternative` |
| Editor page tags | `apps/web/index.html` |
| 404 page (not indexed), security headers | `apps/site/src/app/not-found.tsx`, `apps/site/next.config.mjs` |
| Credit and link to https://dolytro.com | landing footer, content pages, privacy and terms, JSON-LD publisher |

Rules when you edit the site: one `<h1>` per page, a unique title and description per page, add every new public
page to `apps/site/src/app/sitemap.ts`, keep claims true (see `docs/FEATURE_GAP.md`), and never index share links
(`/v/...` is blocked in `robots.txt`).

## Google Analytics

Optional and consent based. Set the same GA4 measurement ID (`G-XXXXXXXXXX`) as `NEXT_PUBLIC_GA_ID` (landing site)
and `VITE_GA_ID` (editor) in Vercel, then redeploy. Visitors are asked first; nothing loads until they accept, and
browsers sending Global Privacy Control or Do Not Track are never asked. Do not add other trackers without updating
`apps/site/src/app/privacy/page.tsx`.

## Off-page checklist (do these by hand)

1. **Google Search Console:** add `farsha.org` as a Domain property (verify with a DNS TXT record in Cloudflare),
   then submit `https://farsha.org/sitemap.xml`. Do the same in Bing Webmaster Tools.
2. **Make the repository public** and fill in About (description, website, topics). GitHub is the strongest link
   Farsha has. Pin the repo on the Dolytro profile.
3. **Link from dolytro.com** to Farsha with a project page and a plain link (anchor text "Farsha, a free open source
   design tool"). A link from the maker's own site helps search engines connect the two.
4. **Product listings** (free, check each site's current rules before submitting): AlternativeTo (list as an
   alternative to Figma), Product Hunt, OpenAlternative, and similar "open source alternative" directories.
5. **Launch posts:** a "Show HN" post on Hacker News, and posts in communities where people ask for Figma
   alternatives or open source tools (for example r/opensource, r/webdev, r/UI_Design). Read each community's
   self-promotion rules first, be upfront that you made it, and answer comments.
6. **Write about it:** a launch article on dev.to or Hashnode ("Why I built a free, open source Figma alternative",
   "How Farsha saves designs to Google Drive with no backend"). Link to https://farsha.org.
7. **Short demo video or GIF** in the README and on the landing page; share it on social media.
8. **Ask for links honestly:** open source newsletters and blogs that cover design tools, and "awesome" lists on GitHub
   for design tools or Figma alternatives (search GitHub for them and open a pull request that follows their rules).
9. **Keep shipping:** a changelog entry and a GitHub release for every version, because fresh, active projects get
   linked to more.

Avoid: buying links, link exchanges at scale, fake reviews, keyword stuffing, or posting the same message in many
places. They can get the site penalised.

## Ready-to-paste text

- **One line:** Farsha is a free, open source Figma alternative that runs in your browser.
- **Short (about 160 characters):** Free, open source design tool with Figma's panels and shortcuts, Dev Mode code copy and files saved to your own Google Drive.
- **Long:** Farsha is a free and open source design tool for UI and UX work. It runs in the browser, uses the same panel
  names, tool order and shortcuts as Figma, lets developers copy CSS, HTML, React or Tailwind in Dev Mode, and saves
  designs as `.farsha` files in your own Google Drive, so there is no server or database. It is early, and the public
  feature gap list shows what works and what does not yet.
- **Tags:** design tool, figma alternative, open source, ui design, ux design, prototyping, dev mode, google drive.
- **Links:** site https://farsha.org, source https://github.com/Dolytro/farsha, maker https://dolytro.com.
