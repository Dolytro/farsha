import { SOCIALS } from "../../lib/seo";

/** Text links to Dolytro's social profiles (rel=me ties them to the site for search engines). */
export function SocialLinks({ color = "#c9c4de" }: { color?: string }) {
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "6px 14px", alignItems: "center" }}>
      <span>Follow:</span>
      {SOCIALS.map((x) => (
        <a key={x.name} href={x.url} target="_blank" rel="me noopener" style={{ color, textDecoration: "underline" }}>
          {x.name}
        </a>
      ))}
    </span>
  );
}
