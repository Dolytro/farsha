import { DesignDoc } from "@farsha/design-core";
import { useEditor } from "../store";
import { createFile, downloadFile, DriveError, getUser, renameFile, updateFile, type DriveFile } from "./drive";
import { getToken, signIn, signOut } from "./google";

const AUTOSAVE_MS = 2000;

const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

/** Use the current token, or ask the user to sign in again (needs a click). */
async function token(interactive: boolean): Promise<string | null> {
  return getToken() ?? (interactive ? signIn() : null);
}

export async function connect(): Promise<void> {
  const { setDrive } = useEditor.getState();
  try {
    const t = await signIn();
    setDrive({ user: await getUser(t), status: "idle", error: null });
  } catch (e) {
    setDrive({ error: message(e) });
  }
}

export function disconnect(): void {
  signOut();
  useEditor.getState().setDrive({ user: null, status: "idle", error: null });
}

/** Restore the signed-in user after a page reload while the token is still valid. */
export async function restoreSession(): Promise<void> {
  const { setDrive } = useEditor.getState();
  const t = getToken();
  if (!t) {
    setDrive({ checked: true });
    return;
  }
  try {
    setDrive({ user: await getUser(t), checked: true });
  } catch {
    signOut();
    setDrive({ checked: true });
  }
}

/** Rename the open file; a Drive file is renamed on Drive too (when signed in). */
export async function renameCurrentFile(name: string): Promise<void> {
  const { drive, setDrive } = useEditor.getState();
  const next = name.replace(/\.(farsha|canvylo)$/i, "").trim();
  if (!next || next === drive.fileName) return;
  setDrive({ fileName: next });
  const t = getToken();
  if (!drive.fileId || !t) return;
  try {
    await renameFile(t, drive.fileId, `${next}.farsha`);
  } catch (e) {
    setDrive({ error: message(e) });
  }
}

/** Save the current document; creates the Drive file on first save. */
export async function save(interactive = true): Promise<DriveFile | null> {
  const { doc, drive, setDrive } = useEditor.getState();
  try {
    const t = await token(interactive);
    if (!t) {
      setDrive({ status: "needs-auth" });
      return null;
    }
    setDrive({ status: "saving", error: null });
    const bytes = doc.encodeState();
    const file = drive.fileId ? await updateFile(t, drive.fileId, bytes) : await createFile(t, `${drive.fileName}.farsha`, bytes);
    setDrive({ fileId: file.id, fileName: file.name.replace(/\.(farsha|canvylo)$/, ""), status: "saved" });
    return file;
  } catch (e) {
    setDrive({ status: e instanceof DriveError && e.status === 401 ? "needs-auth" : "error", error: message(e) });
    return null;
  }
}

export async function openFile(id: string, name: string): Promise<void> {
  const { loadDoc, setDrive } = useEditor.getState();
  try {
    const t = await token(true);
    const doc = DesignDoc.fromState(await downloadFile(id, t));
    loadDoc(doc);
    setDrive({ fileId: id, fileName: name.replace(/\.(farsha|canvylo)$/, ""), status: "saved", error: null });
  } catch (e) {
    setDrive({ error: message(e) });
  }
}

export function newFile(): void {
  const { loadDoc, setDrive } = useEditor.getState();
  loadDoc(new DesignDoc());
  setDrive({ fileId: null, fileName: "Untitled", status: "idle", error: null });
}

/** Load a link-shared file for the read-only viewer. Works without signing in (API key). */
export async function loadShared(fileId: string): Promise<void> {
  const { loadDoc, setLoad } = useEditor.getState();
  try {
    // Link-shared files are public: read them with the API key. A drive.file token can only
    // read files this app created, so it is just a fallback for the owner's own unshared files.
    let bytes: Uint8Array;
    try {
      bytes = await downloadFile(fileId, null);
    } catch (e) {
      const token = getToken();
      if (!token || !(e instanceof DriveError) || (e.status !== 403 && e.status !== 404)) throw e;
      bytes = await downloadFile(fileId, token);
    }
    loadDoc(DesignDoc.fromState(bytes));
    setLoad("ready");
  } catch (e) {
    const notFound = e instanceof DriveError && (e.status === 403 || e.status === 404);
    setLoad("error", notFound ? "This file doesn't exist or isn't shared with a link." : message(e));
  }
}

/** Debounced autosave while signed in and the file already exists in Drive. */
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastVersion = useEditor.getState().version;
  const stop = useEditor.subscribe((s) => {
    if (s.version === lastVersion) return;
    lastVersion = s.version;
    if (!s.drive.user || !s.drive.fileId || s.viewer) return;
    clearTimeout(timer);
    timer = setTimeout(() => void save(false), AUTOSAVE_MS);
  });
  return () => {
    stop();
    clearTimeout(timer);
  };
}
