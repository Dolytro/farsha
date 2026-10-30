import type { Interaction } from "@canvylo/types";
import { prototypeFrames, startFrame } from "../prototype";
import { useEditor } from "../store";

/** The Prototype tab: interactions of the selected layer, and the Present button. */
export function PrototypePanel() {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const setPresenting = useEditor((s) => s.setPresenting);
  const showToast = useEditor((s) => s.showToast);
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

  return (
    <>
      <section className="props__section">
        <button className="props__button props__button--primary" onClick={present} title="Present (Ctrl+Alt+Enter)">
          ▶ Present
        </button>
      </section>
      {!node || node.type === "PAGE" ? (
        <p className="props__empty">Select a layer to link it to a frame.</p>
      ) : (
        <section className="props__section">
          <h3 className="props__heading props__heading--row">
            Interactions
            <button
              className="props__add"
              title="Add interaction"
              disabled={!defaultTarget}
              onClick={() => defaultTarget && set([...interactions, { trigger: "ON_CLICK", action: { type: "NAVIGATE", targetId: defaultTarget } }])}
            >
              +
            </button>
          </h3>
          {interactions.length === 0 && <p className="props__hint">{frames.length < 2 ? "Create at least two frames to link them." : "On click, navigate to a frame."}</p>}
          {interactions.map((it, i) => {
            const replace = (next: Interaction) => set(interactions.map((x, j) => (j === i ? next : x)));
            return (
              <div className="interaction" key={i}>
                <span className="interaction__trigger">On click</span>
                <div className="interaction__row">
                  <select
                    className="field__select"
                    aria-label="Action"
                    value={it.action.type}
                    onChange={(e) => replace({ trigger: "ON_CLICK", action: e.target.value === "BACK" ? { type: "BACK" } : { type: "NAVIGATE", targetId: defaultTarget ?? "" } })}
                  >
                    <option value="NAVIGATE">Navigate to</option>
                    <option value="BACK">Back</option>
                  </select>
                  <button className="props__add" title="Remove interaction" onClick={() => set(interactions.filter((_, j) => j !== i))}>
                    −
                  </button>
                </div>
                {it.action.type === "NAVIGATE" && (
                  <select
                    className="field__select field__select--wide"
                    aria-label="Destination"
                    value={it.action.targetId}
                    onChange={(e) => replace({ trigger: "ON_CLICK", action: { type: "NAVIGATE", targetId: e.target.value } })}
                  >
                    {!frames.some((f) => f.id === (it.action as { targetId: string }).targetId) && <option value={it.action.targetId}>Missing frame</option>}
                    {frames.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
