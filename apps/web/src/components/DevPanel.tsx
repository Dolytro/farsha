import { useState } from "react";
import { generateCode, paintCss, type Language } from "@canvylo/code-generator";
import { useEditor } from "../store";

const LANGS: { id: Language; label: string }[] = [
  { id: "css", label: "CSS" },
  { id: "html", label: "HTML" },
  { id: "react", label: "React" },
  { id: "tailwind", label: "Tailwind" },
];

const n = (v: number) => `${Math.round(v * 100) / 100}`;

export function DevPanel() {
  const { doc, selection } = useEditor();
  useEditor((s) => s.version);
  const [lang, setLang] = useState<Language>("css");
  const [copied, setCopied] = useState(false);
  const node = selection.length === 1 ? doc.getNode(selection[0]!) : undefined;

  if (!node) return <p className="props__empty">Select a layer to inspect</p>;

  const code = generateCode(node, (id) => doc.children(id), lang);
  const abs = doc.absoluteBox(node.id);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable; the code stays selectable in the block */
    }
  };

  const fills = "fills" in node ? node.fills : [];
  const strokes = "strokes" in node ? node.strokes : [];

  return (
    <div className="dev">
      <div className="props__name">{node.name}</div>

      <section className="props__section">
        <h3 className="props__heading">Measurements</h3>
        <dl className="dev__list">
          <dt>Width</dt><dd>{n(node.width)}px</dd>
          <dt>Height</dt><dd>{n(node.height)}px</dd>
          <dt>X</dt><dd>{n(node.x)}px</dd>
          <dt>Y</dt><dd>{n(node.y)}px</dd>
          {abs && (abs.x !== node.x || abs.y !== node.y) && (
            <>
              <dt>Page X / Y</dt><dd>{n(abs.x)} / {n(abs.y)}</dd>
            </>
          )}
          {node.rotation !== 0 && (<><dt>Rotation</dt><dd>{n(node.rotation)}°</dd></>)}
          {"cornerRadius" in node && node.cornerRadius > 0 && (<><dt>Radius</dt><dd>{n(node.cornerRadius)}px</dd></>)}
          {node.opacity !== 1 && (<><dt>Opacity</dt><dd>{Math.round(node.opacity * 100)}%</dd></>)}
        </dl>
      </section>

      {(fills.length > 0 || strokes.length > 0) && (
        <section className="props__section">
          <h3 className="props__heading">Colors</h3>
          {[...fills.map((p) => ["Fill", p] as const), ...strokes.map((p) => ["Stroke", p] as const)].map(([label, p], i) => (
            <div key={`${label}-${i}`} className="fill-row dev__color">
              <span className="fill-row__swatch dev__swatch" style={{ background: paintCss(p) }} />
              <span className="fill-row__hex">{p.type === "SOLID" ? p.color.toUpperCase() : p.type === "GRADIENT_RADIAL" ? "Radial" : "Linear"}</span>
              <span className="fill-row__opacity">{label}</span>
            </div>
          ))}
        </section>
      )}

      {node.type === "TEXT" && (
        <section className="props__section">
          <h3 className="props__heading">Typography</h3>
          <dl className="dev__list">
            <dt>Font</dt><dd>{node.fontFamily.split(",")[0]}</dd>
            <dt>Size</dt><dd>{n(node.fontSize)}px</dd>
            <dt>Weight</dt><dd>{node.fontWeight}</dd>
            <dt>Line height</dt><dd>{node.lineHeight === "AUTO" ? "Auto" : `${n(node.lineHeight)}px`}</dd>
            <dt>Align</dt><dd>{node.textAlign.toLowerCase()}</dd>
          </dl>
        </section>
      )}

      <section className="props__section">
        <div className="dev__tabs">
          {LANGS.map((l) => (
            <button key={l.id} className={`dev__tab${lang === l.id ? " dev__tab--active" : ""}`} onClick={() => setLang(l.id)}>
              {l.label}
            </button>
          ))}
          <button className="dev__copy" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
        </div>
        <pre className="dev__code"><code>{code}</code></pre>
      </section>
    </div>
  );
}
