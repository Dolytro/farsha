import type { DesignDoc } from "@farsha/design-core";
import type { Constraint, DesignNode } from "@farsha/types";
import { Select } from "./Select";
import { litSides, toggleConstraint, type ConstraintSide } from "../constraint-toggle";

const HORIZONTAL: [Constraint, string][] = [
  ["MIN", "Left"],
  ["MAX", "Right"],
  ["STRETCH", "Left & Right"],
  ["CENTER", "Center"],
  ["SCALE", "Scale"],
];
const VERTICAL: [Constraint, string][] = [
  ["MIN", "Top"],
  ["MAX", "Bottom"],
  ["STRETCH", "Top & Bottom"],
  ["CENTER", "Center"],
  ["SCALE", "Scale"],
];

/** Figma's Constraints: only for layers directly inside a frame that is not auto layout. */
export function ConstraintsSection({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  const parent = node.parentId ? doc.getNode(node.parentId) : undefined;
  if (parent?.type !== "FRAME" || parent.layoutMode) return null;
  const select = (title: string, value: Constraint, options: [Constraint, string][], onChange: (c: Constraint) => void) => (
    <Select className="field__select" title={title} value={value} onChange={(e) => onChange(e.target.value as Constraint)}>
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </Select>
  );
  const h = node.constraintH ?? "MIN";
  const v = node.constraintV ?? "MIN";
  const lh = litSides(h);
  const lv = litSides(v);
  // Figma's diagram: a box for the frame, a smaller one for the layer, and a clickable line on each side and across the middle
  const line = (key: string, label: string, lit: boolean, style: React.CSSProperties, onClick: () => void) => (
    <button key={key} type="button" className={`cdiagram__line${lit ? " cdiagram__line--on" : ""}`} aria-label={label} aria-pressed={lit} title={label} style={style} onClick={onClick} />
  );
  const setH = (side: ConstraintSide) => doc.setStyle(node.id, { constraintH: toggleConstraint(h, side) });
  const setV = (side: ConstraintSide) => doc.setStyle(node.id, { constraintV: toggleConstraint(v, side) });
  return (
    <section className="props__section">
      <h3 className="props__heading">Constraints</h3>
      <div className="cdiagram" role="group" aria-label="Constraints diagram">
        <div className="cdiagram__layer" />
        {line("left", "Pin to the left", lh.start, { left: 6, top: "50%", width: 16, height: 3, marginTop: -1.5 }, () => setH("start"))}
        {line("right", "Pin to the right", lh.end, { right: 6, top: "50%", width: 16, height: 3, marginTop: -1.5 }, () => setH("end"))}
        {line("top", "Pin to the top", lv.start, { top: 6, left: "50%", width: 3, height: 16, marginLeft: -1.5 }, () => setV("start"))}
        {line("bottom", "Pin to the bottom", lv.end, { bottom: 6, left: "50%", width: 3, height: 16, marginLeft: -1.5 }, () => setV("end"))}
        {line("hcenter", "Center horizontally", lh.center, { left: "50%", top: "50%", width: 14, height: 3, marginLeft: -7, marginTop: -1.5 }, () => setH("center"))}
        {line("vcenter", "Center vertically", lv.center, { left: "50%", top: "50%", width: 3, height: 14, marginLeft: -1.5, marginTop: -7 }, () => setV("center"))}
      </div>
      <div className="props__grid">
        {select("Horizontal constraint", node.constraintH ?? "MIN", HORIZONTAL, (c) => doc.setStyle(node.id, { constraintH: c }))}
        {select("Vertical constraint", node.constraintV ?? "MIN", VERTICAL, (c) => doc.setStyle(node.id, { constraintV: c }))}
      </div>
    </section>
  );
}
