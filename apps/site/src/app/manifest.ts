import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "../lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Farsha: free, open source design tool",
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#0e0d14",
    theme_color: "#0e0d14",
    categories: ["design", "productivity", "graphics"],
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
