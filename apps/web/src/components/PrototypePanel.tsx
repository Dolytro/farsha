import type { Easing, Interaction, InteractionAction, InteractionTrigger, OverlayPosition, TransitionType } from "@farsha/types";
import { flowsOf, prototypeFrames, startFrame, topFrameOf } from "../prototype";
import { useEditor } from "../store";
import { Select } from "./Select";
import { HexInput } from "./HexInput";
import { ColorSwatch } from "./ColorSwatch";

const TRIGGERS: [InteractionTrigger, string][] = [
  ["ON_CLICK", "On click"],
  ["ON_HOVER", "While hovering"],
  ["ON_MOUSE_ENTER", "Mouse enter"],
  ["ON_MOUSE_LEAVE", "Mouse leave"],
  ["ON_MOUSE_DOWN", "Mouse down"],
  ["ON_MOUSE_UP", "Mouse up"],
  ["ON_DRAG", "On drag"],
  ["AFTER_DELAY", "After delay"],
  ["ON_KEY", "Key press"],
];

const TRANSITIONS: [TransitionType, string][] = [
  ["INSTANT", "Instant"],
  ["SMART_ANIMATE", "Smart animate"],
  ["DISSOLVE", "Dissolve"],
  ["SLIDE_IN_LEFT", "Slide in from left"],
  ["SLIDE_IN_RIGHT", "Slide in from right"],
  ["SLIDE_IN_TOP", "Slide in from top"],
  ["SLIDE_IN_BOTTOM", "Slide in from bottom"],
];

const EASINGS: [Easing, string][] = [
  ["EASE_IN_OUT", "Ease in and out"],
  ["EASE_IN", "Ease in"],
  ["EASE_OUT", "Ease out"],
  ["LINEAR", "Linear"],
  ["SPRING", "Spring"],
];

const POSITIONS: [OverlayPosition, string][] = [
  ["CENTER", "Centre"],
  ["TOP", "Top"],
  ["BOTTOM", "Bottom"],
];

const KEYS: [string, string][] = [
  ["ArrowLeft", "Arrow left"],
  ["ArrowRight", "Arrow right"],
  ["ArrowUp", "Arrow up"],
  ["ArrowDown", "Arrow down"],
  ["Enter", "Enter"],
  [" ", "Space"],
];

