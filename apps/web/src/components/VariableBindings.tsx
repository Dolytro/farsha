import { BOOLEAN_BINDABLE, NUMBER_BINDABLE, variableAllowsProperty, type DesignNode } from "@farsha/types";
import type { DesignDoc } from "@farsha/design-core";
import { Select } from "./Select";

const LABEL: Record<string, string> = {
  width: "Width",
  height: "Height",
  cornerRadius: "Corner radius",
  opacity: "Opacity (%)",
  itemSpacing: "Gap",
  paddingLeft: "Padding left",
  paddingRight: "Padding right",
  paddingTop: "Padding top",
  paddingBottom: "Padding bottom",
  fontSize: "Font size",
  strokeWidth: "Stroke weight",
  rotation: "Rotation",
  visible: "Visible",
};

/** The Variables section of the Design panel: number and boolean variables that drive properties of the layer. */
export function VariableBindings({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  const numbers = doc.valueVariables("NUMBER");
  const booleans = doc.valueVariables("BOOLEAN");
  const bindings = node.varBindings ?? {};
  if (!numbers.length && !booleans.length && !Object.keys(bindings).length) return null;
  const free = [...NUMBER_BINDABLE, ...BOOLEAN_BINDABLE].filter((p) => !(p in bindings) && (p in node || p === "visible"));
  const run = (fn: () => void) => {
    try {
      doc.stopCapturing();
      fn();
      doc.stopCapturing();
    } catch {
      /* the variable was removed meanwhile */
    }
  };
  return (
    <section className="props__section">
      <h3 className="props__heading">Variables</h3>
      {Object.entries(bindings).map(([prop, id]) => (
        <div className="export-row" key={prop} style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) 24px" }}>
          <span>{LABEL[prop] ?? prop}</span>
          <span className="props__hint">{doc.getColorVariable(id)?.name ?? "Missing"}</span>
          <button className="props__add" title="Detach the variable" aria-label={`Detach ${LABEL[prop] ?? prop}`} onClick={() => run(() => doc.bindProperty(node.id, prop, null))}>
            −
          </button>
        </div>
      ))}
      {free.length > 0 && (
        <Select
          className="field__select field__select--wide"
          aria-label="Bind a property to a variable"
          value=""
          onChange={(e) => {
            const [prop, id] = e.target.value.split("|");
            if (prop && id) run(() => doc.bindProperty(node.id, prop, id));
          }}
        >
          <option value="">Bind a property…</option>
          {free.flatMap((prop) =>
            ((BOOLEAN_BINDABLE as readonly string[]).includes(prop) ? booleans : numbers.filter((v) => variableAllowsProperty(v, prop))).map((v) => (
              <option key={`${prop}|${v.id}`} value={`${prop}|${v.id}`}>
                {LABEL[prop] ?? prop} → {v.name}
              </option>
            )),
          )}
        </Select>
      )}
    </section>
  );
}
