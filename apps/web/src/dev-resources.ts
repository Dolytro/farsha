import type { DevResource } from "@farsha/types";
import { safeUrl } from "./prototype";

export const MAX_DEV_RESOURCES = 20;

/** Resources as they are stored or shown: web links only (a shared file is untrusted), a short name, at most 20. */
export function cleanResources(list: unknown): DevResource[] {
  if (!Array.isArray(list)) return [];
  const out: DevResource[] = [];
  for (const r of list) {
    if (!r || typeof r !== "object") continue;
    const url = typeof (r as DevResource).url === "string" ? safeUrl((r as DevResource).url) : null;
    if (!url) continue;
    const name = String((r as DevResource).name ?? "").trim().slice(0, 80) || new URL(url).hostname;
    out.push({ name, url });
    if (out.length >= MAX_DEV_RESOURCES) break;
  }
  return out;
}

/** Adds a link to a layer's resources. Returns null when the address is not an http(s) link or the list is full. A link already there is not added twice. */
export function addResource(list: DevResource[] | undefined, name: string, url: string): DevResource[] | null {
  const current = cleanResources(list);
  const safe = safeUrl(url);
  if (!safe || current.length >= MAX_DEV_RESOURCES) return null;
  if (current.some((r) => r.url === safe)) return current;
  return [...current, ...cleanResources([{ name, url: safe }])];
}
