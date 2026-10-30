import { describe, expect, it } from "vitest";
import { addVersionTo, MAX_VERSIONS, type VersionEntry } from "./version-list";

const bytes = new Uint8Array([1, 2, 3]);

describe("addVersionTo", () => {
  it("puts the newest version first and keeps a given name", () => {
    const a = addVersionTo([], { name: "First", bytes, now: 1000 });
    const b = addVersionTo(a, { name: "Second", bytes, now: 2000 });
    expect(b.map((v) => v.name)).toEqual(["Second", "First"]);
  });

  it("names an unnamed version after its date", () => {
    const [v] = addVersionTo([], { name: "  ", bytes, now: Date.UTC(2026, 9, 30, 12, 0) });
    expect(v!.name.length).toBeGreaterThan(0);
    expect(v!.name).not.toBe("  ");
  });

  it("gives every version its own id, even within the same millisecond", () => {
    const a = addVersionTo([], { name: "a", bytes, now: 5 });
    const b = addVersionTo(a, { name: "b", bytes, now: 5 });
    expect(new Set(b.map((v) => v.id)).size).toBe(2);
  });

  it("keeps only the newest MAX_VERSIONS", () => {
    let list: VersionEntry[] = [];
    for (let i = 0; i < MAX_VERSIONS + 5; i++) list = addVersionTo(list, { name: `v${i}`, bytes, now: i });
    expect(list).toHaveLength(MAX_VERSIONS);
    expect(list[0]!.name).toBe(`v${MAX_VERSIONS + 4}`);
    expect(list[list.length - 1]!.name).toBe("v5");
  });
});
