import { useState } from "react";
import { driveConfigured } from "../drive/google";
import { connect } from "../drive/session";
import { useEditor } from "../store";

/** Shown instead of the editor until the user signs in with Google. */
export function LoginScreen({ onSkip }: { onSkip?: () => void }) {
  const error = useEditor((s) => s.drive.error);
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    await connect();
    setBusy(false);
  };

  return (
    <main className="login">
      <div className="login__card">
        <div className="login__logo" aria-hidden="true">
          F
        </div>
        <h1 className="login__title">Farsha</h1>
        <p className="login__tagline">Design, inspect and share. Free and open source.</p>

        {driveConfigured ? (
          <button className="login__button" disabled={busy} onClick={() => void signIn()}>
            {busy ? "Waiting for Google…" : "Continue with Google"}
          </button>
        ) : (
          <>
            <p className="login__note login__note--error">Google sign-in isn't configured for this build.</p>
            {onSkip && (
              <button className="login__button login__button--secondary" onClick={onSkip}>
                Continue without signing in
              </button>
            )}
          </>
        )}

        {error && <p className="login__note login__note--error">{error}</p>}
        <p className="login__note">Your designs are saved to your own Google Drive. Farsha can only see files it creates.</p>
        <p className="login__note">Have a shared link? Open it directly. Viewing needs no sign-in.</p>
      </div>
    </main>
  );
}
