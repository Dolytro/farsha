import { DesignDoc } from "@canvylo/design-core";
import { localFileName } from "./file-name";
import { useEditor } from "./store";

const MAX_BYTES = 200 * 1024 * 1024;

/** Download the open document as a .canvylo file (the same bytes Drive stores). */
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

/** Open a .canvylo file chosen from disk. The result is a separate working copy that is not linked to Drive. */
export async function openLocalFile(file: File): Promise<boolean> {
  const { loadDoc, setDrive, showToast } = useEditor.getState();
  try {
    if (file.size > MAX_BYTES) throw new Error("The file is too large");
    const doc = DesignDoc.fromState(new Uint8Array(await file.arrayBuffer()));
    loadDoc(doc);
    setDrive({ fileId: null, fileName: file.name.replace(/\.canvylo$/i, "") || "Untitled", status: "idle", error: null });
    showToast(`Opened ${file.name}`);
    return true;
  } catch {
    showToast("That isn't a Canvylo file");
    return false;
  }
}
