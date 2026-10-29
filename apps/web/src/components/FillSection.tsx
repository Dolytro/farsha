import type { DesignDoc } from "@canvylo/design-core";
import { paintCss } from "@canvylo/code-generator";
import { paintColor, type DesignNode, type GradientPaint, type GradientStop, type Paint } from "@canvylo/types";

type Kind = Paint["type"];
const KIND_LABEL: Record<Kind, string> = { SOLID: "Solid", GRADIENT_LINEAR: "Linear", GRADIENT_RADIAL: "Radial" };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Convert a paint to another kind, keeping its colour. */
export function convertPaint(p: Paint, kind: Kind): Paint {
  if (p.type === kind) return p;
  if (kind === "SOLID") return { type: "SOLID", color: paintColor(p), opacity: p.opacity };
  if (p.type !== "SOLID") return { ...p, type: kind };
  return {
    type: kind,
    angle: 90,
    opacity: p.opacity,
    stops: [
      { position: 0, color: p.color, opacity: 1 },
      { position: 1, color: p.color, opacity: 0 },
    ],
  };
}

export function FillSection({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  if (!("fills" in node)) return null;
  const paint = node.fills[0];
  const setPaint = (p: Paint) => doc.setStyle(node.id, { fills: [p] });

  if (!paint) {
    return (
      <section className="props__section">
        <h3 className="props__heading props__heading--row">
          Fill
          <button className="props__add" title="Add fill" onClick={() => setPaint({ type: "SOLID", color: "#d9d9d9", opacity: 1 })}>
            +
          </button>
        </h3>
      </section>
    );
  }

  const setStops = (g: GradientPaint, stops: GradientStop[]) => setPaint({ ...g, stops });
  return (
    <section className="props__section">
      <h3 className="props__heading props__heading--row">
        Fill
        <button className="props__add" title="Remove fill" onClick={() => doc.setStyle(node.id, { fills: [] })}>
          −
        </button>
      </h3>
      <select className="field__select field__select--wide" value={paint.type} onChange={(e) => setPaint(convertPaint(paint, e.target.value as Kind))}>
        {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
          <option key={k} value={k}>
            {KIND_LABEL[k]}
          </option>
        ))}
      </select>

      {paint.type === "SOLID" ? (
        <div className="fill-row fill-row--gap">
          <input className="fill-row__swatch" type="color" value={paint.color} onChange={(e) => setPaint({ ...paint, color: e.target.value })} />
          <span className="fill-row__hex">{paint.color.replace("#", "").toUpperCase()}</span>
          <input
            className="fill-row__pct"
            type="number"
            min={0}
            max={100}
            value={Math.round(paint.opacity * 100)}
            onChange={(e) => setPaint({ ...paint, opacity: clamp01(Number(e.target.value) / 100) })}
          />
        </div>
      ) : (
        <>
          <div className="gradient-bar" style={{ background: paintCss({ ...paint, type: "GRADIENT_LINEAR", angle: 0 }) }} />
          {paint.type === "GRADIENT_LINEAR" && (
            <label className="field field--gap" title="Angle (0 = left to right, 90 = top to bottom)">
              <span className="field__label">∠</span>
              <input className="field__input" type="number" value={paint.angle} onChange={(e) => Number.isFinite(Number(e.target.value)) && setPaint({ ...paint, angle: Number(e.target.value) })} />
            </label>
          )}
          {paint.stops.map((s, i) => {
            const patch = (p: Partial<GradientStop>) => setStops(paint, paint.stops.map((o, j) => (j === i ? { ...o, ...p } : o)));
            return (
              <div className="fill-row fill-row--gap" key={i}>
                <input
                  className="fill-row__pct"
                  type="number"
                  min={0}
                  max={100}
                  title="Stop position (%)"
                  value={Math.round(s.position * 100)}
                  onChange={(e) => patch({ position: clamp01(Number(e.target.value) / 100) })}
                />
                <input className="fill-row__swatch" type="color" value={s.color} onChange={(e) => patch({ color: e.target.value })} />
                <span className="fill-row__hex">{s.color.replace("#", "").toUpperCase()}</span>
                <input className="fill-row__pct" type="number" min={0} max={100} title="Stop opacity (%)" value={Math.round(s.opacity * 100)} onChange={(e) => patch({ opacity: clamp01(Number(e.target.value) / 100) })} />
                <button
                  className="props__add"
                  title="Remove stop"
                  disabled={paint.stops.length <= 2}
                  onClick={() => setStops(paint, paint.stops.filter((_, j) => j !== i))}
                >
                  −
                </button>
              </div>
            );
          })}
          <button
            className="props__link"
            onClick={() => {
              const last = paint.stops[paint.stops.length - 1];
              setStops(paint, [...paint.stops, { position: 1, color: last?.color ?? "#000000", opacity: 1 }]);
            }}
          >
            + Add stop
          </button>
        </>
      )}
    </section>
  );
}
