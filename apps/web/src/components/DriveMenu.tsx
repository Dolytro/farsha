import { useEffect, useState } from "react";
import { driveConfigured, getToken } from "../drive/google";
import { listFiles, type DriveFile } from "../drive/drive";
import { connect, disconnect, newFile, openFile, save } from "../drive/session";
import { useEditor, type SaveStatus } from "../store";

const STATUS: Record<SaveStatus, string> = {
  idle: "Not saved",
  saving: "Saving…",
  saved: "Saved to Drive",
  error: "Save failed",
  "needs-auth": "Session expired",
};

export function DriveMenu() {
  const { drive } = useEditor();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<DriveFile[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !drive.user) return;
    const t = getToken();
    if (!t) return;
    setListError(null);
    listFiles(t).then(setFiles, (e: Error) => setListError(e.message));
  }, [open, drive.user]);

  return (
    <div className="drive">
      <button className="icon-btn" title="File (Google Drive)" aria-expanded={open} onClick={() => setOpen(!open)}>
        ☁
      </button>
      {open && (
        <div className="drive__menu" role="menu">
          {!driveConfigured ? (
            <p className="drive__note">Google Drive isn't configured. Set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY.</p>
          ) : !drive.user ? (
            <button className="drive__item drive__item--primary" onClick={() => void connect()}>
              Sign in with Google
            </button>
          ) : (
            <>
              <div className="drive__user">
                {drive.user.photo && <img className="drive__avatar" src={drive.user.photo} alt="" referrerPolicy="no-referrer" />}
                <div>
                  <div className="drive__name">{drive.user.name}</div>
                  <div className="drive__email">{drive.user.email}</div>
                </div>
              </div>
              <div className={`drive__status drive__status--${drive.status}`}>
                {drive.fileId ? `${drive.fileName} · ` : ""}
                {STATUS[drive.status]}
              </div>
              {drive.status === "needs-auth" ? (
                <button className="drive__item drive__item--primary" onClick={() => void connect().then(() => save())}>
                  Reconnect
                </button>
              ) : (
                <button className="drive__item" onClick={() => void save()}>
                  {drive.fileId ? "Save now" : "Save to Drive"}
                </button>
              )}
              <button className="drive__item" onClick={newFile}>
                New file
              </button>
              <div className="drive__heading">Open from Drive</div>
              <div className="drive__files">
                {listError && <p className="drive__note">{listError}</p>}
                {!listError && files === null && <p className="drive__note">Loading…</p>}
                {files?.length === 0 && <p className="drive__note">No Canvylo files yet.</p>}
                {files?.map((f) => (
                  <button
                    key={f.id}
                    className="drive__item"
                    onClick={() => {
                      setOpen(false);
                      void openFile(f.id, f.name);
                    }}
                  >
                    {f.name.replace(/\.canvylo$/, "")}
                  </button>
                ))}
              </div>
              <button className="drive__item drive__item--muted" onClick={disconnect}>
                Sign out
              </button>
            </>
          )}
          {drive.error && <p className="drive__note drive__note--error">{drive.error}</p>}
        </div>
      )}
    </div>
  );
}
