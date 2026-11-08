import type { BlendMode } from "@farsha/types";
import { useEditor } from "../store";
import { connect } from "../drive/session";
import { DevPanel } from "./DevPanel";
import { fitText } from "../text-layout";
import { ConstraintsSection } from "./ConstraintsSection";
import { AutoLayoutSection, ChildSizingSection } from "./AutoLayoutSection";
import { AlignRow } from "./AlignRow";
import { PrototypePanel } from "./PrototypePanel";
import { VariantsSection } from "./VariantsSection";
import { ComponentPropsSection } from "./ComponentPropsSection";
import { ExplicitModeSection } from "./ExplicitModeSection";
import { BLEND_MODES } from "../blend-modes";
import { LayoutGridSection } from "./LayoutGridSection";
import { ExportSection } from "./ExportSection";
import { FillSection } from "./FillSection";
import { TypographySection } from "./TypographySection";
import { EffectsSection, StrokeSection } from "./AppearanceSections";
import { PolygonSection } from "./PolygonSection";
import { Select } from "./Select";
import { ColorSwatch } from "./ColorSwatch";
import { VariableBindings } from "./VariableBindings";
import { flipSelection } from "../actions";
import { rotateSelectionBy } from "../object-actions";
import { FRAME_PRESETS, presetLabel, presetOf } from "../frame-presets";
import { SelectionColors } from "./SelectionColors";
import { LocalStyles } from "./LocalStyles";


type NumKey = "x" | "y" | "width" | "height" | "rotation";

