import type { DesignDoc } from "@farsha/design-core";
import type { Box, Paint } from "@farsha/types";
import { paintColor } from "@farsha/types";
import { commonValue, selectionFrame, setCommonStyle, setSelectionBox } from "../multi-edit";
import { fitText } from "../text-layout";
import { ColorSwatch } from "./ColorSwatch";
import { HexInput } from "./HexInput";

/** What the Design panel shows for several layers: the box round them (X, Y, W, H), opacity and corner radius where they share it, and one fill for all. */
export function MultiSection({ doc, ids }: { doc: DesignDoc; ids: string[] }) {
  const frame = selectionFrame(doc, ids);
  const nodes = ids.map((id) => doc.getNode(id)).filter((n): n is NonNullable<typeof n> => !!n);
  if (!frame || nodes.length < 2) return null;
  const box = frame.box;
  const refit = () => {
    for (const n of nodes) if (doc.getNode(n.id)?.type === "TEXT") fitText(doc, n.id);
  };
  const boxField = (key: keyof Box, label: string, resizes: boolean) => (
    <label className="field" key={key}>
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        type="number"
        aria-label={label}
        disabled={resizes && !frame.sameParent}
        title={resizes && !frame.sameParent ? "Layers in different frames can only be moved together" : undefined}
        value={Math.round(box[key] * 100) / 100}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (e.target.value === "" || !Number.isFinite(v)) return;
          setSelectionBox(doc, ids, { [key]: v });
          if (resizes) refit();
        }}
      />
    </label>
  );
  const opacity = commonValue(nodes.map((n) => Math.round(n.opacity * 100)));
  const withRadius = nodes.filter((n) => "cornerRadius" in n);
  const radius = withRadius.length ? commonValue(withRadius.map((n) => ("cornerRadius" in n ? n.cornerRadius : 0))) : undefined;
  const firstFills = nodes.filter((n) => "fills" in n && Array.isArray(n.fills)).map((n) => ("fills" in n ? ((n.fills as Paint[])[0] ?? null) : null));
  const solid = firstFills.every((f) => f && f.type === "SOLID") && firstFills.length > 0 ? commonValue(firstFills.map((f) => (f ? paintColor(f).toLowerCase() : ""))) : null;
  const applyFill = (color: string) => setCommonStyle(doc, ids, "fills", [{ type: "SOLID", color, opacity: 1 }]);
  return (
    <>
      <section className="props__section">
        <h3 className="props__heading">Position</h3>
        <div className="props__grid">
          {boxField("x", "X", false)}
          {boxField("y", "Y", false)}
        </div>
      </section>
      <section className="props__section">
        <h3 className="props__heading">Layout</h3>
        <div className="props__grid">
          {boxField("width", "W", true)}
          {boxField("height", "H", true)}
        </div>
      </section>
      <section className="props__section">
        <h3 className="props__heading">Appearance</h3>
        <div className="props__grid">
          <label className="field" title="Opacity of every selected layer">
            <span className="field__label">%</span>
            <input
              className="field__input"
              type="number"
              min={0}
              max={100}
              aria-label="Opacity of the selection"
              placeholder="Mixed"
              value={opacity ?? ""}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (e.target.value !== "" && Number.isFinite(v)) setCommonStyle(doc, ids, "opacity", Math.min(1, Math.max(0, v / 100)));
              }}
            />
          </label>
          {withRadius.length > 0 && (
            <label className="field" title="Corner radius of every selected layer that has one">
              <span className="field__label">◜</span>
              <input
                className="field__input"
                type="number"
                min={0}
                aria-label="Corner radius of the selection"
                placeholder="Mixed"
                value={radius ?? ""}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (e.target.value !== "" && Number.isFinite(v)) setCommonStyle(doc, ids, "cornerRadius", Math.max(0, v));
                }}
              />
            </label>
          )}
        </div>
      </section>
      {firstFills.length > 0 && (
        <section className="props__section">
          <h3 className="props__heading">Fill</h3>
          <div className="fill-row">
            <ColorSwatch value={solid ?? "#d9d9d9"} onChange={applyFill} />
            {solid ? <HexInput value={solid} onChange={applyFill} /> : <span className="fill-row__hex" title="The layers have different fills: pick a colour to give them all the same one">Mixed</span>}
          </div>
        </section>
      )}
    </>
  );
}
