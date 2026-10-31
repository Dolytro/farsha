import type { DesignDoc } from "@canvylo/design-core";
import type { TextAlign, TextAutoResize, TextCase, TextDirection, TextList, TextNode, TextVerticalAlign } from "@canvylo/types";
import { useState } from "react";
import { fitText } from "../text-layout";
import { TextStyleMenu, TextStylePill } from "./TextStyleMenu";
import { Select } from "./Select";

export const FONTS: { label: string; stack: string }[] = [
  { label: "Inter", stack: "Inter, system-ui, sans-serif" },
  { label: "Roboto", stack: "Roboto, system-ui, sans-serif" },
  { label: "Arial", stack: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica", stack: "Helvetica, Arial, sans-serif" },
  { label: "Georgia", stack: "Georgia, serif" },
  { label: "Times New Roman", stack: "'Times New Roman', Times, serif" },
  { label: "Courier New", stack: "'Courier New', monospace" },
  { label: "System UI", stack: "system-ui, sans-serif" },
];

export const WEIGHTS: [number, string][] = [
  [100, "Thin"],
  [200, "Extra Light"],
  [300, "Light"],
  [400, "Regular"],
  [500, "Medium"],
  [600, "Semi Bold"],
  [700, "Bold"],
  [800, "Extra Bold"],
  [900, "Black"],
];

const ALIGNS: [TextAlign, string, string][] = [
  ["JUSTIFIED", "☰", "Justify"],
  ["LEFT", "⇤", "Align left"],
  ["CENTER", "↔", "Align center"],
  ["RIGHT", "⇥", "Align right"],
];

const RESIZE: [TextAutoResize, string, string][] = [
  ["WIDTH_AND_HEIGHT", "Auto width", "Auto width"],
  ["HEIGHT", "Auto height", "Auto height (wraps at the layer width)"],
  ["NONE", "Fixed", "Fixed size"],
];

const firstFamily = (stack: string) => stack.split(",")[0]!.trim().replace(/['"]/g, "");

type FontValue = Pick<TextNode, "fontFamily" | "fontSize" | "fontWeight" | "lineHeight" | "letterSpacing">;

/** Family, weight, size, line height and letter spacing: used for a text layer and for editing a text style. */
function FontControls({ value: node, onChange: set }: { value: FontValue; onChange: (patch: Partial<FontValue>) => void }) {
  const known = FONTS.find((f) => firstFamily(f.stack) === firstFamily(node.fontFamily));
  const weightKnown = WEIGHTS.some(([w]) => w === node.fontWeight);
  return (
    <>
      <Select className="field__select field__select--wide" value={known?.stack ?? node.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })}>
        {!known && <option value={node.fontFamily}>{firstFamily(node.fontFamily)}</option>}
        {FONTS.map((f) => (
          <option key={f.label} value={f.stack}>
            {f.label}
          </option>
        ))}
      </Select>
      <div className="props__grid props__grid--gap">
        <Select className="field__select" value={node.fontWeight} onChange={(e) => set({ fontWeight: Number(e.target.value) })}>
          {!weightKnown && <option value={node.fontWeight}>{node.fontWeight}</option>}
          {WEIGHTS.map(([w, label]) => (
            <option key={w} value={w}>
              {label}
            </option>
          ))}
        </Select>
        <label className="field">
          <span className="field__label">Size</span>
          <input className="field__input" type="number" min={1} value={node.fontSize} onChange={(e) => Number(e.target.value) > 0 && set({ fontSize: Number(e.target.value) })} />
        </label>
        <label className="field" title="Line height (empty = Auto)">
          <span className="field__label">↕</span>
          <input
            className="field__input"
            type="number"
            min={0}
            placeholder="Auto"
            value={node.lineHeight === "AUTO" ? "" : node.lineHeight}
            onChange={(e) => {
              const v = e.target.value === "" ? 0 : Number(e.target.value);
              if (!Number.isFinite(v)) return;
              set({ lineHeight: v > 0 ? v : "AUTO" });
            }}
          />
        </label>
        <label className="field" title="Letter spacing (px)">
          <span className="field__label">↔</span>
          <input className="field__input" type="number" step={0.1} value={node.letterSpacing} onChange={(e) => Number.isFinite(Number(e.target.value)) && set({ letterSpacing: Number(e.target.value) })} />
        </label>
      </div>
    </>
  );
}

export function TypographySection({ doc, node }: { doc: DesignDoc; node: TextNode }) {
  const [editingStyle, setEditingStyle] = useState(false);
  const style = node.textStyleId ? doc.getTextStyle(node.textStyleId) : undefined;
  const set = (patch: Parameters<DesignDoc["setText"]>[1]) => {
    doc.setText(node.id, patch);
    fitText(doc, node.id);
  };
  // Editing the style changes every text layer that uses it, so each one is re-measured.
  const setStyleProps = (patch: Partial<FontValue>) => {
    if (!style) return;
    doc.updateTextStyle(style.id, patch);
    for (const page of doc.pages()) for (const n of doc.descendants(page.id)) if (n.type === "TEXT" && n.textStyleId === style.id) fitText(doc, n.id);
  };

  return (
    <section className="props__section">
      <h3 className="props__heading props__heading--row">
        Typography
        <span className="props__tools">
          <TextStyleMenu doc={doc} node={node} />
        </span>
      </h3>
      {style && <TextStylePill doc={doc} node={node} style={style} editing={editingStyle} setEditing={setEditingStyle} />}
      <textarea className="field__input field__input--wide field__input--area" rows={2} value={node.characters} onChange={(e) => set({ characters: e.target.value })} />
      {(!style || editingStyle) && <FontControls value={style && editingStyle ? style : node} onChange={style ? setStyleProps : set} />}
      <div className="seg seg--flat typo-format" role="group" aria-label="Text style">
        {([
          ["bold", "B", "Bold (Ctrl+B)", node.fontWeight >= 600, { fontWeight: node.fontWeight >= 600 ? 400 : 700 }],
          ["italic", "I", "Italic (Ctrl+I)", !!node.italic, { italic: !node.italic }],
          ["underline", "U", "Underline (Ctrl+U)", node.textDecoration === "UNDERLINE", { textDecoration: node.textDecoration === "UNDERLINE" ? "NONE" : "UNDERLINE" }],
          ["strikethrough", "S", "Strikethrough (Ctrl+Shift+X)", node.textDecoration === "STRIKETHROUGH", { textDecoration: node.textDecoration === "STRIKETHROUGH" ? "NONE" : "STRIKETHROUGH" }],
        ] as [string, string, string, boolean, Parameters<DesignDoc["setText"]>[1]][]).map(([key, label, title, on, patch]) => (
          <button key={key} className={`seg__btn typo-format__${key}${on ? " seg__btn--active" : ""}`} title={title} aria-pressed={on} onClick={() => set(patch)}>
            {label}
          </button>
        ))}
      </div>
      <div className="props__grid props__grid--gap">
        <Select className="field__select" aria-label="Text case" value={node.textCase ?? "NONE"} onChange={(e) => set({ textCase: e.target.value as TextCase })}>
          <option value="NONE">Original case</option>
          <option value="UPPER">UPPER CASE</option>
          <option value="LOWER">lower case</option>
          <option value="TITLE">Title Case</option>
        </Select>
        <Select className="field__select" aria-label="Vertical alignment" value={node.textVerticalAlign ?? "TOP"} onChange={(e) => set({ textVerticalAlign: e.target.value as TextVerticalAlign })}>
          <option value="TOP">Align top</option>
          <option value="CENTER">Align middle</option>
          <option value="BOTTOM">Align bottom</option>
        </Select>
      </div>
      <div className="props__grid props__grid--gap">
        <Select className="field__select" aria-label="List style" value={node.textList ?? "NONE"} onChange={(e) => set({ textList: e.target.value as TextList })}>
          <option value="NONE">No list</option>
          <option value="BULLET">Bulleted list</option>
          <option value="NUMBER">Numbered list</option>
        </Select>
        <Select className="field__select" aria-label="Text direction" value={node.textDirection ?? "LTR"} onChange={(e) => set({ textDirection: e.target.value as TextDirection })}>
          <option value="LTR">Left to right</option>
          <option value="RTL">Right to left</option>
        </Select>
      </div>
      <Select
        className="field__select field__select--wide"
        aria-label="Text variable"
        value={node.textVariableId ?? ""}
        onChange={(e) => {
          try {
            doc.stopCapturing();
            doc.bindTextVariable(node.id, e.target.value || null);
            fitText(doc, node.id);
            doc.stopCapturing();
          } catch {
            /* the variable was removed meanwhile */
          }
        }}
      >
        <option value="">No variable</option>
        {doc.textVariables().map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </Select>
      {(
        [
          ["Para. spacing", "paragraphSpacing", "Extra space between paragraphs, in pixels"],
          ["Indent", "paragraphIndent", "Indent of the first line of every paragraph, in pixels"],
          ["Max lines", "maxLines", "Show at most this many lines and end with … (0 shows all)"],
        ] as const
      ).map(([label, key, title]) => (
        <label className="field field--row" key={key} title={title}>
          <span className="field__label field__label--text">{label}</span>
          <input
            className="field__input"
            type="number"
            min={0}
            step={key === "maxLines" ? 1 : 2}
            aria-label={label}
            value={node[key] ?? 0}
            onChange={(e) => set({ [key]: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
      ))}
      <label className="field" title="Web address this text links to (opens when presenting)">
        <span className="field__label">Link</span>
        <input className="field__input" type="url" aria-label="Text link" placeholder="https://" value={node.textLink ?? ""} onChange={(e) => set({ textLink: e.target.value || null })} />
      </label>
      <div className="seg">
        {RESIZE.map(([mode, label, title]) => (
          <button key={mode} className={`seg__btn${(node.textAutoResize ?? "WIDTH_AND_HEIGHT") === mode ? " seg__btn--active" : ""}`} title={title} onClick={() => set({ textAutoResize: mode })}>
            {label}
          </button>
        ))}
      </div>
      <div className="seg">
        {ALIGNS.map(([a, icon, title]) => (
          <button key={a} className={`seg__btn${node.textAlign === a ? " seg__btn--active" : ""}`} title={title} onClick={() => set({ textAlign: a })}>
            {icon}
          </button>
        ))}
      </div>
    </section>
  );
}
