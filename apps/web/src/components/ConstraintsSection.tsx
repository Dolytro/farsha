import type { DesignDoc } from "@canvylo/design-core";
import type { Constraint, DesignNode } from "@canvylo/types";

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
    <select className="field__select" title={title} value={value} onChange={(e) => onChange(e.target.value as Constraint)}>
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
  return (
    <section className="props__section">
      <h3 className="props__heading">Constraints</h3>
      <div className="props__grid">
        {select("Horizontal constraint", node.constraintH ?? "MIN", HORIZONTAL, (c) => doc.setStyle(node.id, { constraintH: c }))}
        {select("Vertical constraint", node.constraintV ?? "MIN", VERTICAL, (c) => doc.setStyle(node.id, { constraintV: c }))}
      </div>
    </section>
  );
}
