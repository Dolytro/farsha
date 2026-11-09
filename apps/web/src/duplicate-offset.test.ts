import { beforeEach, describe, expect, it } from "vitest";
import { afterDuplicate, duplicateOffset, forgetCopyMove, rememberCopyMove } from "./duplicate-offset";

describe("duplicate offset", () => {
  beforeEach(() => forgetCopyMove());
  it("uses the plain offset when nothing was remembered", () => {
    expect(duplicateOffset(["a"])).toEqual({ x: 10, y: 10 });
  });
  it("repeats the move of an Alt+drag copy for the same layers", () => {
    rememberCopyMove(["c1", "c2"], { x: 120, y: 0 });
    expect(duplicateOffset(["c2", "c1"])).toEqual({ x: 120, y: 0 });
    expect(duplicateOffset(["c1"])).toEqual({ x: 10, y: 10 });
  });
  it("keeps repeating for the new copies", () => {
    rememberCopyMove(["c1"], { x: 50, y: 20 });
    afterDuplicate(["c1"], ["c2"], { x: 50, y: 20 });
    expect(duplicateOffset(["c2"])).toEqual({ x: 50, y: 20 });
    expect(duplicateOffset(["c1"])).toEqual({ x: 10, y: 10 });
  });
  it("a zero move forgets", () => {
    rememberCopyMove(["c1"], { x: 50, y: 20 });
    rememberCopyMove(["c1"], { x: 0, y: 0 });
    expect(duplicateOffset(["c1"])).toEqual({ x: 10, y: 10 });
  });
});
