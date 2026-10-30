/** "My file" -> "My file.canvylo", with characters that are not allowed in file names replaced. */
export function localFileName(name: string): string {
  const base = name.replace(/\.canvylo$/i, "").replace(/[\/:*?"<>|\u0000-\u001f]+/g, "_").trim() || "Untitled";
  return `${base}.canvylo`;
}
