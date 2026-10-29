import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounced } from "./debounce";

describe("debounced", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("runs once after the last call", () => {
    const fn = vi.fn();
    const d = debounced(fn, 800);
    d.call();
    vi.advanceTimersByTime(500);
    d.call();
    vi.advanceTimersByTime(700);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("flush runs a pending call immediately and only once", () => {
    const fn = vi.fn();
    const d = debounced(fn, 800);
    d.flush();
    expect(fn).not.toHaveBeenCalled(); // nothing pending
    d.call();
    d.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("cancel drops a pending call", () => {
    const fn = vi.fn();
    const d = debounced(fn, 100);
    d.call();
    d.cancel();
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
  });
});
