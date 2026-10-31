import type { Interaction, InteractionAction, InteractionTrigger, TransitionType } from "@canvylo/types";
import { prototypeFrames, startFrame } from "../prototype";
import { useEditor } from "../store";
import { Select } from "./Select";

const TRIGGERS: [InteractionTrigger, string][] = [
  ["ON_CLICK", "On click"],
  ["ON_HOVER", "While hovering"],
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
  useEditor((s) => s.version);
  const node = selection.length === 1 ? doc.getNode(selection[0]!) : undefined;
  const frames = prototypeFrames(doc);

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
      </section>
      {node && frames.some((f) => f.id === node.id) && (
        <section className="props__section">
          <label className="props__check">
            <input type="checkbox" aria-label="Flow starting point" checked={!!node.flowStart} onChange={(e) => doc.setStyle(node.id, { flowStart: e.target.checked ? true : null })} />
            Flow starting point
          </label>
          <label className="props__check">
            <input type="checkbox" aria-label="Vertical scrolling" checked={node.type === "FRAME" && node.overflowScroll === "VERTICAL"} onChange={(e) => doc.setStyle(node.id, { overflowScroll: e.target.checked ? "VERTICAL" : null })} />
            Vertical scrolling
          </label>
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
                  onChange={(e) => patch({ action: e.target.value === "BACK" ? { type: "BACK" } : e.target.value === "OPEN_URL" ? { type: "OPEN_URL", url: "https://" } : e.target.value === "CLOSE_OVERLAY" ? { type: "CLOSE_OVERLAY" } : e.target.value === "OPEN_OVERLAY" ? { type: "OPEN_OVERLAY", targetId: defaultTarget ?? "" } : navigate() })}
                >
                  <option value="NAVIGATE">Navigate to</option>
                  <option value="BACK">Back</option>
                  <option value="OPEN_OVERLAY">Open overlay</option>
                  <option value="CLOSE_OVERLAY">Close overlay</option>
                  <option value="OPEN_URL">Open link</option>
                </Select>
                {(it.action.type === "NAVIGATE" || it.action.type === "OPEN_OVERLAY") && (
                  <Select
                    className="field__select field__select--wide"
                    aria-label="Destination"
                    value={it.action.targetId}
                    onChange={(e) => patch({ action: { type: it.action.type === "OPEN_OVERLAY" ? "OPEN_OVERLAY" : "NAVIGATE", targetId: e.target.value } })}
                  >
                    {!frames.some((f) => f.id === (it.action as { targetId: string }).targetId) && <option value={it.action.targetId}>Missing frame</option>}
                    {frames.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
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
