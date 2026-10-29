import { useEditor } from "../store";
import { connect } from "../drive/session";
import { DevPanel } from "./DevPanel";
import { EffectsSection, StrokeSection } from "./AppearanceSections";

type NumKey = "x" | "y" | "width" | "height" | "rotation";

export function Properties() {
  const { doc, selection, viewport, setViewport, devMode, setDevMode, viewer, setShareOpen } = useEditor();
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
          <button className={`props__tab${devMode ? " props__tab--active" : ""}`} onClick={() => setDevMode(true)} title="Dev Mode (Shift+D)">Dev</button>
          <span className="props__tab props__tab--disabled" title="Coming in Phase 5">Prototype</span>
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
        <p className="props__empty">Select a layer to edit its properties</p>
      </aside>
    );
  }

  const setNum = (k: NumKey, value: number) => {
    if (!Number.isFinite(value)) return;
    if (k === "rotation") doc.rotateNode(node.id, value);
    else doc.resizeNode(node.id, { [k]: value });
  };
  const num = (k: NumKey, label: string) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <input className="field__input" type="number" value={Math.round(node[k] * 100) / 100} onChange={(e) => setNum(k, Number(e.target.value))} />
    </label>
  );
  const paint = "fills" in node ? node.fills[0] : undefined;

  return (
    <aside className="props">
      {header}
      <div className="props__name">{node.name}</div>

      <section className="props__section">
        <h3 className="props__heading">Position</h3>
        <div className="props__grid">
          {num("x", "X")}
          {num("y", "Y")}
          {num("rotation", "°")}
        </div>
      </section>

      <section className="props__section">
        <h3 className="props__heading">Layout</h3>
        <div className="props__grid">
          {num("width", "W")}
          {num("height", "H")}
        </div>
      </section>

      <section className="props__section">
        <h3 className="props__heading">Appearance</h3>
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
                value={node.cornerRadius}
                onChange={(e) => doc.setStyle(node.id, { cornerRadius: Math.max(0, Number(e.target.value)) })}
              />
            </label>
          )}
        </div>
      </section>

      {node.type === "TEXT" && (
        <section className="props__section">
          <h3 className="props__heading">Typography</h3>
          <input className="field__input field__input--wide" value={node.characters} onChange={(e) => doc.setText(node.id, { characters: e.target.value })} />
          <div className="props__grid">
            <label className="field">
              <span className="field__label">Size</span>
              <input className="field__input" type="number" min={1} value={node.fontSize} onChange={(e) => doc.setText(node.id, { fontSize: Math.max(1, Number(e.target.value)) })} />
            </label>
            <label className="field">
              <span className="field__label">Wt</span>
              <input className="field__input" type="number" step={100} min={100} max={900} value={node.fontWeight} onChange={(e) => doc.setText(node.id, { fontWeight: Number(e.target.value) })} />
            </label>
          </div>
        </section>
      )}

      {paint && (
        <section className="props__section">
          <h3 className="props__heading">Fill</h3>
          <div className="fill-row">
            <input
              className="fill-row__swatch"
              type="color"
              value={paint.color}
              onChange={(e) => doc.setStyle(node.id, { fills: [{ type: "SOLID", color: e.target.value, opacity: paint.opacity }] })}
            />
            <span className="fill-row__hex">{paint.color.replace("#", "").toUpperCase()}</span>
            <span className="fill-row__opacity">{Math.round(paint.opacity * 100)}%</span>
          </div>
        </section>
      )}

      <StrokeSection doc={doc} node={node} />
      <EffectsSection doc={doc} node={node} />
    </aside>
  );
}
