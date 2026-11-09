/**
 * Figma's "Rename layers": the new name is a pattern. `$&` is the current layer name, `$n` counts up from the start
 * number (the layer's place in the selection), `$0`, `$00` ... count with leading zeros, `$p` is the parent's name.
 * Find and replace works on the names as they are.
 */
export interface RenameInput {
  name: string;
  parent?: string;
}

export interface RenameOptions {
  pattern: string;
  start?: number;
  find?: string;
  replace?: string;
  caseSensitive?: boolean;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Number written with at least `width` digits, padded with zeros. */
function padded(n: number, width: number): string {
  const sign = n < 0 ? "-" : "";
  return sign + String(Math.abs(n)).padStart(width, "0");
}

/** The new name of the layer at `index` of the selection. */
export function renamedLayer(input: RenameInput, index: number, o: RenameOptions): string {
  let name = input.name;
  if (o.find) name = name.replace(new RegExp(escape(o.find), o.caseSensitive ? "g" : "gi"), () => o.replace ?? "");
  const pattern = o.pattern;
  if (!pattern.trim()) return name;
  const start = Number.isFinite(o.start) ? (o.start as number) : 1;
  const out = pattern.replace(/\$(&|p|n|0+)/g, (_m, token: string) => {
    if (token === "&") return name;
    if (token === "p") return input.parent ?? "";
    if (token === "n") return String(start + index);
    return padded(start + index, token.length + 1);
  });
  return out.trim() || name;
}

/** New names for every layer in selection order; unchanged names are kept as they are. */
export function renameLayers(inputs: RenameInput[], o: RenameOptions): string[] {
  return inputs.map((input, i) => renamedLayer(input, i, o));
}
