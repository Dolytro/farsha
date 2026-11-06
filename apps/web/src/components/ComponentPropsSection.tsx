import type { DesignDoc } from "@farsha/design-core";
import type { ComponentProperty, DesignNode } from "@farsha/types";
import { useEditor } from "../store";
import { Select } from "./Select";

const attempt = (fn: () => void) => {
  try {
    const doc = useEditor.getState().doc;
    doc.stopCapturing();
    fn();
    doc.stopCapturing();
  } catch (err) {
    useEditor.getState().showToast(err instanceof Error ? err.message : "Couldn't do that");
  }
};

/** Component properties: define them on a main component, set them on an instance. */
export function ComponentPropsSection({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  if (node.type !== "FRAME") return null;

  if (node.isComponent) {
    const props = node.componentProps ?? [];
    const layers = doc.descendants(node.id);
    const add = (type: ComponentProperty["type"]) => {
      const target = layers.find((l) => (type === "TEXT" ? l.type === "TEXT" : true));
      if (!target) return useEditor.getState().showToast(type === "TEXT" ? "Add a text layer to the component first" : "Add a layer to the component first");
      attempt(() => void doc.addComponentProperty(node.id, type, target.id));
    };
    return (
      <section className="props__section">
        <h3 className="props__heading">Description</h3>
        <textarea
          className="field__input field__input--wide field__input--area"
          rows={2}
          maxLength={500}
          aria-label="Component description"
          placeholder="What is this component for?"
          value={node.description ?? ""}
          onChange={(e) => doc.setStyle(node.id, { description: e.target.value || null })}
        />
        <h3 className="props__heading props__heading--row">
          Component properties
          <span className="props__tools">
            <button className="props__link" title="Show or hide a layer" onClick={() => add("BOOLEAN")}>
              + Boolean
            </button>
            <button className="props__link" title="Change a text layer's text" onClick={() => add("TEXT")}>
              + Text
            </button>
          </span>
        </h3>
        {props.length === 0 && <p className="props__hint">Properties let instances show or hide a layer, or change a text.</p>}
        {props.map((p) => (
          <div className="interaction" key={p.id}>
            <div className="interaction__row">
              <input
                className="field__input"
                aria-label="Property name"
                defaultValue={p.name}
                key={p.name}
                onBlur={(e) => e.currentTarget.value !== p.name && attempt(() => doc.updateComponentProperty(node.id, p.id, { name: e.currentTarget.value }))}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
              <button className="props__add" title="Remove property" onClick={() => attempt(() => doc.removeComponentProperty(node.id, p.id))}>
                −
              </button>
            </div>
            <Select
              className="field__select field__select--wide"
              aria-label="Controlled layer"
              value={p.targetId}
              onChange={(e) => attempt(() => doc.updateComponentProperty(node.id, p.id, { targetId: e.target.value }))}
            >
              {layers
                .filter((l) => (p.type === "TEXT" ? l.type === "TEXT" : true))
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </Select>
            {p.type === "BOOLEAN" ? (
              <label className="props__check">
                <input type="checkbox" checked={p.defaultValue === true} onChange={(e) => attempt(() => doc.updateComponentProperty(node.id, p.id, { defaultValue: e.target.checked }))} />
                Default: shown
              </label>
            ) : (
              <input
                className="field__input field__input--wide"
                aria-label={`${p.name} default`}
                defaultValue={String(p.defaultValue)}
                key={String(p.defaultValue)}
                onBlur={(e) => e.currentTarget.value !== p.defaultValue && attempt(() => doc.updateComponentProperty(node.id, p.id, { defaultValue: e.currentTarget.value }))}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
            )}
          </div>
        ))}
      </section>
    );
  }

  if (!node.componentId) return null;
  const main = doc.getNode(node.componentId);
  const mains = doc
    .pages()
    .flatMap((p) => doc.descendants(p.id))
    .filter((n) => n.type === "FRAME" && n.isComponent && n.id !== node.id && !doc.isAncestor(node.id, n.id) && !doc.isAncestor(n.id, node.id));
  const values = node.propValues ?? {};
  const list = main?.type === "FRAME" ? (main.componentProps ?? []) : [];
  return (
    <section className="props__section">
      {mains.length > 0 && (
        <Select className="field__select field__select--wide" aria-label="Swap instance" value={node.componentId} onChange={(e) => attempt(() => doc.swapInstance(node.id, e.target.value))}>
          {mains.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.type === "FRAME" && m.variantProps ? ` (${Object.entries(m.variantProps).map(([k, v]) => `${k}=${v}`).join(", ")})` : ""}
            </option>
          ))}
        </Select>
      )}
      {list.length > 0 && <h3 className="props__heading">Properties</h3>}
      {list.map((p) => {
        const value = values[p.id] ?? p.defaultValue;
        return p.type === "BOOLEAN" ? (
          <label className="props__check" key={p.id}>
            <input type="checkbox" checked={value === true} onChange={(e) => attempt(() => doc.setInstanceProperty(node.id, p.id, e.target.checked))} />
            {p.name}
          </label>
        ) : (
          <label className="field field--gap" key={p.id}>
            <span className="field__label field__label--wide">{p.name}</span>
            <input
              className="field__input"
              defaultValue={String(value)}
              key={String(value)}
              onBlur={(e) => e.currentTarget.value !== value && attempt(() => doc.setInstanceProperty(node.id, p.id, e.currentTarget.value))}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          </label>
        );
      })}
    </section>
  );
}
