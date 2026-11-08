/** A file picked or dropped that looks like a Farsha document (by its extension). */
export function isFarshaFileName(name: string): boolean {
  return /\.farsha$/i.test(name.trim());
}

/** While dragging, browsers hide names; a Farsha file shows up with no type or a generic binary one. */
export function maybeFarshaDragItem(item: { kind: string; type: string }): boolean {
  return item.kind === "file" && (item.type === "" || item.type === "application/octet-stream");
}
