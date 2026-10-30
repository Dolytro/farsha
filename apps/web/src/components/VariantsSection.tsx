import type { DesignDoc } from "@canvylo/design-core";
import type { DesignNode } from "@canvylo/types";
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

/** Variants of a main component (add a variant, edit property names and this variant's values), or the variant pickers of an instance. */
export function VariantsSection({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  if (node.type !== "FRAME") return null;
  const select = useEditor.getState().select;

  if (node.isComponent) {
    const props = node.variantProps ?? {};
    const inSet = !!node.componentSetId;
    return (
      <section className="props__section">
        <h3 className="props__heading props__heading--row">
          Variants
          <button className="props__add" title="Add variant" onClick={() => attempt(() => select([doc.addVariant(node.id)]))}>
            +
          </button>
        </h3>
        {!inSet && <p className="props__hint">Add a variant to create a set of this component, for example Default and Hover.</p>}
        {inSet && (
          <>
            {Object.entries(props).map(([name, value]) => (
              <div className="variant-row" key={name}>
                <input
                  className="field__input"
                  aria-label="Property name"
                  defaultValue={name}
                  key={name}
                  onBlur={(e) => e.currentTarget.value !== name && attempt(() => doc.renameVariantProperty(node.id, name, e.currentTarget.value))}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
                <input
                  className="field__input"
                  aria-label={`${name} value`}
                  defaultValue={value}
                  key={`${name}=${value}`}
                  onBlur={(e) => e.currentTarget.value.trim() && e.currentTarget.value !== value && attempt(() => doc.setVariantValue(node.id, name, e.currentTarget.value.trim()))}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
                <button className="props__add" title="Remove property" onClick={() => attempt(() => doc.removeVariantProperty(node.id, name))}>
                  −
                </button>
              </div>
            ))}
            <button className="props__link" onClick={() => attempt(() => doc.addVariantProperty(node.id, `Property ${Object.keys(props).length + 1}`))}>
              + Add property
            </button>
            <p className="props__hint">{doc.variantsOf(node.id).length} variants in this set.</p>
          </>
        )}
      </section>
    );
  }

  const main = node.componentId ? doc.getNode(node.componentId) : undefined;
  if (main?.type !== "FRAME" || !main.componentSetId) return null;
  const options = doc.variantOptions(main.id);
  return (
    <section className="props__section">
      <h3 className="props__heading">Variant</h3>
      {Object.entries(options).map(([name, values]) => (
        <label className="field field--gap" key={name}>
          <span className="field__label field__label--wide">{name}</span>
          <Select className="field__select" value={main.variantProps?.[name] ?? ""} onChange={(e) => attempt(() => doc.swapInstanceVariant(node.id, name, e.target.value))}>
            {values.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </label>
      ))}
    </section>
  );
}
