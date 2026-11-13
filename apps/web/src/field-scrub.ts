import { evalFieldExpression, isPlainNumberText } from "./field-expression";

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
 * Number fields take sums: while a `.field__input` number field has focus it is a text box, so "100+20", "(8+4)*2" or "*2" can be typed;
 * the result goes in when you press Enter or leave the field (Escape puts the old value back). Plain numbers reach the field's own handler as you type,
 * anything else is held back until then, so no handler ever sees half a sum. Returns the remover.
 */
export function installFieldExpressions(): () => void {
  const old = new WeakMap<HTMLInputElement, string>();
  const isField = (t: EventTarget | null): t is HTMLInputElement => t instanceof HTMLInputElement && t.classList.contains("field__input") && (t.type === "number" || old.has(t));
  const set = (input: HTMLInputElement, value: string) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const finish = (input: HTMLInputElement, keep: boolean) => {
    const before = old.get(input);
    if (before === undefined) return;
    old.delete(input);
    const typed = input.value;
    input.type = "number";
    if (!keep || isPlainNumberText(typed)) {
      // restore, or a plain number the field already has
      if (!keep) input.value = before;
      return;
    }
    const result = evalFieldExpression(typed, Number(before) || 0);
    if (result === null) {
      input.value = before;
      return;
    }
    const min = input.min === "" ? -Infinity : Number(input.min);
    const max = input.max === "" ? Infinity : Number(input.max);
    set(input, String(Math.min(max, Math.max(min, result))));
  };
  const focusin = (e: FocusEvent) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "number" || !input.classList.contains("field__input") || input.disabled || input.readOnly) return;
    old.set(input, input.value);
    input.type = "text";
    input.inputMode = "decimal";
    input.select();
  };
  const focusout = (e: FocusEvent) => isField(e.target) && finish(e.target, true);
  const inputEvent = (e: Event) => {
    const input = e.target;
    // half a sum must not reach React's onChange (it would read it as NaN)
    if (isField(input) && old.has(input) && !isPlainNumberText(input.value)) e.stopPropagation();
  };
  const key = (e: KeyboardEvent) => {
    const input = e.target;
    if (!isField(input) || !old.has(input)) return;
    if (e.key === "Enter") {
      e.preventDefault();
      finish(input, true);
      input.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      finish(input, false);
      input.blur();
    }
  };
  document.addEventListener("focusin", focusin);
  document.addEventListener("focusout", focusout);
  document.addEventListener("input", inputEvent, true);
  document.addEventListener("keydown", key, true);
  return () => {
    document.removeEventListener("focusin", focusin);
    document.removeEventListener("focusout", focusout);
    document.removeEventListener("input", inputEvent, true);
    document.removeEventListener("keydown", key, true);
  };
}

/** Shift + Up / Down in a number field changes it by ten steps and Alt + Up / Down by a tenth (the browser only knows one step). Returns the remover. */
export function installFieldArrows(): () => void {
  const key = (e: KeyboardEvent) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || (input.type !== "number" && input.inputMode !== "decimal") || input.disabled || input.readOnly) return;
    if ((e.key !== "ArrowUp" && e.key !== "ArrowDown") || (!e.shiftKey && !e.altKey) || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    e.stopPropagation();
    const start = Number(input.value) || 0;
    const value = scrubbedValue(start, e.key === "ArrowUp" ? 1 : -1, { min: input.min === "" ? undefined : Number(input.min), max: input.max === "" ? undefined : Number(input.max), step: input.step && input.step !== "any" ? Number(input.step) : 1, shift: e.shiftKey, alt: e.altKey && !e.shiftKey });
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  document.addEventListener("keydown", key, true);
  return () => document.removeEventListener("keydown", key, true);
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
