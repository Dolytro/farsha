import { DesignDoc } from "@farsha/design-core";
import { readKey, writeKey } from "./local-persist";
import { useEditor } from "./store";
import { addVersionTo, type VersionEntry } from "./version-list";

export type { VersionEntry };

/** Versions belong to the open file: its Drive id, or one shared slot for a file that was never saved to Drive. */
const keyFor = () => `versions:${useEditor.getState().drive.fileId ?? "local"}`;

export async function listVersions(): Promise<VersionEntry[]> {
  const list = await readKey<VersionEntry[]>(keyFor());
  return Array.isArray(list) ? list.filter((v) => v.bytes instanceof Uint8Array) : [];
}

/** Save the open document as a version; an empty name gets the date. Returns false when it could not be stored. */
export async function saveVersion(name: string, opts: { auto?: boolean; silent?: boolean } = {}): Promise<boolean> {
  const { doc, showToast } = useEditor.getState();
  try {
    const list = await listVersions();
    await writeKey(keyFor(), addVersionTo(list, { name, bytes: doc.encodeState(), now: Date.now(), auto: opts.auto }));
    if (!opts.silent) showToast("Saved to version history");
    return true;
  } catch {
    showToast("Couldn't save a version in this browser");
    return false;
  }
}

export async function deleteVersion(id: string): Promise<void> {
  const list = await listVersions();
  await writeKey(
    keyFor(),
    list.filter((v) => v.id !== id),
  );
}

/** Open a saved version. The current state is saved first so a restore can itself be undone by restoring that. */
export async function restoreVersion(version: VersionEntry): Promise<boolean> {
  const { doc, loadDoc, showToast } = useEditor.getState();
  try {
    const restored = DesignDoc.fromState(version.bytes);
    const list = await listVersions();
    await writeKey(keyFor(), addVersionTo(list, { name: `Before restoring "${version.name}"`, bytes: doc.encodeState(), now: Date.now() }));
    loadDoc(restored);
    showToast(`Restored "${version.name}"`);
    return true;
  } catch {
    showToast("Couldn't restore that version");
    return false;
  }
}
