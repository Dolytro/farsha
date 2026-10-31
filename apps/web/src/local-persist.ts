import { DesignDoc } from "@farsha/design-core";
import { debounced } from "./debounce";
import { useEditor } from "./store";

/**
 * The working copy of the open design is kept in this browser (IndexedDB), so a reload never loses work, signed in or not.
 * Google Drive stays the place designs are shared from; this is only the safety net next to it.
 */

const DB = "farsha";
const STORE = "kv";
const KEY = "current";
const SAVE_DELAY_MS = 800;

export interface LocalCopy {
  bytes: Uint8Array;
  fileId: string | null;
  fileName: string;
  savedAt: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function writeLocal(copy: LocalCopy): Promise<void> {
  await run("readwrite", (s) => s.put(copy, KEY));
}

export async function readLocal(): Promise<LocalCopy | undefined> {
  const value = await run<LocalCopy | undefined>("readonly", (s) => s.get(KEY));
  return value && value.bytes instanceof Uint8Array ? value : undefined;
}

/** Generic keyed values in the same database, used for version history. */
export async function readKey<T>(key: string): Promise<T | undefined> {
  return run<T | undefined>("readonly", (s) => s.get(key));
}

export async function writeKey(key: string, value: unknown): Promise<void> {
  await run("readwrite", (s) => s.put(value, key));
}

export async function clearLocal(): Promise<void> {
  await run("readwrite", (s) => s.delete(KEY));
}

/** Put the saved working copy back (before anything else touches the document). Returns true when one was restored. */
export async function restoreLocal(): Promise<boolean> {
  try {
    const saved = await readLocal();
    if (!saved) return false;
    const { loadDoc, setDrive } = useEditor.getState();
    loadDoc(DesignDoc.fromState(saved.bytes));
    setDrive({ fileId: saved.fileId, fileName: saved.fileName, status: saved.fileId ? "saved" : "idle", error: null });
    return true;
  } catch {
    return false; // unreadable copy or no IndexedDB (private window): start from the default canvas
  }
}

/** Save the working copy shortly after every change, and once more when the tab is hidden or closed. */
export function startLocalAutosave(): () => void {
  let lastVersion = useEditor.getState().version;
  let lastDoc = useEditor.getState().doc;
  const save = debounced(() => {
    const { doc, drive, viewer } = useEditor.getState();
    if (viewer) return;
    void writeLocal({ bytes: doc.encodeState(), fileId: drive.fileId, fileName: drive.fileName, savedAt: Date.now() }).catch(() => undefined);
  }, SAVE_DELAY_MS);
  const stop = useEditor.subscribe((s) => {
    // A new document (New file / Open) and every edit are worth saving; plain re-renders are not.
    if (s.version === lastVersion && s.doc === lastDoc) return;
    lastVersion = s.version;
    lastDoc = s.doc;
    save.call();
  });
  const onHide = () => {
    if (document.visibilityState === "hidden") save.flush();
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", save.flush);
  return () => {
    stop();
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", save.flush);
    save.flush();
  };
}
