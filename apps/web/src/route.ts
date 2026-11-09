export type ViewerMode = "view" | "inspect";

export type Route = { kind: "editor" } | { kind: "viewer"; fileId: string; mode: ViewerMode; /** A layer to open the file on (`?node=`). */ nodeId?: string };

const NODE_ID = /^[A-Za-z0-9_-]{6,64}$/;

/** `/app/v/<driveFileId>` (or the older `/v/<id>`) opens the read-only viewer; `?mode=inspect` also shows Dev Mode. */
export function parseRoute(pathname: string, search: string): Route {
  const m = /^(?:\/app)?\/v\/([A-Za-z0-9_-]{10,})\/?$/.exec(pathname);
  if (!m) return { kind: "editor" };
  const params = new URLSearchParams(search);
  const mode: ViewerMode = params.get("mode") === "inspect" ? "inspect" : "view";
  const node = params.get("node");
  return { kind: "viewer", fileId: m[1]!, mode, ...(node && NODE_ID.test(node) ? { nodeId: node } : {}) };
}

export function shareUrl(origin: string, fileId: string, mode: ViewerMode, nodeId?: string): string {
  const query = [mode === "inspect" ? "mode=inspect" : "", nodeId && NODE_ID.test(nodeId) ? `node=${nodeId}` : ""].filter(Boolean).join("&");
  return `${origin}/app/v/${fileId}${query ? `?${query}` : ""}`;
}

/** An `<iframe>` that shows a view-only share link inside another page (Figma's embed code). */
export function embedCode(url: string, width = 800, height = 450): string {
  const attr = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<iframe src="${attr}" width="${Math.round(width)}" height="${Math.round(height)}" style="border:1px solid rgba(0,0,0,0.1)" allowfullscreen></iframe>`;
}