export function Properties() {
  const { doc, pageId, selection, select, viewport, setViewport, devMode, setDevMode, prototypeMode, setPrototypeMode, viewer, setShareOpen } = useEditor();
  const signedIn = useEditor((s) => s.drive.user !== null);
  useEditor((s) => s.version);
  const node = selection.length === 1 ? doc.getNode(selection[0]!) : undefined;

  const header = (
    <header className="props__header">
      {viewer ? (
        <div className="props__tabs">
          <span className="props__tab props__tab--active">{viewer === "inspect" ? "Inspect" : "View only"}</span>
        </div>
      ) : (
        <div className="props__tabs">
          <button className={`props__tab${devMode ? "" : " props__tab--active"}`} onClick={() => setDevMode(false)}>Design</button>
          <button className={`props__tab${devMode && !prototypeMode ? " props__tab--active" : ""}`} onClick={() => setDevMode(true)} title="Dev Mode (Shift+D)">Dev</button>
          <button className={`props__tab${prototypeMode ? " props__tab--active" : ""}`} onClick={() => setPrototypeMode(true)} title="Prototype">Prototype</button>
        </div>
      )}
      <div className="props__actions">
        {!viewer && (
          <button className="props__share" onClick={() => setShareOpen(true)}>
            Share
          </button>
        )}
        <button className="props__zoom" title="Reset zoom to 100%" onClick={() => setViewport({ ...viewport, zoom: 1 })}>
          {Math.round(viewport.zoom * 100)}%
        </button>
      </div>
    </header>
  );

  if (prototypeMode && !viewer) {
    return (
      <aside className="props">
        {header}
        <PrototypePanel />
      </aside>
    );
  }

  if (devMode) {
    return (
      <aside className="props">
        {header}
        {viewer === "view" ? (
          <p className="props__empty">View only. Ask the owner for an Inspect link to see measurements and code.</p>
        ) : viewer === "inspect" && !signedIn ? (
          <div className="props__gate">
            <p>Inspect shows measurements, colors and code. Sign in with Google to use it.</p>
            <button className="props__share" onClick={() => void connect()}>
              Sign in with Google
            </button>
          </div>
        ) : (
          <DevPanel />
        )}
      </aside>
    );
  }

  if (!node) {
    return (
      <aside className="props">
        {header}
        {!viewer && <AlignRow />}
        {selection.length === 0 && !viewer && (
          <section className="props__section">
            <h3 className="props__heading">Page</h3>
            <div className="fill-row fill-row--gap">
              <ColorSwatch label="Page background" value={doc.pageBackground(pageId) ?? "#e5e5e5"} onChange={(color) => doc.setPageBackground(pageId, color)} />
              <span className="fill-row__hex">{(doc.pageBackground(pageId) ?? "#e5e5e5").slice(1).toUpperCase()}</span>
              <button className="props__add" title="Reset page background" aria-label="Reset page background" onClick={() => doc.setPageBackground(pageId, undefined)}>
                ↺
              </button>
            </div>
          </section>
        )}
        {selection.length === 0 && !viewer && <LocalStyles />}
        {selection.length === 0 && !viewer && <ExportSection doc={doc} ids={[]} pageId={pageId} />}
        {selection.length > 0 && !viewer && <SelectionColors />}
        <p className="props__empty">{selection.length > 1 ? `${selection.length} layers selected` : "Select a layer to edit its properties"}</p>
      </aside>
    );
  }

  const setNum = (k: NumKey, value: number) => {
    if (!Number.isFinite(value)) return;
    if (k === "rotation") doc.rotateNode(node.id, value);
    else {
      // with the proportions locked, the other side follows by the same factor
      const ratio = node.lockAspect && (k === "width" || k === "height") ? (k === "width" ? node.height / (node.width || 1) : node.width / (node.height || 1)) : null;
      doc.resizeNode(node.id, ratio === null ? { [k]: value } : k === "width" ? { width: value, height: Math.round(value * ratio * 100) / 100 } : { height: value, width: Math.round(value * ratio * 100) / 100 });
      if (node.type === "TEXT" && (k === "width" || k === "height")) {
        // Same rule as dragging a handle: height gives a fixed box, width gives auto height.
        if (k === "height") doc.setText(node.id, { textAutoResize: "NONE" });
        else if ((node.textAutoResize ?? "WIDTH_AND_HEIGHT") === "WIDTH_AND_HEIGHT") doc.setText(node.id, { textAutoResize: "HEIGHT" });
        fitText(doc, node.id);
      }
    }
  };
  const num = (k: NumKey, label: string) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <input className="field__input" type="number" value={Math.round(node[k] * 100) / 100} onChange={(e) => setNum(k, Number(e.target.value))} />
    </label>
  );

  const radii = "cornerRadii" in node ? node.cornerRadii : undefined;

  return (
    <aside className="props">
      {header}
      {!viewer && <AlignRow />}
      <div className="props__name">{node.name}</div>

      <section className="props__section">
        <h3 className="props__heading">Position</h3>
        <div className="props__grid">
          {num("x", "X")}
          {num("y", "Y")}
          {num("rotation", "°")}
          <div className="props__flips" role="group" aria-label="Rotate and flip">
            <button className="seg__btn" title="Rotate 90°" aria-label="Rotate 90 degrees" onClick={() => rotateSelectionBy(doc, [node.id], 90)}>
              ⟳
            </button>
            <button className="seg__btn" title="Flip horizontal (Shift+H)" aria-label="Flip horizontal" onClick={() => flipSelection(doc, [node.id], "x")}>
              ⇆
            </button>
            <button className="seg__btn" title="Flip vertical (Shift+V)" aria-label="Flip vertical" onClick={() => flipSelection(doc, [node.id], "y")}>
              ⇅
            </button>
          </div>
        </div>
      </section>

      <ConstraintsSection doc={doc} node={node} />

      <section className="props__section">
        <h3 className="props__heading">Layout</h3>
        {node.type === "FRAME" && !node.isSection && (
          <Select
            className="field__select field__select--wide field--gap"
            aria-label="Frame size preset"
            value={String(FRAME_PRESETS.indexOf(presetOf(node.width, node.height) as never))}
            onChange={(e) => {
              const p = FRAME_PRESETS[Number(e.target.value)];
              if (p) doc.resizeNode(node.id, { width: p.width, height: p.height });
            }}
          >
            <option value="-1">Custom size</option>
            {FRAME_PRESETS.map((p, i) => (
              <option key={i} value={String(i)}>
                {presetLabel(p)}
              </option>
            ))}
          </Select>
        )}
        <div className="props__grid">
          {num("width", "W")}
          {num("height", "H")}
          <button
            className={`seg__btn props__ratio${node.lockAspect ? " seg__btn--active" : ""}`}
            title={node.lockAspect ? "Unlock proportions" : "Lock proportions"}
            aria-label="Lock proportions"
            aria-pressed={!!node.lockAspect}
            onClick={() => doc.setStyle(node.id, { lockAspect: node.lockAspect ? null : true })}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
              {node.lockAspect ? (
                <path d="M6.5 9.5l3-3M5 11a2.5 2.5 0 010-3.5L6.5 6M11 5a2.5 2.5 0 010 3.5L9.5 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              ) : (
                <path d="M5 11a2.5 2.5 0 010-3.5L6.5 6M11 5a2.5 2.5 0 010 3.5L9.5 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </section>

      <section className="props__section">
        <h3 className="props__heading">Appearance</h3>
        <Select
          className="field__select field__select--wide"
          title="Blend mode"
          value={node.blendMode ?? "NORMAL"}
          onChange={(e) => doc.setStyle(node.id, { blendMode: e.target.value as BlendMode })}
        >
          {BLEND_MODES.map(([mode, label]) => (
            <option key={mode} value={mode}>
              {label}
            </option>
          ))}
        </Select>
        <div className={`props__grid props__grid--corner${"cornerRadius" in node && (node.type === "RECTANGLE" || node.type === "FRAME") ? " props__grid--corner-toggle" : ""}`}>
          <label className="field" title="Layer opacity">
            <span className="field__label">%</span>
            <input
              className="field__input"
              type="number"
              min={0}
              max={100}
              aria-label="Opacity"
              value={Math.round(node.opacity * 100)}
              onChange={(e) => doc.setStyle(node.id, { opacity: Math.min(1, Math.max(0, Number(e.target.value) / 100)) })}
            />
          </label>
          {"cornerRadius" in node && (
            <label className="field" title="Corner radius">
              <span className="field__label">
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                  <path d="M2 10V6a4 4 0 014-4h4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </span>
              <input
                className="field__input"
                type="number"
                min={0}
                aria-label="Corner radius"
                value={radii ? "" : node.cornerRadius}
                placeholder={radii ? "Mixed" : undefined}
                onChange={(e) => doc.setStyle(node.id, { cornerRadius: Math.max(0, Number(e.target.value)), cornerRadii: null })}
              />
            </label>
          )}
          {(node.type === "RECTANGLE" || node.type === "FRAME") && (
            <button
              className={`seg__btn props__corner-toggle${node.cornerRadii ? " seg__btn--active" : ""}`}
              title="Independent corners"
              aria-label="Independent corners"
              aria-pressed={!!node.cornerRadii}
              onClick={() => {
                const r = node.cornerRadius;
                doc.setStyle(node.id, node.cornerRadii ? { cornerRadii: null } : { cornerRadii: [r, r, r, r] });
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                <path d="M2 5V3.5A1.5 1.5 0 013.5 2H5M9 2h1.5A1.5 1.5 0 0112 3.5V5M12 9v1.5a1.5 1.5 0 01-1.5 1.5H9M5 12H3.5A1.5 1.5 0 012 10.5V9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        {(node.type === "RECTANGLE" || node.type === "FRAME") && node.cornerRadii && (
          <div className="props__grid props__grid--gap">
            {(
              [
                ["Top left", "M2 10V6a4 4 0 014-4h4"],
                ["Top right", "M2 2h4a4 4 0 014 4v4"],
                ["Bottom right", "M10 2v4a4 4 0 01-4 4H2"],
                ["Bottom left", "M10 10H6a4 4 0 01-4-4V2"],
              ] as const
            ).map(([title, path], i) => (
              <label className="field" key={title} title={`${title} radius`}>
                <span className="field__label">
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                    <path d={path} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  className="field__input"
                  type="number"
                  min={0}
                  aria-label={`${title} radius`}
                  value={node.cornerRadii![i]}
                  onChange={(e) => {
                    const next = [...node.cornerRadii!] as [number, number, number, number];
                    next[i] = Math.max(0, Number(e.target.value));
                    doc.setStyle(node.id, { cornerRadii: next });
                  }}
                />
              </label>
            ))}
          </div>
        )}
        {(node.type === "RECTANGLE" || node.type === "FRAME") && (
          <label className="field field--row" title="How far the corner curve eases into the edge (0 to 100%)">
            <span className="field__label field__label--text">Smoothing</span>
            <input
              className="field__input"
              type="number"
              min={0}
              max={100}
              step={5}
              aria-label="Corner smoothing"
              value={Math.round((node.cornerSmoothing ?? 0) * 100)}
              onChange={(e) => doc.setStyle(node.id, { cornerSmoothing: Math.min(1, Math.max(0, Number(e.target.value) / 100)) })}
            />
          </label>
        )}
      </section>

      {node.type === "TEXT" && <TypographySection doc={doc} node={node} />}

      <FillSection doc={doc} node={node} />

      <VariableBindings doc={doc} node={node} />

      <PolygonSection doc={doc} node={node} />

      <VariantsSection doc={doc} node={node} />
      <ComponentPropsSection doc={doc} node={node} />
      <ExplicitModeSection doc={doc} node={node} />
      <ChildSizingSection doc={doc} node={node} />
      <AutoLayoutSection doc={doc} node={node} select={select} />
      <LayoutGridSection doc={doc} node={node} />
      <StrokeSection doc={doc} node={node} />
      {(node.type === "FRAME" || node.type === "GROUP") && <SelectionColors />}
      <EffectsSection doc={doc} node={node} />
      {node.type !== "PAGE" && <ExportSection doc={doc} ids={[node.id]} />}
    </aside>
  );
}
