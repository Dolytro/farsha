import { describe, expect, it } from "vitest";
import { HELP_LINKS, openHelpLink } from "./help-links";

describe("help links", () => {
  it("are https links with unique ids and labels", () => {
    expect(HELP_LINKS.length).toBeGreaterThanOrEqual(3);
    for (const l of HELP_LINKS) expect(l.url.startsWith("https://")).toBe(true);
    expect(new Set(HELP_LINKS.map((l) => l.id)).size).toBe(HELP_LINKS.length);
    expect(new Set(HELP_LINKS.map((l) => l.label)).size).toBe(HELP_LINKS.length);
  });

  it("opens an https address in a new tab without giving it access to the editor", () => {
    const calls: unknown[][] = [];
    expect(openHelpLink("https://farsha.org/privacy", (...a) => calls.push(a))).toBe(true);
    expect(calls).toEqual([["https://farsha.org/privacy", "_blank", "noopener,noreferrer"]]);
  });

  it("refuses other kinds of address", () => {
    const calls: unknown[][] = [];
    for (const bad of ["http://example.com", "javascript:alert(1)", "data:text/html,hi", "not a url", ""]) expect(openHelpLink(bad, (...a) => calls.push(a))).toBe(false);
    expect(calls).toEqual([]);
  });
});
