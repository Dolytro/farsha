import type { DesignDoc } from "@farsha/design-core";
import type { DevStatus } from "@farsha/types";

export interface DevStatusEntry {
  id: string;
  name: string;
  status: DevStatus;
}

/** Every layer on a page that is marked Ready for dev or Completed, in layer order (outer layers first). */
export function layersWithDevStatus(doc: DesignDoc, pageId: string): DevStatusEntry[] {
  const out: DevStatusEntry[] = [];
  const visit = (parentId: string): void => {
    for (const n of doc.children(parentId)) {
      if (n.devStatus === "READY" || n.devStatus === "COMPLETED") out.push({ id: n.id, name: n.name, status: n.devStatus });
      visit(n.id);
    }
  };
  visit(pageId);
  return out;
}
