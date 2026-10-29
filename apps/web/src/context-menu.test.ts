import { describe, expect, it } from "vitest";
import { buildMenu, type MenuContext } from "./context-menu";

const base: MenuContext = { devMode: false, readOnlyViewer: false, selectionCount: 1, hasGroup: false, allHidden: false, allLocked: false };
const actions = (c: Partial<MenuContext>) => buildMenu({ ...base, ...c }).map((i) => i.action);

describe("buildMenu", () => {
  it("is empty on view-only shared links", () => expect(actions({ readOnlyViewer: true })).toEqual([]));
  it("only offers Copy as CSS in Dev Mode", () => {
    expect(actions({ devMode: true })).toEqual(["copy-css"]);
    expect(actions({ devMode: true, selectionCount: 0 })).toEqual([]);
  });
  it("offers only paste on empty canvas", () => expect(actions({ selectionCount: 0 })).toEqual(["paste-here"]));
  it("shows Ungroup only with a group selected", () => {
    expect(actions({})).not.toContain("ungroup");
    expect(actions({ hasGroup: true })).toContain("ungroup");
  });
  it("offers Add auto layout for a selection", () => {
    expect(actions({})).toContain("auto-layout");
    expect(actions({ selectionCount: 0 })).not.toContain("auto-layout");
  });
  it("flips Hide/Show and Lock/Unlock", () => {
    const labels = buildMenu({ ...base, allHidden: true, allLocked: true }).map((i) => i.label);
    expect(labels).toContain("Show");
    expect(labels).toContain("Unlock");
  });
});
