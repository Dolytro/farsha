import { describe, expect, it } from "vitest";
import { evalFieldExpression, isPlainNumberText } from "./field-expression";

describe("evalFieldExpression", () => {
  it("reads plain numbers", () => {
    expect(evalFieldExpression("42", 0)).toBe(42);
    expect(evalFieldExpression("-8.5", 0)).toBe(-8.5);
    expect(evalFieldExpression("12,5", 0)).toBe(12.5);
  });
  it("adds, subtracts, multiplies and divides with the usual order", () => {
    expect(evalFieldExpression("100+20", 0)).toBe(120);
    expect(evalFieldExpression("2+3*4", 0)).toBe(14);
    expect(evalFieldExpression("(2+3)*4", 0)).toBe(20);
    expect(evalFieldExpression("10 / 4", 0)).toBe(2.5);
    expect(evalFieldExpression("10--2", 0)).toBe(12);
  });
  it("applies a leading operator to the old value", () => {
    expect(evalFieldExpression("*2", 50)).toBe(100);
    expect(evalFieldExpression("/4", 50)).toBe(12.5);
    expect(evalFieldExpression("+10", 50)).toBe(60);
    expect(evalFieldExpression("*2", -5)).toBe(-10);
  });
  it("refuses anything else", () => {
    for (const bad of ["", "abc", "1+", "(1+2", "1/0", "2**3", "alert(1)", "1e3", "0x10", "1+2)", "++"]) expect(evalFieldExpression(bad, 1)).toBeNull();
  });
  it("rounds to two decimals", () => {
    expect(evalFieldExpression("1/3", 0)).toBe(0.33);
  });
});

describe("isPlainNumberText", () => {
  it("is true for what a number looks like while it is typed", () => {
    for (const t of ["", "-", "12", "-12", "12.", ".5", "-.5"]) expect(isPlainNumberText(t)).toBe(true);
    for (const t of ["1+2", "*2", "1.2.3", "a"]) expect(isPlainNumberText(t)).toBe(false);
  });
});
