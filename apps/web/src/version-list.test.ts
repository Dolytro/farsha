import { describe, expect, it } from "vitest";
import { addVersionTo, MAX_AUTO_VERSIONS, MAX_VERSIONS, type VersionEntry } from "./version-list";

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

describe("automatic versions", () => {
  it("are marked and kept to their own smaller limit, so named versions stay", () => {
    let list: VersionEntry[] = [];
    list = addVersionTo(list, { name: "Named", bytes, now: 1 });
    for (let i = 0; i < MAX_AUTO_VERSIONS + 4; i++) list = addVersionTo(list, { name: `auto${i}`, bytes, now: 100 + i, auto: true });
    expect(list.filter((v) => v.auto)).toHaveLength(MAX_AUTO_VERSIONS);
    expect(list.some((v) => v.name === "Named")).toBe(true);
    expect(list[0]!.auto).toBe(true);
    expect(list.find((v) => v.name === "Named")!.auto).toBeUndefined();
  });
});

describe("version description", () => {
  it("keeps a trimmed description and drops an empty one", async () => {
    const { addVersionTo } = await import("./version-list");
    const a = addVersionTo([], { name: "v1", bytes: new Uint8Array(), now: 1, description: "  Before the redesign  " });
    expect(a[0]?.description).toBe("Before the redesign");
    const b = addVersionTo(a, { name: "v2", bytes: new Uint8Array(), now: 2, description: "   " });
    expect(b[0]).not.toHaveProperty("description");
  });
});
