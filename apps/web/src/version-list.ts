export interface VersionEntry {
  id: string;
  name: string;
  savedAt: number;
  bytes: Uint8Array;
  /** Saved by the editor on its own, not by the person. Only the newest MAX_AUTO_VERSIONS are kept. */
  auto?: boolean;
  /** Notes about this version (Figma's version description). */
  description?: string;
}

export const MAX_VERSIONS = 30;
export const MAX_AUTO_VERSIONS = 10;

const stamp = (t: number) =>
  new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** Add a version (newest first) and drop the oldest ones beyond MAX_VERSIONS. An empty name becomes the date. */
export function addVersionTo(list: VersionEntry[], v: { name: string; bytes: Uint8Array; now: number; auto?: boolean; description?: string }): VersionEntry[] {
  const entry: VersionEntry = { id: `${v.now}-${list.length}`, name: v.name.trim() || stamp(v.now), savedAt: v.now, bytes: v.bytes, ...(v.auto ? { auto: true } : {}), ...(v.description?.trim() ? { description: v.description.trim().slice(0, 500) } : {}) };
  const sorted = [entry, ...list].sort((a, b) => b.savedAt - a.savedAt);
  // automatic versions never push named ones out: they have their own, smaller limit
  let autos = 0;
  return sorted.filter((e) => !e.auto || ++autos <= MAX_AUTO_VERSIONS).slice(0, MAX_VERSIONS);
}
