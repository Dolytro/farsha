import { useEffect, useMemo, useState } from "react";
import { renameLayers } from "../batch-rename";
import { useEditor } from "../store";

/** Figma's "Rename layers" for several selected layers: a name pattern ($&, $n, $0, $p) and find and replace, with a live preview. */
export function BatchRenameDialog() {
  const open = useEditor((s) => s.batchRenameOpen);
  const setOpen = useEditor((s) => s.setBatchRenameOpen);
  const { doc, selection } = useEditor();
  const [pattern, setPattern] = useState("$&");
  const [start, setStart] = useState("1");
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");

  useEffect(() => {
    if (!open) return;
    setPattern("$&");
    setStart("1");
    setFind("");
    setReplace("");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, setOpen]);

  const layers = useMemo(
    () => (open ? selection.map((id) => doc.getNode(id)).filter((n): n is NonNullable<typeof n> => !!n).map((n) => ({ id: n.id, name: n.name, parent: n.parentId ? doc.getNode(n.parentId)?.name : undefined })) : []),
    [open, selection, doc],
  );
  const names = useMemo(() => renameLayers(layers, { pattern, start: Number(start), find, replace }), [layers, pattern, start, find, replace]);

  if (!open) return null;
  const apply = () => {
    doc.stopCapturing();
    layers.forEach((l, i) => {
      if (names[i] && names[i] !== l.name) doc.rename(l.id, names[i]!);
    });
    doc.stopCapturing();
    setOpen(false);
  };
  const field = (label: string, value: string, set: (v: string) => void, hint?: string) => (
    <label className="dialog__row" style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: 8, alignItems: "center", margin: "6px 0" }}>
      <span>{label}</span>
      <input className="dialog__input" aria-label={label} value={value} placeholder={hint} onChange={(e) => set(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") apply(); }} />
    </label>
  );
  return (
    <div className="dialog" onPointerDown={() => setOpen(false)}>
      <div className="dialog__box" role="dialog" aria-label="Rename layers" onPointerDown={(e) => e.stopPropagation()}>
        <div className="dialog__head">
          <strong>Rename {layers.length} layers</strong>
          <button className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>✕</button>
        </div>
        {field("New name", pattern, setPattern, "$&")}
        {field("Start at", start, setStart)}
        {field("Find", find, setFind)}
        {field("Replace with", replace, setReplace)}
        <p className="dialog__note">$& is the current name, $n counts from the start number, $00 pads with zeros, $p is the parent's name.</p>
        <ul className="batch-rename__preview" aria-label="Preview" style={{ maxHeight: 160, overflow: "auto", margin: "8px 0", paddingLeft: 18, fontSize: 12 }}>
          {layers.slice(0, 50).map((l, i) => (
            <li key={l.id}>{l.name} → <strong>{names[i]}</strong></li>
          ))}
          {layers.length > 50 && <li>…and {layers.length - 50} more</li>}
        </ul>
        <button className="props__button props__button--primary dialog__save" onClick={apply}>Rename</button>
      </div>
    </div>
  );
}
