import type { DesignDoc } from "@farsha/design-core";
import type { DesignNode } from "@farsha/types";

export const MAX_SNIPPET = 20000;

/** A snippet as it is stored: text only, no more than 20 000 characters, nothing when it is blank. */
export function cleanSnippet(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const t = text.replace(/\r\n/g, "\n").slice(0, MAX_SNIPPET);
  return t.trim() ? t : null;
}

export interface CodeConnect {
  snippet: string;
  /** The main component the snippet is stored on. */
  mainId: string;
  mainName: string;
  /** True when the selected layer is the main component itself. */
  isMain: boolean;
}

/** The code mapped to a layer: its own snippet when it is a main component, or the snippet of the main component an instance follows. */
export function codeConnectFor(doc: DesignDoc, node: DesignNode): CodeConnect | null {
  const main = node.type === "FRAME" && node.isComponent ? node : node.type === "FRAME" && node.componentId ? doc.getNode(node.componentId) : undefined;
  if (!main) return null;
  const snippet = cleanSnippet(main.codeSnippet);
  return snippet ? { snippet, mainId: main.id, mainName: main.name, isMain: main.id === node.id } : null;
}
