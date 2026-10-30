import { useEffect, useState } from "react";
import { isLinkShared, setLinkShared } from "../drive/drive";
import { connect, save } from "../drive/session";
import { getToken } from "../drive/google";
import { shareUrl, type ViewerMode } from "../route";
import { useEditor } from "../store";
import { Select } from "./Select";

export function ShareDialog() {
  const { shareOpen, setShareOpen, drive } = useEditor();
  const [shared, setShared] = useState<boolean | null>(null);
  const [mode, setMode] = useState<ViewerMode>("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileId = drive.fileId;

  useEffect(() => {
    if (!shareOpen || !fileId) return;
    const t = getToken();
    if (!t) return;
    setError(null);
    isLinkShared(t, fileId).then(setShared, (e: Error) => setError(e.message));
  }, [shareOpen, fileId]);

  if (!shareOpen) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (on: boolean) =>
    run(async () => {
      const t = getToken();
      if (!t || !fileId) throw new Error("Sign in again to change sharing");
      await setLinkShared(t, fileId, on);
      setShared(on);
    });

  const url = fileId ? shareUrl(window.location.origin, fileId, mode) : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setError("Couldn't copy. Select the link and copy it manually.");
    }
  };

  return (
    <div className="modal" role="dialog" aria-label="Share" onPointerDown={() => setShareOpen(false)}>
      <div className="modal__card" onPointerDown={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <strong>Share "{drive.fileName}"</strong>
          <button className="icon-btn" aria-label="Close" onClick={() => setShareOpen(false)}>
            ✕
          </button>
        </header>

        {!drive.user ? (
          <div className="modal__body">
            <p>Sign in with Google to save your design to your Drive and share a link.</p>
            <button className="drive__item drive__item--primary" onClick={() => void connect()}>
              Sign in with Google
            </button>
          </div>
        ) : !fileId ? (
          <div className="modal__body">
            <p>Save this design to Google Drive first, then you can create a link.</p>
            <button className="drive__item drive__item--primary" disabled={busy} onClick={() => void run(() => save())}>
              Save to Drive
            </button>
          </div>
        ) : (
          <div className="modal__body">
            <label className="modal__row">
              <input type="checkbox" checked={shared ?? false} disabled={busy || shared === null} onChange={(e) => void toggle(e.target.checked)} />
              <span>Anyone with the link can view</span>
            </label>
            {shared && (
              <>
                <div className="modal__row">
                  <span className="modal__label">Link opens in</span>
                  <Select className="modal__select" value={mode} onChange={(e) => setMode(e.target.value as ViewerMode)}>
                    <option value="view">View only (public)</option>
                    <option value="inspect">Inspect (Google sign-in required)</option>
                  </Select>
                </div>
                <div className="modal__row">
                  <input className="modal__link" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
                  <button className="dev__copy" onClick={() => void copy()}>
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </div>
                <p className="modal__hint">
                  Anyone with the link can view this design without signing in. Inspect links show measurements and code only after the visitor signs in with Google. Nobody can change your file. They see your latest save. Turn the checkbox off to stop sharing.
                </p>
              </>
            )}
          </div>
        )}
        {error && <p className="modal__error">{error}</p>}
      </div>
    </div>
  );
}
