import { describe, expect, it } from "vitest";
import { validGaId } from "./analytics";

describe("validGaId", () => {
  it("accepts GA4 measurement IDs", () => {
    expect(validGaId("G-ABC123XYZ9")).toBe(true);
  });
  it("rejects empty, missing and malformed values so no script URL can be injected", () => {
    expect(validGaId(undefined)).toBe(false);
    expect(validGaId("")).toBe(false);
    expect(validGaId("UA-12345-1")).toBe(false);
    expect(validGaId("G-abc")).toBe(false);
    expect(validGaId("G-ABCD&x=1")).toBe(false);
    expect(validGaId("https://evil.example/x.js")).toBe(false);
  });
});
