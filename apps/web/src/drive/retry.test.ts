import { describe, expect, it } from "vitest";
import { shouldSaveWhenOnline } from "./retry";

const base = { failed: false, pending: false, signedIn: true, hasFile: true, viewer: false };

describe("shouldSaveWhenOnline", () => {
  it("saves again after a failed save or edits made offline", () => {
    expect(shouldSaveWhenOnline({ ...base, failed: true })).toBe(true);
    expect(shouldSaveWhenOnline({ ...base, pending: true })).toBe(true);
  });
  it("does nothing when everything was already saved", () => {
    expect(shouldSaveWhenOnline(base)).toBe(false);
  });
  it("never saves without a signed-in user, a Drive file, or in a view link", () => {
    expect(shouldSaveWhenOnline({ ...base, failed: true, signedIn: false })).toBe(false);
    expect(shouldSaveWhenOnline({ ...base, failed: true, hasFile: false })).toBe(false);
    expect(shouldSaveWhenOnline({ ...base, pending: true, viewer: true })).toBe(false);
  });
});
