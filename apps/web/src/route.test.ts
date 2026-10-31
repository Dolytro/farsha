import { describe, expect, it } from "vitest";
import { parseRoute, shareUrl } from "./route";

describe("parseRoute", () => {
  it("treats / as the editor", () => {
    expect(parseRoute("/", "")).toEqual({ kind: "editor" });
  });

  it("parses a viewer link", () => {
    expect(parseRoute("/v/1AbC_dEfGhIjKlMn", "")).toEqual({ kind: "viewer", fileId: "1AbC_dEfGhIjKlMn", mode: "view" });
    expect(parseRoute("/v/1AbC_dEfGhIjKlMn/", "?mode=inspect")).toMatchObject({ mode: "inspect" });
  });

  it("ignores malformed ids", () => {
    expect(parseRoute("/v/short", "")).toEqual({ kind: "editor" });
    expect(parseRoute("/v/../etc/passwd", "")).toEqual({ kind: "editor" });
  });
});

describe("shareUrl", () => {
  it("round-trips through parseRoute", () => {
    const url = new URL(shareUrl("https://farsha-design.vercel.app", "1AbC_dEfGhIjKlMn", "inspect"));
    expect(parseRoute(url.pathname, url.search)).toEqual({ kind: "viewer", fileId: "1AbC_dEfGhIjKlMn", mode: "inspect" });
  });
});
