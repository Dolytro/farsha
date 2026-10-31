import type { DesignDoc } from "@canvylo/design-core";
import { paintColor, type DesignNode, type Effect, type LineEnd, type Paint, type StrokeAlign, type StrokeCap, type StrokeJoin } from "@canvylo/types";
import { HexInput } from "./HexInput";
import { VariableButton, VariableChip } from "./VariableMenu";
import { Select } from "./Select";

const LINE_END_LABEL: Record<LineEnd, string> = { NONE: "none", ARROW_LINES: "line arrow", ARROW_FILLED: "triangle arrow", CIRCLE: "circle", SQUARE: "square", DIAMOND: "diamond" };

const ALIGN_LABEL: Record<StrokeAlign, string> = { INSIDE: "Inside", CENTER: "Center", OUTSIDE: "Outside" };
const EFFECT_LABEL: Record<Effect["type"], string> = { DROP_SHADOW: "Drop shadow", INNER_SHADOW: "Inner shadow", LAYER_BLUR: "Layer blur", BACKGROUND_BLUR: "Background blur" };

const newEffect = (type: Effect["type"]): Effect =>
  type === "LAYER_BLUR" || type === "BACKGROUND_BLUR"
    ? { type, radius: 4, visible: true }
    : { type, x: 0, y: 4, blur: 4, color: "#000000", opacity: 0.25, visible: true };

