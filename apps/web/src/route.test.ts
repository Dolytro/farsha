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

  it("parses a viewer link under /app", () => {
    expect(parseRoute("/app/v/1AbC_dEfGhIjKlMn", "")).toEqual({ kind: "viewer", fileId: "1AbC_dEfGhIjKlMn", mode: "view" });
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

describe("links to a layer", () => {
  it("carry the layer in ?node= and read it back", () => {
    const url = new URL(shareUrl("https://farsha.org", "1AbC_dEfGhIjKlMn", "view", "Qw3rty_9-Ab"));
    expect(url.search).toBe("?node=Qw3rty_9-Ab");
    expect(parseRoute(url.pathname, url.search)).toEqual({ kind: "viewer", fileId: "1AbC_dEfGhIjKlMn", mode: "view", nodeId: "Qw3rty_9-Ab" });
    const both = new URL(shareUrl("https://farsha.org", "1AbC_dEfGhIjKlMn", "inspect", "Qw3rty_9-Ab"));
    expect(both.search).toBe("?mode=inspect&node=Qw3rty_9-Ab");
    expect(parseRoute(both.pathname, both.search)).toMatchObject({ mode: "inspect", nodeId: "Qw3rty_9-Ab" });
  });

  it("ignore a layer id that looks wrong", () => {
    expect(parseRoute("/app/v/1AbC_dEfGhIjKlMn", "?node=a")).toEqual({ kind: "viewer", fileId: "1AbC_dEfGhIjKlMn", mode: "view" });
    expect(parseRoute("/app/v/1AbC_dEfGhIjKlMn", "?node=<script>alert(1)</script>")).toEqual({ kind: "viewer", fileId: "1AbC_dEfGhIjKlMn", mode: "view" });
    expect(shareUrl("https://farsha.org", "1AbC_dEfGhIjKlMn", "view", "bad id!")).toBe("https://farsha.org/app/v/1AbC_dEfGhIjKlMn");
  });
});
