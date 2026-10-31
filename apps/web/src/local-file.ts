import { DesignDoc } from "@farsha/design-core";
import { localFileName } from "./file-name";
import { useEditor } from "./store";

const MAX_BYTES = 200 * 1024 * 1024;

/** Download the open document as a .farsha file (the same bytes Drive stores). */
export function saveLocalCopy(): void {
  const { doc, drive } = useEditor.getState();
  const url = URL.createObjectURL(new Blob([doc.encodeState() as BlobPart], { type: "application/octet-stream" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = localFileName(drive.fileName);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  useEditor.getState().showToast("Saved a local copy");
}

/** File > Duplicate: a copy of the open document as a new file that is not linked to Drive. */
export function duplicateFile(): void {
  const { doc, drive, loadDoc, setDrive, showToast } = useEditor.getState();
  const copy = DesignDoc.fromState(doc.encodeState());
  loadDoc(copy);
  setDrive({ fileId: null, fileName: `${drive.fileName} copy`, status: "idle", error: null });
  showToast("Duplicated the file");
}

/** Ask for a .farsha file with a file picker, then open it. */
export function openLocalFilePicker(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".farsha,.canvylo";
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) void openLocalFile(file);
  };
  input.click();
}

/** Open a .farsha file chosen from disk. The result is a separate working copy that is not linked to Drive. */
export async function openLocalFile(file: File): Promise<boolean> {
  const { loadDoc, setDrive, showToast } = useEditor.getState();
  try {
    if (file.size > MAX_BYTES) throw new Error("The file is too large");
    const doc = DesignDoc.fromState(new Uint8Array(await file.arrayBuffer()));
    loadDoc(doc);
    setDrive({ fileId: null, fileName: file.name.replace(/\.(farsha|canvylo)$/i, "") || "Untitled", status: "idle", error: null });
    showToast(`Opened ${file.name}`);
    return true;
  } catch {
    showToast("That isn't a Farsha file");
    return false;
  }
}
