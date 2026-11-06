import { describe, expect, it } from "vitest";
import { parseRecent, pushRecent, RECENT_MAX, splitRecent } from "./recent-actions";

describe("recent actions", () => {
  it("puts the newest first and moves a repeated action to the front", () => {
    expect(pushRecent(["a", "b", "c"], "c")).toEqual(["c", "a", "b"]);
    expect(pushRecent([], "x")).toEqual(["x"]);
  });

  it("keeps at most RECENT_MAX", () => {
    let list: string[] = [];
    for (let i = 0; i < RECENT_MAX + 3; i++) list = pushRecent(list, `c${i}`);
    expect(list).toHaveLength(RECENT_MAX);
    expect(list[0]).toBe(`c${RECENT_MAX + 2}`);
  });

  it("reads damaged storage as an empty list", () => {
    expect(parseRecent("{nope")).toEqual([]);
    expect(parseRecent('{"a":1}')).toEqual([]);
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent('["a",3,"b"]')).toEqual(["a", "b"]);
  });

  it("splits commands into recent (by recency) and the rest, skipping ids that no longer exist", () => {
    const commands = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const { recent, rest } = splitRecent(commands, ["c", "gone", "a"]);
    expect(recent.map((c) => c.id)).toEqual(["c", "a"]);
    expect(rest.map((c) => c.id)).toEqual(["b"]);
  });
});
