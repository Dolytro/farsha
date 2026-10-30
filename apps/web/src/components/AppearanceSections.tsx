import type { DesignDoc } from "@canvylo/design-core";
import { paintColor, type DesignNode, type Effect, type StrokeAlign } from "@canvylo/types";

const ALIGN_LABEL: Record<StrokeAlign, string> = { INSIDE: "Inside", CENTER: "Center", OUTSIDE: "Outside" };
const EFFECT_LABEL: Record<Effect["type"], string> = { DROP_SHADOW: "Drop shadow", INNER_SHADOW: "Inner shadow", LAYER_BLUR: "Layer blur" };

const newEffect = (type: Effect["type"]): Effect =>
  type === "LAYER_BLUR"
    ? { type, radius: 4, visible: true }
    : { type, x: 0, y: 4, blur: 4, color: "#000000", opacity: 0.25, visible: true };

export function StrokeSection({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  if (!("strokes" in node) || !node.strokes) return null;
  const stroke = node.strokes[0];
  const align = ("strokeAlign" in node ? node.strokeAlign : undefined) ?? "CENTER";
  return (
    <section className="props__section">
      <h3 className="props__heading props__heading--row">
        Stroke
        {!stroke && (
          <button className="props__add" title="Add stroke" onClick={() => doc.setStyle(node.id, { strokes: [{ type: "SOLID", color: "#000000", opacity: 1 }] })}>
            +
          </button>
        )}
      </h3>
      {stroke && (
        <>
          <div className="fill-row">
            <input
              className="fill-row__swatch"
              type="color"
              value={paintColor(stroke)}
              onChange={(e) => doc.setStyle(node.id, { strokes: [{ type: "SOLID", color: e.target.value, opacity: stroke.opacity }] })}
            />
            <span className="fill-row__hex">{paintColor(stroke).replace("#", "").toUpperCase()}</span>
            <input
              className="fill-row__pct"
              type="number"
              min={0}
              max={100}
              value={Math.round(stroke.opacity * 100)}
              onChange={(e) => doc.setStyle(node.id, { strokes: [{ ...stroke, opacity: Math.min(1, Math.max(0, Number(e.target.value) / 100)) }] })}
            />
            <button className="props__add" title="Remove stroke" onClick={() => doc.setStyle(node.id, { strokes: [] })}>
              −
            </button>
          </div>
          <div className="props__grid props__grid--gap">
            <select className="field__select" value={align} onChange={(e) => doc.setStyle(node.id, { strokeAlign: e.target.value as StrokeAlign })}>
              {(Object.keys(ALIGN_LABEL) as StrokeAlign[]).map((a) => (
                <option key={a} value={a}>
                  {ALIGN_LABEL[a]}
                </option>
              ))}
            </select>
            <label className="field">
              <span className="field__label">W</span>
              <input
                className="field__input"
                type="number"
                min={0}
                step={0.5}
                value={node.strokeWidth}
                onChange={(e) => doc.setStyle(node.id, { strokeWidth: Math.max(0, Number(e.target.value)) })}
              />
            </label>
          </div>
        </>
      )}
    </section>
  );
}

export function EffectsSection({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  const effects = node.effects ?? [];
  const set = (next: Effect[]) => doc.setStyle(node.id, { effects: next });
  const patch = (i: number, p: Partial<Effect>) => set(effects.map((e, j) => (j === i ? ({ ...e, ...p } as Effect) : e)));
  const changeType = (i: number, type: Effect["type"]) => {
    const old = effects[i]!;
    set(effects.map((e, j) => (j === i ? { ...newEffect(type), visible: old.visible } : e)));
  };
  const numField = (i: number, label: string, key: "x" | "y" | "blur" | "radius", value: number, min?: number) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <input className="field__input" type="number" min={min} value={value} onChange={(e) => Number.isFinite(Number(e.target.value)) && patch(i, { [key]: Number(e.target.value) })} />
    </label>
  );

  return (
    <section className="props__section">
      <h3 className="props__heading props__heading--row">
        Effects
        <button className="props__add" title="Add effect" onClick={() => set([...effects, newEffect("DROP_SHADOW")])}>
          +
        </button>
      </h3>
      {effects.map((e, i) => (
        <div className="effect" key={i}>
          <div className="effect__head">
            <select className="field__select" value={e.type} onChange={(ev) => changeType(i, ev.target.value as Effect["type"])}>
              {(Object.keys(EFFECT_LABEL) as Effect["type"][]).map((t) => (
                <option key={t} value={t}>
                  {EFFECT_LABEL[t]}
                </option>
              ))}
            </select>
            <button className="props__add" title={e.visible ? "Hide effect" : "Show effect"} onClick={() => patch(i, { visible: !e.visible })}>
              {e.visible ? "◉" : "○"}
            </button>
            <button className="props__add" title="Remove effect" onClick={() => set(effects.filter((_, j) => j !== i))}>
              −
            </button>
          </div>
          {e.type === "LAYER_BLUR" ? (
            <div className="props__grid">{numField(i, "B", "radius", e.radius, 0)}</div>
          ) : (
            <>
              <div className="props__grid">
                {numField(i, "X", "x", e.x)}
                {numField(i, "Y", "y", e.y)}
                {numField(i, "B", "blur", e.blur, 0)}
              </div>
              <div className="fill-row">
                <input className="fill-row__swatch" type="color" value={e.color} onChange={(ev) => patch(i, { color: ev.target.value })} />
                <span className="fill-row__hex">{e.color.replace("#", "").toUpperCase()}</span>
                <input
                  className="fill-row__pct"
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round(e.opacity * 100)}
                  onChange={(ev) => patch(i, { opacity: Math.min(1, Math.max(0, Number(ev.target.value) / 100)) })}
                />
              </div>
            </>
          )}
        </div>
      ))}
    </section>
  );
}
