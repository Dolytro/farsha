import { describe, expect, it } from "vitest";
import { smartQuote } from "./smart-quotes";

describe("smartQuote", () => {
  it("opens a double quote at the start and after a space", () => {
    expect(smartQuote("", '"', 1)).toBe("“");
    expect(smartQuote("say ", 'say "', 5)).toBe("say “");
  });
  it("closes a double quote after a word", () => {
    expect(smartQuote("“hi", '“hi"', 4)).toBe("“hi”");
  });
  it("makes an apostrophe after a letter a right single quote", () => {
    expect(smartQuote("don", "don'", 4)).toBe("don’");
  });
  it("opens a single quote after a space or bracket", () => {
    expect(smartQuote("a ", "a '", 3)).toBe("a ‘");
    expect(smartQuote("(", "('", 2)).toBe("(‘");
  });
  it("works in the middle of the text", () => {
    expect(smartQuote("ab", 'a"b', 2)).toBe("a”b");
  });
  it("leaves pasted text and other edits alone", () => {
    expect(smartQuote("a", 'a"b"', 5)).toBe('a"b"');
    expect(smartQuote("ab", "abc", 3)).toBe("abc");
    expect(smartQuote("a", "", 0)).toBe("");
  });
});
