import { useState } from "react";
import { generateCode, paintCss, type Language } from "@farsha/code-generator";
import { useEditor } from "../store";
import { ExportSection } from "./ExportSection";
import { Select } from "./Select";
import { boxModelOf } from "../box-model";
import { zoomFit } from "../actions";
import { layersWithDevStatus } from "../dev-status";
import { cssVariableBlock, variablesUsed } from "../variable-code";
import type { DesignDoc } from "@farsha/design-core";
import type { DesignNode, DevResource, DevStatus } from "@farsha/types";
import { addResource, cleanResources } from "../dev-resources";
import { cleanSnippet, codeConnectFor } from "../code-connect";

const LANGS: { id: Language; label: string }[] = [
  { id: "css", label: "CSS" },
  { id: "html", label: "HTML" },
  { id: "react", label: "React" },
  { id: "vue", label: "Vue" },
  { id: "tailwind", label: "Tailwind" },
  { id: "swiftui", label: "SwiftUI" },
  { id: "uikit", label: "UIKit" },
  { id: "compose", label: "Compose" },
  { id: "androidxml", label: "Android XML" },
  { id: "flutter", label: "Flutter" },
];

const n = (v: number) => `${Math.round(v * 100) / 100}`;

export function DevPanel() {
  const { doc, selection } = useEditor();
  useEditor((s) => s.version);
  const [lang, setLang] = useState<Language>("css");
  const [copied, setCopied] = useState(false);
  const node = selection.length === 1 ? doc.getNode(selection[0]!) : undefined;

  if (!node) return <ReadyForDev />;

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

  const uses = variablesUsed(doc, node);
  const fills = "fills" in node ? (node.fills ?? []) : [];
  const strokes = "strokes" in node ? (node.strokes ?? []) : [];

  return (
    <div className="dev">
      <div className="props__name">{node.name}</div>

      <section className="props__section">
        <h3 className="props__heading">Status</h3>
        <Select
          className="field__select"
          aria-label="Dev status"
          value={node.devStatus ?? "NONE"}
          onChange={(e) => doc.setStyle(node.id, { devStatus: e.target.value === "NONE" ? null : (e.target.value as DevStatus) })}
        >
          <option value="NONE">No status</option>
          <option value="READY">Ready for dev</option>
          <option value="COMPLETED">Completed</option>
        </Select>
        <textarea
          className="field__input field__input--wide field__input--area"
          rows={2}
          aria-label="Annotation"
          placeholder="Add an annotation for developers"
          value={node.devNote ?? ""}
          onChange={(e) => doc.setStyle(node.id, { devNote: e.target.value || null })}
        />
      </section>

      <DevResources doc={doc} id={node.id} resources={node.devResources} />

      <CodeConnectSection doc={doc} node={node} />

      {(() => {
        const bm = boxModelOf(node);
        if (!bm) return null;
        const cell = (v: number) => <span className="boxmodel__num">{n(v)}</span>;
        const layer = (name: string, color: string, sides: [number, number, number, number], inner: React.ReactNode) => (
          <div className="boxmodel__layer" style={{ background: color }} aria-label={name}>
            <div className="boxmodel__label">{name}</div>
            <div className="boxmodel__row">{cell(sides[0])}</div>
            <div className="boxmodel__row boxmodel__row--mid">
              {cell(sides[3])}
              {inner}
              {cell(sides[1])}
            </div>
            <div className="boxmodel__row">{cell(sides[2])}</div>
          </div>
        );
        return (
          <section className="props__section" aria-label="Box model">
            <h3 className="props__heading">Box model</h3>
            {layer("border", "rgba(255, 184, 0, 0.35)", bm.border, layer("padding", "rgba(46, 204, 113, 0.35)", bm.padding, <div className="boxmodel__content">{n(bm.width)} × {n(bm.height)}</div>))}
          </section>
        );
      })()}

      <section className="props__section">
        <h3 className="props__heading">Measurements</h3>
        <dl className="dev__list">
          <dt>Width</dt><dd><CopyValue text={`${n(node.width)}px`} /></dd>
          <dt>Height</dt><dd><CopyValue text={`${n(node.height)}px`} /></dd>
          <dt>X</dt><dd><CopyValue text={`${n(node.x)}px`} /></dd>
          <dt>Y</dt><dd><CopyValue text={`${n(node.y)}px`} /></dd>
          {abs && (abs.x !== node.x || abs.y !== node.y) && (
            <>
              <dt>Page X / Y</dt><dd>{n(abs.x)} / {n(abs.y)}</dd>
            </>
          )}
          {node.rotation !== 0 && (<><dt>Rotation</dt><dd><CopyValue text={`${n(node.rotation)}deg`} label={`${n(node.rotation)}°`} /></dd></>)}
          {"cornerRadius" in node && node.cornerRadius > 0 && (<><dt>Radius</dt><dd><CopyValue text={`${n(node.cornerRadius)}px`} /></dd></>)}
          {node.opacity !== 1 && (<><dt>Opacity</dt><dd><CopyValue text={String(Math.round(node.opacity * 100) / 100)} label={`${Math.round(node.opacity * 100)}%`} /></dd></>)}
        </dl>
      </section>

      {node.type === "TEXT" && (
        <section className="props__section">
          <h3 className="props__heading">Typography</h3>
          <dl className="dev__list">
            <dt>Font</dt><dd><CopyValue text={node.fontFamily.split(",")[0].replace(/"/g, "")} /></dd>
            <dt>Size</dt><dd><CopyValue text={`${n(node.fontSize)}px`} /></dd>
            <dt>Weight</dt><dd><CopyValue text={String(node.fontWeight)} /></dd>
            <dt>Line height</dt><dd><CopyValue text={node.lineHeight === "AUTO" ? "normal" : `${n(node.lineHeight)}px`} label={node.lineHeight === "AUTO" ? "Auto" : undefined} /></dd>
            {node.letterSpacing !== 0 && (<><dt>Letter spacing</dt><dd><CopyValue text={`${n(node.letterSpacing)}px`} /></dd></>)}
            <dt>Align</dt><dd><CopyValue text={node.textAlign.toLowerCase()} /></dd>
          </dl>
        </section>
      )}

      {node.type === "FRAME" && (node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL") && (
        <section className="props__section">
          <h3 className="props__heading">Auto layout</h3>
          <dl className="dev__list">
            <dt>Direction</dt><dd><CopyValue text={node.layoutMode === "HORIZONTAL" ? "row" : "column"} label={node.layoutMode === "HORIZONTAL" ? "Horizontal" : "Vertical"} /></dd>
            <dt>Gap</dt><dd><CopyValue text={`${n(node.itemSpacing ?? 0)}px`} /></dd>
            <dt>Padding</dt><dd><CopyValue text={[node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].map((v) => `${n(v ?? 0)}px`).join(" ")} /></dd>
          </dl>
        </section>
      )}

      {(node.effects ?? []).some((e) => e.visible && (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW")) && (
        <section className="props__section">
          <h3 className="props__heading">Effects</h3>
          <dl className="dev__list">
            {(node.effects ?? []).flatMap((e, i) =>
              e.visible && (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW")
                ? [
                    <div key={i} style={{ display: "contents" }}>
                      <dt>{e.type === "DROP_SHADOW" ? "Drop shadow" : "Inner shadow"}</dt>
                      <dd>
                        <CopyValue text={`${e.type === "INNER_SHADOW" ? "inset " : ""}${n(e.x)}px ${n(e.y)}px ${n(e.blur)}px${e.spread ? ` ${n(e.spread)}px` : ""} ${e.color.toLowerCase()}`} label={`${n(e.x)} ${n(e.y)} ${n(e.blur)}`} />
                      </dd>
                    </div>,
                  ]
                : [],
            )}
          </dl>
        </section>
      )}

      {(fills.length > 0 || strokes.length > 0) && (
        <section className="props__section">
          <h3 className="props__heading">Colors</h3>
          {[...fills.map((p) => ["Fill", p] as const), ...strokes.map((p) => ["Stroke", p] as const)].map(([label, p], i) => (
            <div key={`${label}-${i}`} className="fill-row dev__color">
              <span className="fill-row__swatch dev__swatch" style={{ background: paintCss(p) }} />
              <span className="fill-row__hex">{p.type === "SOLID" ? <CopyValue text={p.color.toUpperCase()} /> : p.type === "GRADIENT_RADIAL" ? "Radial" : p.type === "GRADIENT_ANGULAR" ? "Angular" : p.type === "GRADIENT_DIAMOND" ? "Diamond" : p.type === "IMAGE" ? "Image" : "Linear"}</span>
              <span className="fill-row__opacity">{label}</span>
            </div>
          ))}
        </section>
      )}

      {uses.length > 0 && (
        <section className="props__section">
          <h3 className="props__heading">Variables</h3>
          <dl className="dev__list">
            {uses.map((u) => (
              <div key={`${u.id}-${u.role}`} style={{ display: "contents" }}>
                <dt title={u.role}>{u.name}</dt>
                <dd>{u.cssName}</dd>
              </div>
            ))}
          </dl>
          <pre className="dev__code"><code>{cssVariableBlock(uses)}</code></pre>
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
      {node.type !== "PAGE" && <ExportSection doc={doc} ids={[node.id]} />}
    </div>
  );
}

/** What the Dev panel shows with nothing selected: the layers on this page marked Ready for dev or Completed. */
function ReadyForDev() {
  const { doc, pageId } = useEditor();
  useEditor((s) => s.version);
  const list = layersWithDevStatus(doc, pageId);
  const go = (id: string) => {
    const s = useEditor.getState();
    s.select([id]);
    const v = zoomFit(doc, pageId, [id]);
    if (v) s.setViewport({ ...v, zoom: Math.min(v.zoom, 2) });
  };
  const group = (status: DevStatus, title: string, color: string) => {
    const items = list.filter((e) => e.status === status);
    if (!items.length) return null;
    return (
      <section className="props__section" aria-label={title}>
        <h3 className="props__heading">
          <span style={{ color }}>{status === "READY" ? "●" : "✓"}</span> {title} ({items.length})
        </h3>
        {items.map((e) => (
          <button key={e.id} className="props__link devready__item" style={{ display: "block", width: "100%", textAlign: "left" }} onClick={() => go(e.id)}>
            {e.name}
          </button>
        ))}
      </section>
    );
  };
  if (!list.length) return <p className="props__empty">Select a layer to inspect. Layers you mark Ready for dev are listed here.</p>;
  return (
    <div className="dev">
      {group("READY", "Ready for dev", "#14ae5c")}
      {group("COMPLETED", "Completed", "#7a5af8")}
      <p className="props__empty">Select a layer to inspect</p>
    </div>
  );
}

/** Dev resources: links to tickets, specs or code kept on the layer. Only http(s) addresses are accepted and opened. */
function DevResources({ doc, id, resources }: { doc: DesignDoc; id: string; resources: unknown }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const list = cleanResources(resources);
  const save = (next: DevResource[]) => doc.setStyle(id, { devResources: next.length ? next : null });
  const add = () => {
    const next = addResource(list, name, url);
    if (!next) {
      useEditor.getState().showToast("Add a web link that starts with http:// or https://");
      return;
    }
    save(next);
    setName("");
    setUrl("");
  };
  return (
    <section className="props__section">
      <h3 className="props__heading">Dev resources</h3>
      {list.map((r, i) => (
        <div className="fill-row" key={r.url}>
          <a className="props__link" href={r.url} target="_blank" rel="noopener noreferrer" title={r.url} style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.name}
          </a>
          <button className="props__add" title="Remove this link" aria-label={`Remove ${r.name}`} onClick={() => save(list.filter((_, j) => j !== i))}>
            −
          </button>
        </div>
      ))}
      <div className="fill-row">
        <input className="field__input" aria-label="Resource name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
        <input
          className="field__input"
          aria-label="Resource link"
          placeholder="https://"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") add();
          }}
        />
        <button className="props__add" title="Add link" aria-label="Add resource" onClick={add}>
          +
        </button>
      </div>
    </section>
  );
}

/** Code Connect style mapping: write the code for a main component once, and every instance shows it in Dev Mode. */
function CodeConnectSection({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  const [copied, setCopied] = useState(false);
  const isMain = node.type === "FRAME" && !!node.isComponent;
  const mapped = codeConnectFor(doc, node);
  if (!isMain && !mapped) return null;
  const copy = async () => {
    if (!mapped) return;
    try {
      await navigator.clipboard.writeText(mapped.snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable; the code stays selectable in the block */
    }
  };
  return (
    <section className="props__section">
      <h3 className="props__heading">Component code</h3>
      {isMain ? (
        <textarea
          key={node.id}
          className="field__input field__input--wide field__input--area"
          rows={5}
          aria-label="Component code snippet"
          placeholder="Code developers use for this component, for example <Button variant=&quot;primary&quot; />"
          defaultValue={node.codeSnippet ?? ""}
          onKeyDown={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const next = cleanSnippet(e.currentTarget.value);
            if (next !== (node.codeSnippet ?? null)) doc.setStyle(node.id, { codeSnippet: next });
          }}
        />
      ) : (
        mapped && (
          <>
            <p className="props__hint">From the main component {mapped.mainName}</p>
            <pre className="dev__code" aria-label="Component code">{mapped.snippet}</pre>
            <button className="props__button" onClick={copy}>
              {copied ? "Copied" : "Copy code"}
            </button>
          </>
        )
      )}
    </section>
  );
}

/** A value in the Dev panel: click it to copy it (Figma's Dev Mode does the same). `label` is what is shown when it differs from what is copied. */
function CopyValue({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1000);
      useEditor.getState().showToast(`Copied ${text}`);
    } catch {
      useEditor.getState().showToast("Couldn't copy: select the value and copy it by hand");
    }
  };
  return (
    <button className="dev__value" type="button" title={`Click to copy ${text}`} onClick={() => void copy()} style={{ all: "unset", cursor: "pointer", textDecoration: done ? "none" : "underline dotted", textUnderlineOffset: 2 }}>
      {done ? "Copied" : (label ?? text)}
    </button>
  );
}
