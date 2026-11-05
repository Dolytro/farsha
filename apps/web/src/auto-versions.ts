import { AUTO_VERSION_MS, autoVersionDue, autoVersionName, type AutoVersionState } from "./auto-version-policy";
import { saveVersion } from "./versions";
import { useEditor } from "./store";

/** The interval, with a hook for testing: set localStorage "farsha.autoVersionMs" to a number of milliseconds. */
function intervalMs(): number {
  try {
    const n = Number(localStorage.getItem("farsha.autoVersionMs"));
    if (Number.isFinite(n) && n >= 500) return n;
  } catch {
    /* storage can be blocked */
  }
  return AUTO_VERSION_MS;
}

/** Save an automatic version of the open file every ten minutes of editing. Returns a function that stops it. */
export function startAutoVersions(): () => void {
  const interval = intervalMs();
  const s = useEditor.getState();
  const state: AutoVersionState = { lastSeenVersion: s.version, lastSavedVersion: s.version, lastSavedAt: Date.now() };
  let doc = s.doc;
  const timer = window.setInterval(() => {
    const cur = useEditor.getState();
    if (cur.viewer) return;
    if (cur.doc !== doc) {
      // another file was opened: start counting again from it
      doc = cur.doc;
      state.lastSavedVersion = cur.version;
      state.lastSavedAt = Date.now();
      return;
    }
    const now = Date.now();
    if (!autoVersionDue(state, cur.version, now, interval)) return;
    state.lastSavedVersion = cur.version;
    state.lastSavedAt = now;
    void saveVersion(autoVersionName(now), { auto: true, silent: true });
  }, Math.min(60_000, Math.max(250, interval / 2)));
  return () => window.clearInterval(timer);
}
