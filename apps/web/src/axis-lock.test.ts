import { describe, expect, it } from "vitest";
import { lockAxis } from "./axis-lock";

describe("lockAxis", () => {
  it("keeps the longer movement and drops the other", () => {
    expect(lockAxis(30, 5)).toEqual({ dx: 30, dy: 0 });
    expect(lockAxis(-4, -40)).toEqual({ dx: 0, dy: -40 });
  });
  it("prefers horizontal when the movement is equal, and handles no movement", () => {
    expect(lockAxis(10, -10)).toEqual({ dx: 10, dy: 0 });
    expect(lockAxis(0, 0)).toEqual({ dx: 0, dy: 0 });
  });
});
