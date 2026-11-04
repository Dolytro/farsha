import { SOCIALS } from "../../lib/seo";
import { SOCIAL_ICON_PATHS } from "../../lib/social-icons";

type Props = {
  /** "light" for the light landing footer, "dark" for the dark content pages. */
  tone?: "light" | "dark";
  /** Show the "Follow:" label before the icons. */
  label?: boolean;
};

/** Icon buttons linking to Dolytro's social profiles (rel=me ties them to the site for search engines). */
export function SocialLinks({ tone = "light", label = true }: Props) {
  const light = tone === "light";
  const box = {
    width: 34,
    height: 34,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: light ? "#fff" : "#17151f",
    border: `1px solid ${light ? "#dcd7ee" : "#34304a"}`,
    color: light ? "#15131d" : "#f2f0fa",
  } as const;
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      {label ? <span>Follow:</span> : null}
      {SOCIALS.map((x) => {
        const d = SOCIAL_ICON_PATHS[x.name.toLowerCase()];
        return (
          <a key={x.name} href={x.url} target="_blank" rel="me noopener" aria-label={`Farsha on ${x.name}`} title={x.name} style={box}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d={d} />
            </svg>
          </a>
        );
      })}
    </span>
  );
}
