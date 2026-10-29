import { create } from "zustand";
import { DesignDoc } from "@canvylo/design-core";
import type { Viewport } from "@canvylo/canvas-engine";
import type { DriveUser } from "./drive/drive";
import { parseRoute, type ViewerMode } from "./route";
import { seedThemeForest } from "./seed/themeforest";

export type Tool = "select" | "hand" | "frame" | "rect" | "ellipse" | "text";
export type SaveStatus = "idle" | "saving" | "saved" | "error" | "needs-auth";
export type LoadState = "ready" | "loading" | "error";

const route = parseRoute(window.location.pathname, window.location.search);
const viewer: ViewerMode | null = route.kind === "viewer" ? route.mode : null;

/** The editor starts with sample screens; a shared link starts empty until the file loads. */
function initialDoc(): DesignDoc {
  const doc = new DesignDoc();
  if (!viewer) {
    seedThemeForest(doc, doc.pages()[0]!.id);
    doc.clearHistory();
  }
  return doc;
}

const firstDoc = initialDoc();

interface DriveState {
  user: DriveUser | null;
  fileId: string | null;
  fileName: string;
  status: SaveStatus;
  error: string | null;
}

interface EditorState {
  doc: DesignDoc;
  pageId: string;
  /** Bumped whenever the Yjs document changes, to re-render consumers. */
  version: number;
  tool: Tool;
  /** Developer handoff mode: inspect and copy code, never modifies the design. */
  devMode: boolean;
  /** Set when opened from a share link: the design is read-only. */
  viewer: ViewerMode | null;
  loadState: LoadState;
  loadError: string | null;
  selection: string[];
  viewport: Viewport;
  drive: DriveState;
  shareOpen: boolean;
  setDevMode: (on: boolean) => void;
  setTool: (t: Tool) => void;
  select: (ids: string[]) => void;
  setViewport: (v: Viewport) => void;
  setShareOpen: (open: boolean) => void;
  setDrive: (patch: Partial<DriveState>) => void;
  setLoad: (state: LoadState, error?: string | null) => void;
  /** Replace the open document (Open from Drive, shared link, New). */
  loadDoc: (doc: DesignDoc) => void;
}

let unsubscribe: (() => void) | null = null;

export const useEditor = create<EditorState>((set) => ({
  doc: firstDoc,
  pageId: firstDoc.pages()[0]!.id,
  version: 0,
  tool: "select",
  devMode: viewer !== null,
  viewer,
  loadState: viewer ? "loading" : "ready",
  loadError: null,
  selection: [],
  viewport: { x: 40, y: 80, zoom: 0.28 },
  drive: { user: null, fileId: null, fileName: "Untitled", status: "idle", error: null },
  shareOpen: false,
  setDevMode: (devMode) => set((s) => (s.viewer ? s : { devMode, tool: "select" })),
  setTool: (tool) => set({ tool }),
  select: (selection) => set({ selection }),
  setViewport: (viewport) => set({ viewport }),
  setShareOpen: (shareOpen) => set({ shareOpen }),
  setDrive: (patch) => set((s) => ({ drive: { ...s.drive, ...patch } })),
  setLoad: (loadState, loadError = null) => set({ loadState, loadError }),
  loadDoc: (doc) => {
    unsubscribe?.();
    unsubscribe = doc.subscribe(() => useEditor.setState((s) => ({ version: s.version + 1 })));
    set((s) => ({ doc, pageId: doc.pages()[0]!.id, selection: [], tool: "select", version: s.version + 1 }));
  },
}));

unsubscribe = firstDoc.subscribe(() => useEditor.setState((s) => ({ version: s.version + 1 })));

export { route };