/** The Prototype tab: interactions of the selected layer, and the Present button. */
export function PrototypePanel() {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const setPresenting = useEditor((s) => s.setPresenting);
  const showToast = useEditor((s) => s.showToast);
  const device = useEditor((s) => s.presentDevice);
  const setDevice = useEditor((s) => s.setPresentDevice);
  const background = useEditor((s) => s.presentBackground);
  const setBackground = useEditor((s) => s.setPresentBackground);
  const zoom = useEditor((s) => s.presentScale);
  const setZoom = useEditor((s) => s.setPresentScale);
  useEditor((s) => s.version);
  const node = selection.length === 1 ? doc.getNode(selection[0]!) : undefined;
  const frames = prototypeFrames(doc);
  const flows = flowsOf(doc);

  const present = () => {
    const frame = startFrame(doc, selection);
    if (frame) setPresenting(frame);
    else showToast("Add a frame to present");
  };

  const interactions = node?.interactions ?? [];
  const set = (next: Interaction[]) => node && doc.setStyle(node.id, { interactions: next });
  const defaultTarget = frames.find((f) => f.id !== node?.id)?.id;
  const navigate = (): InteractionAction => ({ type: "NAVIGATE", targetId: defaultTarget ?? "" });

  return (
    <>
      <section className="props__section">
        <button className="props__button props__button--primary" onClick={present} title="Present (Ctrl+Alt+Enter)">
          ▶ Present
        </button>
        <Select className="field__select field__select--wide" aria-label="Device" value={device} onChange={(e) => setDevice(e.target.value as "none" | "phone" | "tablet")}>
          <option value="none">No device frame</option>
          <option value="phone">Phone frame</option>
          <option value="tablet">Tablet frame</option>
        </Select>
        <Select className="field__select field__select--wide" aria-label="Scale" value={zoom} onChange={(e) => setZoom(e.target.value as "FIT" | "FILL" | "ACTUAL")}>
          <option value="FIT">Scale: fit</option>
          <option value="FILL">Scale: fill</option>
          <option value="ACTUAL">Scale: 100%</option>
        </Select>
        <div className="fill-row" title="Colour behind the frame while presenting">
          <ColorSwatch value={background} onChange={setBackground} />
          <HexInput value={background} onChange={setBackground} />
        </div>
        {flows.length > 0 && (
          <div className="flows" role="group" aria-label="Flows">
            {flows.map((f) => (
              <button key={f.frameId} className="props__button" onClick={() => setPresenting(f.frameId)} title="Present this flow">
                ▶ {f.name}
              </button>
            ))}
          </div>
        )}
      </section>
      {node && frames.some((f) => f.id === node.id) && (
        <section className="props__section">
          <label className="props__check">
            <input type="checkbox" aria-label="Flow starting point" checked={!!node.flowStart} onChange={(e) => doc.setStyle(node.id, { flowStart: e.target.checked ? true : null })} />
            Flow starting point
          </label>
          {node.flowStart && (
            <input className="field__input field__input--wide" aria-label="Flow name" placeholder="Flow name" defaultValue={node.type === "FRAME" ? (node.flowName ?? "") : ""} key={node.id} onBlur={(e) => doc.setStyle(node.id, { flowName: e.currentTarget.value.trim() || null })} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") e.currentTarget.blur(); }} />
          )}
          <Select
            className="field__select field__select--wide"
            aria-label="Scrolling"
            value={node.type === "FRAME" ? (node.overflowScroll ?? "NONE") : "NONE"}
            onChange={(e) => doc.setStyle(node.id, { overflowScroll: e.target.value === "NONE" ? null : (e.target.value as "VERTICAL") })}
          >
            <option value="NONE">No scrolling</option>
            <option value="VERTICAL">Vertical scrolling</option>
            <option value="HORIZONTAL">Horizontal scrolling</option>
            <option value="BOTH">Both</option>
          </Select>
        </section>
      )}
      {!node || node.type === "PAGE" ? (
        <p className="props__empty">Select a layer to link it to a frame.</p>
      ) : (
        <section className="props__section">
          <h3 className="props__heading props__heading--row">
            Interactions
            <button className="props__add" title="Add interaction" disabled={!defaultTarget} onClick={() => defaultTarget && set([...interactions, { trigger: "ON_CLICK", action: navigate() }])}>
              +
            </button>
          </h3>
          {interactions.length === 0 && <p className="props__hint">{frames.length < 2 ? "Create at least two frames to link them." : "On click, navigate to a frame."}</p>}
          {interactions.map((it, i) => {
            const replace = (next: Interaction) => set(interactions.map((x, j) => (j === i ? next : x)));
            const patch = (p: Partial<Interaction>) => replace({ ...it, ...p });
            return (
              <div className="interaction" key={i}>
                <div className="interaction__row">
                  <Select
                    className="field__select"
                    aria-label="Trigger"
                    value={it.trigger}
                    onChange={(e) => {
                      const trigger = e.target.value as InteractionTrigger;
                      patch({ trigger, delayMs: trigger === "AFTER_DELAY" ? (it.delayMs ?? 1000) : undefined, key: trigger === "ON_KEY" ? (it.key ?? "ArrowRight") : undefined });
                    }}
                  >
                    {TRIGGERS.map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </Select>
                  <button className="props__add" title="Remove interaction" onClick={() => set(interactions.filter((_, j) => j !== i))}>
                    −
                  </button>
                </div>
                {it.trigger === "AFTER_DELAY" && (
                  <label className="field" title="Milliseconds after the frame appears">
                    <span className="field__label">ms</span>
                    <input className="field__input" type="number" min={0} step={100} aria-label="Delay" value={it.delayMs ?? 1000} onChange={(e) => patch({ delayMs: Math.max(0, Number(e.target.value) || 0) })} />
                  </label>
                )}
                {it.trigger === "ON_KEY" && (
                  <Select className="field__select field__select--wide" aria-label="Key" value={it.key ?? "ArrowRight"} onChange={(e) => patch({ key: e.target.value })}>
                    {KEYS.map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </Select>
                )}
                <Select
                  className="field__select field__select--wide"
                  aria-label="Action"
                  value={it.action.type}
                  onChange={(e) => patch({ action: e.target.value === "BACK" ? { type: "BACK" } : e.target.value === "OPEN_URL" ? { type: "OPEN_URL", url: "https://" } : e.target.value === "CLOSE_OVERLAY" ? { type: "CLOSE_OVERLAY" } : e.target.value === "OPEN_OVERLAY" || e.target.value === "SWAP_OVERLAY" ? { type: e.target.value, targetId: defaultTarget ?? "" } : e.target.value === "SCROLL_TO" ? { type: "SCROLL_TO", targetId: node?.id ?? "" } : navigate() })}
                >
                  <option value="NAVIGATE">Navigate to</option>
                  <option value="BACK">Back</option>
                  <option value="OPEN_OVERLAY">Open overlay</option>
                  <option value="SWAP_OVERLAY">Swap overlay</option>
                  <option value="CLOSE_OVERLAY">Close overlay</option>
                  <option value="SCROLL_TO">Scroll to</option>
                  <option value="OPEN_URL">Open link</option>
                </Select>
                {(it.action.type === "NAVIGATE" || it.action.type === "OPEN_OVERLAY" || it.action.type === "SWAP_OVERLAY") && (
                  <Select
                    className="field__select field__select--wide"
                    aria-label="Destination"
                    value={it.action.targetId}
                    onChange={(e) => patch({ action: { ...it.action, type: it.action.type === "OPEN_OVERLAY" || it.action.type === "SWAP_OVERLAY" ? it.action.type : "NAVIGATE", targetId: e.target.value } as InteractionAction })}
                  >
                    {!frames.some((f) => f.id === (it.action as { targetId: string }).targetId) && <option value={it.action.targetId}>Missing frame</option>}
                    {frames.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </Select>
                )}
                {(it.action.type === "OPEN_OVERLAY" || it.action.type === "SWAP_OVERLAY") && (
                  <>
                    <Select className="field__select field__select--wide" aria-label="Overlay position" value={it.action.position ?? "CENTER"} onChange={(e) => patch({ action: { ...it.action, position: e.target.value as OverlayPosition } as InteractionAction })}>
                      {POSITIONS.map(([v, label]) => (
                        <option key={v} value={v}>
                          Position: {label}
                        </option>
                      ))}
                    </Select>
                    <label className="props__check">
                      <input type="checkbox" aria-label="Close when clicking outside" checked={it.action.closeOnOutside !== false} onChange={(e) => patch({ action: { ...it.action, closeOnOutside: e.target.checked } as InteractionAction })} />
                      Close when clicking outside
                    </label>
                    <label className="props__check">
                      <input type="checkbox" aria-label="Dim the background" checked={it.action.dim !== false} onChange={(e) => patch({ action: { ...it.action, dim: e.target.checked } as InteractionAction })} />
                      Dim the background
                    </label>
                  </>
                )}
                {it.action.type === "SCROLL_TO" && (
                  <Select className="field__select field__select--wide" aria-label="Scroll to layer" value={it.action.targetId} onChange={(e) => patch({ action: { type: "SCROLL_TO", targetId: e.target.value } })}>
                    {[node!, ...doc.descendants(topFrameOf(doc, node!.id)?.id ?? node!.id)].filter((n, i, a) => a.findIndex((m) => m.id === n.id) === i).map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </Select>
                )}
                {it.action.type === "OPEN_URL" && (
                  <label className="field">
                    <span className="field__label">URL</span>
                    <input className="field__input" type="url" aria-label="Link" value={it.action.url} onChange={(e) => patch({ action: { type: "OPEN_URL", url: e.target.value } })} />
                  </label>
                )}
                {(it.action.type === "NAVIGATE" || it.action.type === "BACK") && (
                  <div className="interaction__row">
                    <Select
                      className="field__select"
                      aria-label="Animation"
                      value={it.transition?.type ?? "INSTANT"}
                      onChange={(e) => patch({ transition: e.target.value === "INSTANT" ? undefined : { type: e.target.value as TransitionType, durationMs: it.transition?.durationMs ?? 300 } })}
                    >
                      {TRANSITIONS.map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    {it.transition && it.transition.type !== "INSTANT" && (
                      <Select className="field__select" aria-label="Easing" value={it.transition.easing ?? "EASE_IN_OUT"} onChange={(e) => patch({ transition: { ...it.transition!, easing: e.target.value as Easing } })}>
                        {EASINGS.map(([v, label]) => (
                          <option key={v} value={v}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    )}
                    {it.transition && (
                      <label className="field" title="Duration in milliseconds">
                        <span className="field__label">ms</span>
                        <input
                          className="field__input"
                          type="number"
                          min={50}
                          step={50}
                          aria-label="Duration"
                          value={it.transition.durationMs}
                          onChange={(e) => patch({ transition: { type: it.transition!.type, durationMs: Math.max(50, Number(e.target.value) || 300) } })}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
