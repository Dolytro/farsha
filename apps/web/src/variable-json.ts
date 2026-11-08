import type { DesignDoc } from "@farsha/design-core";
import type { ColorVariable } from "@farsha/types";

export type VariableType = "COLOR" | "STRING" | "NUMBER" | "BOOLEAN";

export interface VariablesFile {
  version: 1;
  modes: string[];
  variables: { name: string; type: VariableType; values: Record<string, string> }[];
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const kindOf = (v: ColorVariable): VariableType => v.kind ?? "COLOR";

/** The variables of a document as a plain object: values are listed by mode name, so another file can read them. */
export function exportVariables(doc: DesignDoc): VariablesFile {
  const modes = doc.modes();
  // the file holds one set of modes, so only the first collection is exported
  const all: ColorVariable[] = [...doc.colorVariables(), ...doc.textVariables(), ...doc.valueVariables("NUMBER"), ...doc.valueVariables("BOOLEAN")].filter((v) => !v.collectionId);
  return {
    version: 1,
    modes: modes.map((m) => m.name),
    variables: all.map((v) => ({ name: v.name, type: kindOf(v), values: Object.fromEntries(modes.map((m) => [m.name, doc.resolveVariableValue(v, m.id)])) })),
  };
}

/** Check a JSON text from outside (it may be damaged or hostile). Keeps only valid variables; throws a readable message for a file that is not a variables file. */
export function parseVariables(text: string): VariablesFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON");
  }
  const obj = raw as { modes?: unknown; variables?: unknown };
  if (!obj || typeof obj !== "object" || !Array.isArray(obj.modes) || !Array.isArray(obj.variables)) throw new Error("That file is not a Farsha variables file");
  const modes = [...new Set(obj.modes.filter((m): m is string => typeof m === "string" && m.trim() !== "").map((m) => m.trim().slice(0, 60)))].slice(0, 20);
  if (!modes.length) throw new Error("The file has no modes");
  const variables: VariablesFile["variables"] = [];
  for (const item of obj.variables.slice(0, 2000)) {
    const v = item as { name?: unknown; type?: unknown; values?: unknown };
    if (typeof v?.name !== "string" || !v.name.trim() || !["COLOR", "STRING", "NUMBER", "BOOLEAN"].includes(v.type as string)) continue;
    const type = v.type as VariableType;
    const given = v.values && typeof v.values === "object" ? (v.values as Record<string, unknown>) : {};
    const values: Record<string, string> = {};
    for (const m of modes) {
      const x = given[m];
      if (type === "COLOR") values[m] = typeof x === "string" && HEX.test(x) ? x.toLowerCase() : "#000000";
      else if (type === "NUMBER") values[m] = typeof x === "string" && x.trim() !== "" && Number.isFinite(Number(x)) ? String(Number(x)) : "0";
      else if (type === "BOOLEAN") values[m] = x === "true" ? "true" : "false";
      else values[m] = typeof x === "string" ? x.slice(0, 2000) : "";
    }
    variables.push({ name: v.name.trim().slice(0, 120), type, values });
  }
  return { version: 1, modes, variables };
}

/** Add the variables of a file to the document: modes are matched by name (missing ones are added), variables are added as new ones. Returns how many were added. */
export function importVariables(doc: DesignDoc, file: VariablesFile): number {
  doc.stopCapturing();
  const existing = doc.modes();
  const ids: Record<string, string> = {};
  const hasRealModes = existing.length > 1 || existing[0]!.id !== "default";
  file.modes.forEach((name, i) => {
    const found = existing.find((m) => m.name === name);
    if (found) ids[name] = found.id;
    else if (i === 0 && !hasRealModes) {
      doc.renameMode(existing[0]!.id, name);
      ids[name] = existing[0]!.id;
    } else ids[name] = doc.addMode(name);
  });
  for (const v of file.variables) {
    const first = Object.values(v.values)[0] ?? "";
    const id = v.type === "COLOR" ? doc.createColorVariable(v.name, first) : v.type === "STRING" ? doc.createTextVariable(v.name, first) : doc.createValueVariable(v.type, v.name, first);
    for (const [mode, value] of Object.entries(v.values)) {
      const modeId = ids[mode]!;
      if (v.type === "COLOR") doc.updateColorVariable(id, { modeId, color: value });
      else if (v.type === "STRING") doc.updateTextVariable(id, { modeId, text: value });
      else doc.updateValueVariable(id, { modeId, value });
    }
  }
  doc.stopCapturing();
  return file.variables.length;
}
