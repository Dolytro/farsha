export interface RetryState {
  /** The last save failed (for example because the network dropped). */
  failed: boolean;
  /** Edits were made while the browser was offline, so no save was tried. */
  pending: boolean;
  signedIn: boolean;
  hasFile: boolean;
  /** A read-only view link. */
  viewer: boolean;
}

/** When the connection comes back: save again if a Drive file is open and the last edits never reached it. */
export function shouldSaveWhenOnline(s: RetryState): boolean {
  return s.signedIn && s.hasFile && !s.viewer && (s.failed || s.pending);
}
