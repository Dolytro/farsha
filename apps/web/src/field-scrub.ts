export interface ScrubOptions {
  min?: number;
  max?: number;
  /** Size of one step (the input's `step`, default 1). */
  step?: number;
  shift?: boolean;
  alt?: boolean;
}

/** The value of a number field after dragging its label `dx` pixels: one step per pixel, Shift makes it ten, Alt a tenth; kept inside min and max. */
export function scrubbedValue(start: number, dx: number, o: ScrubOptions = {}): number {
  const step = o.step && o.step > 0 ? o.step : 1;
  const speed = o.shift ? 10 : o.alt ? 0.1 : 1;
  let v = start + dx * step * speed;
  if (o.min !== undefined && Number.isFinite(o.min)) v = Math.max(o.min, v);
  if (o.max !== undefined && Number.isFinite(o.max)) v = Math.min(o.max, v);
  return Math.round(v * 100) / 100;
}

/**
 * Dragging the label of a number field (W, H, X, Y, the degree sign, ...) changes its value, like Figma. The new value goes in as typed text,
 * so each field's own handler runs. A press that does not move focuses the field as a click on the label normally does.
 */
export function installFieldScrub(onStart?: () => void, onEnd?: () => void): () => void {
  const down = (e: PointerEvent) => {
    if (e.button !== 0 || !(e.target instanceof Element)) return;
    const label = e.target.closest(".field__label");
    const input = label?.closest(".field")?.querySelector<HTMLInputElement>('input[type="number"]');
    if (!label || !input || input.disabled || input.readOnly) return;
    e.preventDefault();
    const startValue = Number(input.value) || 0;
    const startX = e.clientX;
    let dragging = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (!dragging && Math.abs(dx) < 3) return;
      if (!dragging) {
        dragging = true;
        onStart?.();
        document.body.style.cursor = "ew-resize";
        document.body.style.userSelect = "none";
      }
      const value = scrubbedValue(startValue, dx, { min: input.min === "" ? undefined : Number(input.min), max: input.max === "" ? undefined : Number(input.max), step: input.step && input.step !== "any" ? Number(input.step) : 1, shift: ev.shiftKey, alt: ev.altKey });
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      set?.call(input, String(value));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (dragging) {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        onEnd?.();
      } else {
        input.focus();
        input.select();
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  document.addEventListener("pointerdown", down, true);
  return () => document.removeEventListener("pointerdown", down, true);
}
