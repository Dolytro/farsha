import type { BlendMode } from "@canvylo/types";
import { useEditor } from "../store";
import { connect } from "../drive/session";
import { DevPanel } from "./DevPanel";
import { fitText } from "../text-layout";
import { ConstraintsSection } from "./ConstraintsSection";
import { AutoLayoutSection, ChildSizingSection } from "./AutoLayoutSection";
import { AlignRow } from "./AlignRow";
import { PrototypePanel } from "./PrototypePanel";
import { VariantsSection } from "./VariantsSection";
import { ExportSection } from "./ExportSection";
import { FillSection } from "./FillSection";
import { TypographySection } from "./TypographySection";
import { EffectsSection, StrokeSection } from "./AppearanceSections";

const BLEND_MODES: [BlendMode, string][] = [
  ["NORMAL", "Normal"],
  ["DARKEN", "Darken"],
  ["MULTIPLY", "Multiply"],
  ["COLOR_BURN", "Color burn"],
  ["LIGHTEN", "Lighten"],
  ["SCREEN", "Screen"],
  ["COLOR_DODGE", "Color dodge"],
  ["OVERLAY", "Overlay"],
  ["SOFT_LIGHT", "Soft light"],
  ["HARD_LIGHT", "Hard light"],
  ["DIFFERENCE", "Difference"],
  ["EXCLUSION", "Exclusion"],
  ["HUE", "Hue"],
  ["SATURATION", "Saturation"],
  ["COLOR", "Color"],
  ["LUMINOSITY", "Luminosity"],
];

type NumKey = "x" | "y" | "width" | "height" | "rotation";

export function Properties() {
  const { doc, selection, select, viewport, setViewport, devMode, setDevMode, prototypeMode, setPrototypeMode, viewer, setShareOpen } = useEditor();
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
        <p className="props__empty">{selection.length > 1 ? `${selection.length} layers selected` : "Select a layer to edit its properties"}</p>
      </aside>
    );
  }

  const setNum = (k: NumKey, value: number) => {
    if (!Number.isFinite(value)) return;
    if (k === "rotation") doc.rotateNode(node.id, value);
    else {
      doc.resizeNode(node.id, { [k]: value });
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
        </div>
      </section>

      <ConstraintsSection doc={doc} node={node} />

      <section className="props__section">
        <h3 className="props__heading">Layout</h3>
        <div className="props__grid">
          {num("width", "W")}
          {num("height", "H")}
        </div>
      </section>

      <section className="props__section">
        <h3 className="props__heading">Appearance</h3>
        <select
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
        </select>
        <div className="props__grid">
          <label className="field">
            <span className="field__label">%</span>
            <input
              className="field__input"
              type="number"
              min={0}
              max={100}
              value={Math.round(node.opacity * 100)}
              onChange={(e) => doc.setStyle(node.id, { opacity: Math.min(1, Math.max(0, Number(e.target.value) / 100)) })}
            />
          </label>
          {"cornerRadius" in node && (
            <label className="field">
              <span className="field__label">R</span>
              <input
                className="field__input"
                type="number"
                min={0}
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
              onClick={() => {
                const r = node.cornerRadius;
                doc.setStyle(node.id, node.cornerRadii ? { cornerRadii: null } : { cornerRadii: [r, r, r, r] });
              }}
            >
              ⌜⌝
            </button>
          )}
        </div>
        {(node.type === "RECTANGLE" || node.type === "FRAME") && node.cornerRadii && (
          <div className="props__grid props__grid--gap">
            {(["↖", "↗", "↘", "↙"] as const).map((icon, i) => (
              <label className="field" key={icon} title={["Top left", "Top right", "Bottom right", "Bottom left"][i]}>
                <span className="field__label">{icon}</span>
                <input
                  className="field__input"
                  type="number"
                  min={0}
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
      </section>

      {node.type === "TEXT" && <TypographySection doc={doc} node={node} />}

      <FillSection doc={doc} node={node} />

      <VariantsSection doc={doc} node={node} />
      <ChildSizingSection doc={doc} node={node} />
      <AutoLayoutSection doc={doc} node={node} select={select} />
      <StrokeSection doc={doc} node={node} />
      <EffectsSection doc={doc} node={node} />
      {node.type !== "PAGE" && <ExportSection doc={doc} ids={[node.id]} />}
    </aside>
  );
}
