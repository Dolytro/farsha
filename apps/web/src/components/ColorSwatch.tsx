import { useEffect, useMemo, useRef, useState } from "react";
import { cssColor, hexToHsv, hexToRgb, parseCssColor, hslToRgb, hsvToHex, normalizeHex, rgbToHex, rgbToHsl, usedColors, type Hsv } from "../color-math";
import { useEditor } from "../store";

type Mode = "HEX" | "RGB" | "HSL" | "HSB" | "CSS";

/**
 * A colour swatch that opens Figma's kind of picker: a saturation / brightness square, a hue slider, an eyedropper,
 * hex / RGB / HSL inputs and the colours already used on the page. Calls `onChange` with "#rrggbb" while you drag.
 */
export function ColorSwatch({ value, onChange, className = "fill-row__swatch", label = "Color" }: { value: string; onChange: (hex: string) => void; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("HEX");
  const hex = normalizeHex(value) ?? "#000000";
  // hue is kept on its own: grey and black have no hue of their own, and dragging should not snap it to 0
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(hex));
  const root = useRef<HTMLSpanElement>(null);
  const square = useRef<HTMLDivElement>(null);
  const doc = useEditor((s) => s.doc);
  const pageId = useEditor((s) => s.pageId);

  useEffect(() => {
    if (hsvToHex(hsv) !== hex) setHsv((h) => ({ ...hexToHsv(hex), h: hexToHsv(hex).s === 0 ? h.h : hexToHsv(hex).h }));
    // follow outside changes of the colour only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const pageColors = useMemo(() => {
    if (!open) return [];
    const lists: unknown[][] = [];
    for (const n of doc.descendants(pageId)) {
      const any = n as unknown as { fills?: unknown[]; strokes?: unknown[] };
      if (Array.isArray(any.fills)) lists.push(any.fills);
      if (Array.isArray(any.strokes)) lists.push(any.strokes);
    }
    return usedColors(lists).slice(0, 18);
  }, [open, doc, pageId]);

  const set = (next: Hsv) => {
    setHsv(next);
    onChange(hsvToHex(next));
  };
  const dragSquare = (e: React.PointerEvent) => {
    const r = square.current!.getBoundingClientRect();
    set({ ...hsv, s: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), v: Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height)) });
  };
  const eyedropper = async () => {
    const Dropper = (window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
    if (!Dropper) return useEditor.getState().showToast("Your browser has no eyedropper");
    try {
      const picked = await new Dropper().open();
      const c = normalizeHex(picked.sRGBHex);
      if (c) {
        setHsv(hexToHsv(c));
        onChange(c);
      }
    } catch {
      /* cancelled */
    }
  };

  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  const num = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(v) ? v : lo)));

  return (
    <span className="colorswatch" ref={root}>
      <button className={className} style={{ background: hex }} aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)} />
      {open && (
        <div className="colorpick" role="dialog" aria-label="Color picker">
          <div className="colorpick__square" ref={square} style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))` }} onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); dragSquare(e); }} onPointerMove={(e) => e.buttons === 1 && dragSquare(e)}>
            <span className="colorpick__knob" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex }} />
          </div>
          <div className="colorpick__row">
            <button className="props__add" title="Pick a color from the screen" aria-label="Eyedropper" onClick={() => void eyedropper()}>
              ✎
            </button>
            <input className="colorpick__hue" type="range" min={0} max={360} step={1} aria-label="Hue" value={Math.round(hsv.h)} onChange={(e) => set({ ...hsv, h: Number(e.target.value) })} />
          </div>
          <div className="colorpick__row">
            <select className="colorpick__mode" aria-label="Color mode" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option>HEX</option>
              <option>RGB</option>
              <option>HSL</option>
              <option>HSB</option>
              <option>CSS</option>
            </select>
            {mode === "HEX" && (
              <input
                className="colorpick__field"
                aria-label="Hex"
                defaultValue={hex.slice(1).toUpperCase()}
                key={hex}
                onKeyDown={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  const c = normalizeHex(e.currentTarget.value);
                  if (c) {
                    setHsv(hexToHsv(c));
                    onChange(c);
                  }
                }}
              />
            )}
            {mode === "RGB" &&
              (["r", "g", "b"] as const).map((k) => (
                <input key={k} className="colorpick__field colorpick__field--num" type="number" aria-label={k.toUpperCase()} min={0} max={255} value={rgb[k]} onChange={(e) => { const c = rgbToHex({ ...rgb, [k]: num(Number(e.target.value), 0, 255) }); setHsv(hexToHsv(c)); onChange(c); }} />
              ))}
            {mode === "CSS" && (
              <input
                className="colorpick__field"
                aria-label="CSS color"
                defaultValue={cssColor(hex)}
                key={hex}
                onKeyDown={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  const c = parseCssColor(e.currentTarget.value);
                  if (c) {
                    setHsv(hexToHsv(c));
                    onChange(c);
                  }
                }}
              />
            )}
            {mode === "HSB" &&
              (["h", "s", "v"] as const).map((k) => (
                <input
                  key={k}
                  className="colorpick__field colorpick__field--num"
                  type="number"
                  aria-label={k === "v" ? "B" : k.toUpperCase()}
                  min={0}
                  max={k === "h" ? 360 : 100}
                  value={k === "h" ? Math.round(hsv.h) : Math.round(hsv[k] * 100)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const next = { ...hsv, [k]: k === "h" ? num(v, 0, 360) : num(v, 0, 100) / 100 };
                    setHsv(next);
                    onChange(hsvToHex(next));
                  }}
                />
              ))}
            {mode === "HSL" &&
              (["h", "s", "l"] as const).map((k) => (
                <input
                  key={k}
                  className="colorpick__field colorpick__field--num"
                  type="number"
                  aria-label={k.toUpperCase()}
                  min={0}
                  max={k === "h" ? 360 : 100}
                  value={k === "h" ? Math.round(hsl.h) : Math.round(hsl[k] * 100)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const next = { ...hsl, [k]: k === "h" ? num(v, 0, 360) : num(v, 0, 100) / 100 };
                    const c = rgbToHex(hslToRgb(next));
                    setHsv(hexToHsv(c));
                    onChange(c);
                  }}
                />
              ))}
          </div>
          {pageColors.length > 0 && (
            <>
              <div className="colorpick__group">On this page</div>
              <div className="colorpick__chips">
                {pageColors.map((c) => (
                  <button key={c} className="colorpick__chip" style={{ background: c }} title={c.toUpperCase()} aria-label={`Use ${c}`} onClick={() => { setHsv(hexToHsv(c)); onChange(c); }} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </span>
  );
}
