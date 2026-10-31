import type { DesignDoc } from "@canvylo/design-core";
import type { DesignNode, Paint } from "@canvylo/types";

export interface VariableUse {
  id: string;
  name: string;
  /** CSS custom property name, e.g. "--brand-primary". */
  cssName: string;
  /** Colour per mode, listed in the document's mode order. */
  values: { mode: string; color: string }[];
  role: "Fill" | "Stroke";
}

/** "Brand / Primary Blue" becomes "--brand-primary-blue": a valid custom property name made of letters, digits and dashes. */
export function cssVariableName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[^\w\s/-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s/_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `--${slug || "color"}`;
}

/** The colour variables bound to the fills and strokes of a layer (each variable once per role). */
export function variablesUsed(doc: DesignDoc, node: DesignNode): VariableUse[] {
  const any = node as unknown as { fills?: Paint[]; strokes?: Paint[] };
  const modes = doc.modes();
  const out: VariableUse[] = [];
  for (const [role, paints] of [["Fill", any.fills], ["Stroke", any.strokes]] as const) {
    for (const p of paints ?? []) {
      if (p.type !== "SOLID" || !p.variableId) continue;
      const v = doc.getColorVariable(p.variableId);
      if (!v || out.some((o) => o.id === v.id && o.role === role)) continue;
      out.push({ id: v.id, name: v.name, cssName: cssVariableName(v.name), role, values: modes.map((m) => ({ mode: m.name, color: v.values[m.id] ?? "" })) });
    }
  }
  return out;
}

/** `:root { --brand: #123456; }` with the value of the first mode (further modes as comments). */
export function cssVariableBlock(uses: VariableUse[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const u of uses) {
    if (seen.has(u.cssName)) continue;
    seen.add(u.cssName);
    const [first, ...rest] = u.values;
    lines.push(`  ${u.cssName}: ${first?.color ?? "#000000"};${rest.length ? ` /* ${rest.map((r) => `${r.mode}: ${r.color}`).join(", ")} */` : ""}`);
  }
  return lines.length ? `:root {\n${lines.join("\n")}\n}` : "";
}
