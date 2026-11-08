import type { DesignDoc } from "@farsha/design-core";
import type { DesignNode } from "@farsha/types";
import { Select } from "./Select";

/** Figma's mask type: an alpha mask shows the layers above through its shape, a luminance mask through how light its own fills are. */
export function MaskSection({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  if (!node.isMask) return null;
  const shape = node.type === "RECTANGLE" || node.type === "ELLIPSE" || node.type === "FRAME";
  return (
    <section className="props__section">
      <h3 className="props__heading">Mask</h3>
      <Select
        className="field__select field__select--wide"
        aria-label="Mask type"
        title={shape ? "Alpha: the shape reveals. Luminance: the lighter its fills, the more it reveals" : "Only rectangles, ellipses and frames can be luminance masks"}
        value={shape && node.maskType === "LUMINANCE" ? "LUMINANCE" : "ALPHA"}
        onChange={(e) => doc.setStyle(node.id, { maskType: e.target.value === "LUMINANCE" ? "LUMINANCE" : "ALPHA" })}
      >
        <option value="ALPHA">Alpha</option>
        {shape && <option value="LUMINANCE">Luminance</option>}
      </Select>
    </section>
  );
}