/** Strokes are stored bottom to top and listed top first; position and weight are shared by all of them. */
export function StrokeSection({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  if (!("strokes" in node) || !node.strokes) return null;
  const strokes = node.strokes;
  const align = ("strokeAlign" in node ? node.strokeAlign : undefined) ?? "CENTER";
  const setStrokes = (next: Paint[]) => doc.setStyle(node.id, { strokes: next });
  // Drawn vectors take one stroke; frames, rectangles and ellipses can stack several.
  const canAdd = node.type !== "VECTOR" || strokes.length === 0;
  return (
    <section className="props__section">
      <h3 className="props__heading props__heading--row">
        Stroke
        {canAdd && (
          <button className="props__add" title="Add stroke" onClick={() => setStrokes([...strokes, { type: "SOLID", color: "#000000", opacity: 1 }])}>
            +
          </button>
        )}
      </h3>
      {strokes.map((_, k) => strokes.length - 1 - k).map((i) => {
        const stroke = strokes[i]!;
        const replace = (p: Paint) => setStrokes(strokes.map((s, j) => (j === i ? p : s)));
        const bound = stroke.type === "SOLID" && stroke.variableId;
        return (
          <div key={i}>
            {bound ? <VariableChip doc={doc} variableId={stroke.variableId!} onDetach={() => doc.bindPaintVariable(node.id, "strokes", i, null)} /> : null}
            <div className="fill-row fill-row--gap">
              {!bound && (
                <>
                  <input className="fill-row__swatch" type="color" value={paintColor(stroke)} onChange={(e) => replace({ type: "SOLID", color: e.target.value, opacity: stroke.opacity })} />
                  <HexInput value={paintColor(stroke)} onChange={(color) => replace({ type: "SOLID", color, opacity: stroke.opacity })} />
                  {stroke.type === "SOLID" && <VariableButton doc={doc} onPick={(variableId) => doc.bindPaintVariable(node.id, "strokes", i, variableId)} />}
                </>
              )}
              <input
                className="fill-row__pct"
                type="number"
                min={0}
                max={100}
                value={Math.round(stroke.opacity * 100)}
                onChange={(e) => replace({ ...stroke, opacity: Math.min(1, Math.max(0, Number(e.target.value) / 100)) })}
              />
              <button className="props__add" title="Remove stroke" onClick={() => setStrokes(strokes.filter((_, j) => j !== i))}>
                −
              </button>
            </div>
          </div>
        );
      })}
      {strokes.length > 0 && (
        <div className="props__grid props__grid--gap">
          <Select className="field__select" value={align} onChange={(e) => doc.setStyle(node.id, { strokeAlign: e.target.value as StrokeAlign })}>
            {(Object.keys(ALIGN_LABEL) as StrokeAlign[]).map((a) => (
              <option key={a} value={a}>
                {ALIGN_LABEL[a]}
              </option>
            ))}
          </Select>
          <label className="field">
            <span className="field__label">W</span>
            <input className="field__input" type="number" min={0} step={0.5} value={node.strokeWidth ?? 1} onChange={(e) => doc.setStyle(node.id, { strokeWidth: Math.max(0, Number(e.target.value)) })} />
          </label>
        </div>
      )}
      {strokes.length > 0 && (node.type === "RECTANGLE" || node.type === "FRAME") && (
        <>
          <div className="props__grid props__grid--gap">
            <button
              className={`seg__btn${node.strokeSides ? " seg__btn--active" : ""}`}
              title="Individual stroke sides"
              aria-label="Individual stroke sides"
              onClick={() => doc.setStyle(node.id, { strokeSides: node.strokeSides ? null : (Array(4).fill(node.strokeWidth ?? 1) as [number, number, number, number]) })}
            >
              Sides
            </button>
          </div>
          {node.strokeSides && (
            <div className="props__grid props__grid--gap">
              {(["T", "R", "B", "L"] as const).map((label, i) => (
                <label className="field" key={label} title={["Top", "Right", "Bottom", "Left"][i]! + " stroke weight"}>
                  <span className="field__label">{label}</span>
                  <input
                    className="field__input"
                    type="number"
                    min={0}
                    step={0.5}
                    aria-label={["Top", "Right", "Bottom", "Left"][i]! + " stroke weight"}
                    value={node.strokeSides![i]}
                    onChange={(e) => {
                      const next = [...node.strokeSides!] as [number, number, number, number];
                      next[i] = Math.max(0, Number(e.target.value));
                      doc.setStyle(node.id, { strokeSides: next });
                    }}
                  />
                </label>
              ))}
            </div>
          )}
        </>
      )}
      {strokes.length > 0 && (
        <div className="props__grid props__grid--gap">
          <label className="field" title="Dash length in pixels (0 = solid line)">
            <span className="field__label">Dash</span>
            <input
              className="field__input"
              type="number"
              min={0}
              value={node.strokeDash?.[0] ?? 0}
              onChange={(e) => {
                const dash = Math.max(0, Number(e.target.value));
                doc.setStyle(node.id, { strokeDash: dash > 0 ? [dash, node.strokeDash?.[1] ?? dash] : [] });
              }}
            />
          </label>
          <label className="field" title="Gap between dashes in pixels">
            <span className="field__label">Gap</span>
            <input
              className="field__input"
              type="number"
              min={0}
              disabled={!(node.strokeDash?.[0] ?? 0)}
              value={node.strokeDash?.[1] ?? 0}
              onChange={(e) => doc.setStyle(node.id, { strokeDash: [node.strokeDash?.[0] ?? 0, Math.max(0, Number(e.target.value))] })}
            />
          </label>
          <Select className="field__select" aria-label="Stroke cap" title="Line cap" value={node.strokeCap ?? (node.type === "VECTOR" ? "ROUND" : "NONE")} onChange={(e) => doc.setStyle(node.id, { strokeCap: e.target.value as StrokeCap })}>
            <option value="NONE">Cap: none</option>
            <option value="ROUND">Cap: round</option>
            <option value="SQUARE">Cap: square</option>
          </Select>
          <Select className="field__select" aria-label="Stroke join" title="Line join" value={node.strokeJoin ?? (node.type === "VECTOR" ? "ROUND" : "MITER")} onChange={(e) => doc.setStyle(node.id, { strokeJoin: e.target.value as StrokeJoin })}>
            <option value="MITER">Join: miter</option>
            <option value="BEVEL">Join: bevel</option>
            <option value="ROUND">Join: round</option>
          </Select>
          {node.type === "VECTOR" &&
            (["strokeStartCap", "strokeEndCap"] as const).map((key) => (
              <Select key={key} className="field__select" aria-label={key === "strokeStartCap" ? "Start point" : "End point"} value={node[key] ?? "NONE"} onChange={(e) => doc.setStyle(node.id, { [key]: e.target.value as LineEnd })}>
                {(["NONE", "ARROW_LINES", "ARROW_FILLED", "CIRCLE", "SQUARE", "DIAMOND"] as const).map((v) => (
                  <option key={v} value={v}>
                    {key === "strokeStartCap" ? "Start: " : "End: "}
                    {LINE_END_LABEL[v]}
                  </option>
                ))}
              </Select>
            ))}
        </div>
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
  const numField = (i: number, label: string, key: "x" | "y" | "blur" | "radius" | "spread", value: number, min?: number) => (
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
            <Select className="field__select" value={e.type} onChange={(ev) => changeType(i, ev.target.value as Effect["type"])}>
              {(Object.keys(EFFECT_LABEL) as Effect["type"][]).map((t) => (
                <option key={t} value={t}>
                  {EFFECT_LABEL[t]}
                </option>
              ))}
            </Select>
            <button className="props__add" title={e.visible ? "Hide effect" : "Show effect"} onClick={() => patch(i, { visible: !e.visible })}>
              {e.visible ? "◉" : "○"}
            </button>
            <button className="props__add" title="Remove effect" onClick={() => set(effects.filter((_, j) => j !== i))}>
              −
            </button>
          </div>
          {e.type === "LAYER_BLUR" || e.type === "BACKGROUND_BLUR" ? (
            <div className="props__grid">{numField(i, "B", "radius", e.radius, 0)}</div>
          ) : (
            <>
              <div className="props__grid">
                {numField(i, "X", "x", e.x)}
                {numField(i, "Y", "y", e.y)}
                {numField(i, "B", "blur", e.blur, 0)}
                {numField(i, "S", "spread", e.spread ?? 0)}
              </div>
              <div className="fill-row">
                <input className="fill-row__swatch" type="color" value={e.color} onChange={(ev) => patch(i, { color: ev.target.value })} />
                <HexInput value={e.color} onChange={(color) => patch(i, { color })} />
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
