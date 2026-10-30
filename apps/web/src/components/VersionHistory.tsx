import { useEffect, useState } from "react";
import { deleteVersion, listVersions, restoreVersion, saveVersion, type VersionEntry } from "../versions";
import { useEditor } from "../store";

/** Version history: name and save the current state, or restore an earlier one. Versions live in this browser. */
export function VersionHistory() {
  const open = useEditor((s) => s.versionsOpen);
  const setOpen = useEditor((s) => s.setVersionsOpen);
  const [versions, setVersions] = useState<VersionEntry[] | null>(null);
  const [name, setName] = useState("");

  const refresh = () => listVersions().then(setVersions, () => setVersions([]));
  useEffect(() => {
    if (!open) return;
    setName("");
    setVersions(null);
    void refresh();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <div className="dialog" onPointerDown={() => setOpen(false)}>
      <div className="dialog__box" role="dialog" aria-label="Version history" onPointerDown={(e) => e.stopPropagation()}>
        <div className="dialog__head">
          <strong>Version history</strong>
          <button className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        <form
          className="dialog__form"
          onSubmit={(e) => {
            e.preventDefault();
            void saveVersion(name).then(() => {
              setName("");
              return refresh();
            });
          }}
        >
          <input className="dialog__input" placeholder="Name this version (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="props__button props__button--primary dialog__save" type="submit">
            Save version
          </button>
        </form>
        <ul className="dialog__list">
          {versions === null && <li className="dialog__note">Loading…</li>}
          {versions?.length === 0 && <li className="dialog__note">No versions yet. Save one to be able to come back to this state.</li>}
          {versions?.map((v) => (
            <li className="dialog__row" key={v.id}>
              <div className="dialog__main">
                <span className="dialog__name">{v.name}</span>
                <span className="dialog__meta">{new Date(v.savedAt).toLocaleString()}</span>
              </div>
              <button
                className="seg__btn"
                onClick={() =>
                  void restoreVersion(v).then((ok) => {
                    if (ok) setOpen(false);
                  })
                }
              >
                Restore
              </button>
              <button className="props__add" title="Delete version" onClick={() => void deleteVersion(v.id).then(refresh)}>
                −
              </button>
            </li>
          ))}
        </ul>
        <p className="dialog__note">Versions are kept in this browser only (the newest 30).</p>
      </div>
    </div>
  );
}
