export interface VersionEntry {
  id: string;
  name: string;
  savedAt: number;
  bytes: Uint8Array;
}

export const MAX_VERSIONS = 30;

const stamp = (t: number) =>
  new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** Add a version (newest first) and drop the oldest ones beyond MAX_VERSIONS. An empty name becomes the date. */
export function addVersionTo(list: VersionEntry[], v: { name: string; bytes: Uint8Array; now: number }): VersionEntry[] {
  const entry: VersionEntry = { id: `${v.now}-${list.length}`, name: v.name.trim() || stamp(v.now), savedAt: v.now, bytes: v.bytes };
  return [entry, ...list].sort((a, b) => b.savedAt - a.savedAt).slice(0, MAX_VERSIONS);
}
