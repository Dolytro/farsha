import { describe, expect, it } from "vitest";
import { AUTO_VERSION_MS, autoVersionDue, autoVersionName } from "./auto-version-policy";

const state = { lastSeenVersion: 5, lastSavedVersion: 5, lastSavedAt: 1_000 };

describe("autoVersionDue", () => {
  it("is not due when nothing changed, however long it has been", () => {
    expect(autoVersionDue(state, 5, 1_000 + AUTO_VERSION_MS * 10)).toBe(false);
  });
  it("is not due before the interval has passed", () => {
    expect(autoVersionDue(state, 9, 1_000 + AUTO_VERSION_MS - 1)).toBe(false);
  });
  it("is due once the file changed and the interval has passed", () => {
    expect(autoVersionDue(state, 9, 1_000 + AUTO_VERSION_MS)).toBe(true);
  });
  it("takes a custom interval", () => {
    expect(autoVersionDue(state, 6, 1_600, 500)).toBe(true);
    expect(autoVersionDue(state, 6, 1_400, 500)).toBe(false);
  });
});

describe("autoVersionName", () => {
  it("starts with Autosave", () => expect(autoVersionName(Date.UTC(2026, 10, 5, 2, 10))).toMatch(/^Autosave · /));
});
