import { describe, expect, it } from "vitest";
import { litSides, toggleConstraint } from "./constraint-toggle";

describe("toggleConstraint", () => {
  it("pins both sides when the other side of a pinned layer is clicked", () => {
    expect(toggleConstraint("MIN", "end")).toBe("STRETCH");
    expect(toggleConstraint("MAX", "start")).toBe("STRETCH");
  });
  it("lets go of one side of a stretched layer", () => {
    expect(toggleConstraint("STRETCH", "start")).toBe("MAX");
    expect(toggleConstraint("STRETCH", "end")).toBe("MIN");
  });
  it("never leaves a layer without a side", () => {
    expect(toggleConstraint("MIN", "start")).toBe("MIN");
    expect(toggleConstraint("MAX", "end")).toBe("MAX");
  });
  it("the centre line is exclusive, and a click from centre or scale pins the clicked side", () => {
    for (const c of ["MIN", "MAX", "STRETCH", "CENTER", "SCALE"] as const) expect(toggleConstraint(c, "center")).toBe("CENTER");
    expect(toggleConstraint("CENTER", "start")).toBe("MIN");
    expect(toggleConstraint("CENTER", "end")).toBe("MAX");
    expect(toggleConstraint("SCALE", "start")).toBe("MIN");
    expect(toggleConstraint("SCALE", "end")).toBe("MAX");
  });
});

describe("litSides", () => {
  it("lights the sides a constraint pins", () => {
    expect(litSides("MIN")).toEqual({ start: true, end: false, center: false });
    expect(litSides("STRETCH")).toEqual({ start: true, end: true, center: false });
    expect(litSides("CENTER")).toEqual({ start: false, end: false, center: true });
    expect(litSides("SCALE")).toEqual({ start: false, end: false, center: false });
  });
});
