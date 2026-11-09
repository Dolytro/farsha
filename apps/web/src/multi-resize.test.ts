import { describe, expect, it } from "vitest";
import { groupBox, resizeGroup } from "./multi-resize";

const items = [
  { id: "a", x: 0, y: 0, width: 20, height: 10 },
  { id: "b", x: 40, y: 30, width: 60, height: 20 },
];

describe("groupBox", () => {
  it("surrounds the items, and is null for none", () => {
    expect(groupBox(items)).toEqual({ x: 0, y: 0, width: 100, height: 50 });
    expect(groupBox([])).toBeNull();
  });
});

describe("resizeGroup", () => {
  const from = { x: 0, y: 0, width: 100, height: 50 };

  it("scales positions and sizes with the box", () => {
    const r = resizeGroup(items, from, { x: 0, y: 0, width: 200, height: 100 });
    expect(r.a).toEqual({ x: 0, y: 0, width: 40, height: 20 });
    expect(r.b).toEqual({ x: 80, y: 60, width: 120, height: 40 });
  });

  it("follows a box that moved, as when a left or top handle is dragged", () => {
    const r = resizeGroup(items, from, { x: -50, y: -10, width: 150, height: 60 });
    expect(r.a).toEqual({ x: -50, y: -10, width: 30, height: 12 });
    expect(r.b!.x).toBeCloseTo(-50 + 40 * 1.5, 5);
  });

  it("keeps sizes at 1 or more and survives an empty source box", () => {
    expect(resizeGroup(items, from, { x: 0, y: 0, width: 0, height: 0 }).a).toMatchObject({ width: 1, height: 1 });
    const r = resizeGroup([{ id: "z", x: 5, y: 5, width: 0, height: 0 }], { x: 5, y: 5, width: 0, height: 0 }, { x: 5, y: 5, width: 10, height: 10 });
    expect(r.z).toMatchObject({ x: 5, y: 5, width: 1, height: 1 });
  });

  it("leaves everything alone when the box does not change", () => {
    expect(resizeGroup(items, from, from)).toEqual({ a: { x: 0, y: 0, width: 20, height: 10 }, b: { x: 40, y: 30, width: 60, height: 20 } });
  });
});

import { rotateGroup } from "./multi-resize";

describe("rotateGroup", () => {
  const items = [
    { id: "a", x: 0, y: 0, width: 20, height: 20, rotation: 0 },
    { id: "b", x: 80, y: 0, width: 20, height: 20, rotation: 10 },
  ];

  it("a quarter turn swings the layers round the middle of the group", () => {
    const r = rotateGroup(items, 90);
    // the group's middle is (50, 10); a (centre 10, 10) goes to (50, -30); b (centre 90, 10) goes to (50, 50)
    expect(r.a).toEqual({ x: 40, y: -40, rotation: 90 });
    expect(r.b).toEqual({ x: 40, y: 40, rotation: 100 });
  });

  it("no turn changes nothing, and a full turn comes back", () => {
    const none = rotateGroup(items, 0);
    expect(none.a).toEqual({ x: 0, y: 0, rotation: 0 });
    const full = rotateGroup(items, 360);
    expect(full.b!.x).toBeCloseTo(80, 1);
    expect(full.b!.rotation).toBe(10);
  });

  it("keeps rotations between 0 and 360, also for negative turns", () => {
    expect(rotateGroup(items, -30).a!.rotation).toBe(330);
    expect(rotateGroup([{ id: "z", x: 0, y: 0, width: 10, height: 10, rotation: 350 }], 20).z!.rotation).toBe(10);
  });

  it("a single layer just turns in place", () => {
    const r = rotateGroup([{ id: "s", x: 10, y: 10, width: 30, height: 20, rotation: 0 }], 45);
    expect(r.s).toEqual({ x: 10, y: 10, rotation: 45 });
  });

  it("is empty for no layers", () => {
    expect(rotateGroup([], 30)).toEqual({});
  });
});
