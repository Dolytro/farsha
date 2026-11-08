import type { DesignDoc } from "@farsha/design-core";
import type { DesignNode } from "@farsha/types";
import { Select } from "./Select";

/** Figma's explicit variable mode: a frame can show one mode (say Dark) whatever mode the file is in. With several collections the list names the collection too. */
export function ExplicitModeSection({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  const collections = doc.collections();
  const options = collections.flatMap((c) => doc.modes(c.id).map((m) => ({ id: m.id, label: collections.length > 1 ? `${c.name} / ${m.name}` : m.name })));
  if (node.type !== "FRAME" || options.length < 2) return null;
  const value = node.explicitMode && options.some((m) => m.id === node.explicitMode) ? node.explicitMode : "auto";
  return (
    <section className="props__section">
      <Select className="field__select field__select--wide" aria-label="Explicit variable mode" title="Variable mode of this frame and its layers" value={value} onChange={(e) => doc.setStyle(node.id, { explicitMode: e.target.value === "auto" ? null : e.target.value })}>
        <option value="auto">Mode: auto</option>
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            Mode: {m.label}
          </option>
        ))}
      </Select>
    </section>
  );
}
