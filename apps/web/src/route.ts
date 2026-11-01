export type ViewerMode = "view" | "inspect";

export type Route = { kind: "editor" } | { kind: "viewer"; fileId: string; mode: ViewerMode };

/** `/app/v/<driveFileId>` (or the older `/v/<id>`) opens the read-only viewer; `?mode=inspect` also shows Dev Mode. */
export function parseRoute(pathname: string, search: string): Route {
  const m = /^(?:\/app)?\/v\/([A-Za-z0-9_-]{10,})\/?$/.exec(pathname);
  if (!m) return { kind: "editor" };
  const mode: ViewerMode = new URLSearchParams(search).get("mode") === "inspect" ? "inspect" : "view";
  return { kind: "viewer", fileId: m[1]!, mode };
}

export function shareUrl(origin: string, fileId: string, mode: ViewerMode): string {
  return `${origin}/app/v/${fileId}${mode === "inspect" ? "?mode=inspect" : ""}`;
}
