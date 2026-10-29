import { create } from "zustand";
import { DesignDoc } from "@canvylo/design-core";
import type { Viewport } from "@canvylo/canvas-engine";
import type { DriveUser } from "./drive/drive";
import { parseRoute, type ViewerMode } from "./route";
import { seedWelcome } from "./seed/welcome";

export type Tool = "select" | "hand" | "frame" | "rect" | "ellipse" | "text";
export type SaveStatus = "idle" | "saving" | "saved" | "error" | "needs-auth";
export type LoadState = "ready" | "loading" | "error";

const route = parseRoute(window.location.pathname, window.location.search);
const viewer: ViewerMode | null = route.kind === "viewer" ? route.mode : null;

/** The editor starts with sample screens; a shared link starts empty until the file loads. */
function initialDoc(): DesignDoc {
  const doc = new DesignDoc();
  if (!viewer) {
    seedWelcome(doc, doc.pages()[0]!.id);
    doc.clearHistory();
  }
  return doc;
}

const firstDoc = initialDoc();

interface DriveState {
  /** True once the stored Google session has been checked (avoids a login-screen flash). */
  checked: boolean;
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
  /** Rulers (and the guides dragged out of them) are shown. Toggled with Shift+R, remembered in this browser. */
  rulers: boolean;
  setRulers: (on: boolean) => void;
  drive: DriveState;
  shareOpen: boolean;
  /** Layer being renamed in the layers panel (F2 / Ctrl+R / double-click). */
  renaming: string | null;
  setRenaming: (id: string | null) => void;
  /** Right-click menu: screen position and the canvas point it was opened on. */
  menu: { x: number; y: number; wx: number; wy: number } | null;
  setMenu: (m: EditorState["menu"]) => void;
  /** Short message shown at the bottom of the canvas, like Figma's "Copied" toasts. */
  toast: string | null;
  showToast: (message: string) => void;
  setDevMode: (on: boolean) => void;
  setTool: (t: Tool) => void;
  select: (ids: string[]) => void;
  /** Switch the open page; each page remembers its own pan and zoom. */
  setPage: (id: string) => void;
  setViewport: (v: Viewport) => void;
  setShareOpen: (open: boolean) => void;
  setDrive: (patch: Partial<DriveState>) => void;
  setLoad: (state: LoadState, error?: string | null) => void;
  /** Replace the open document (Open from Drive, shared link, New). */
  loadDoc: (doc: DesignDoc) => void;
}

function readRulers(): boolean {
  try {
    return localStorage.getItem("canvylo.rulers") === "1";
  } catch {
    return false;
  }
}

const DEFAULT_VIEWPORT: Viewport = { x: 60, y: 80, zoom: 0.5 };
/** Last pan and zoom of each page, by page id. */
const pageViews = new Map<string, Viewport>();
let unsubscribe: (() => void) | null = null;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

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
  viewport: DEFAULT_VIEWPORT,
  drive: { checked: false, user: null, fileId: null, fileName: "Untitled", status: "idle", error: null },
  shareOpen: false,
  renaming: null,
  setRenaming: (renaming) => set({ renaming }),
  menu: null,
  setMenu: (menu) => set({ menu }),
  toast: null,
  showToast: (message) => {
    clearTimeout(toastTimer);
    set({ toast: message });
    toastTimer = setTimeout(() => set({ toast: null }), 2200);
  },
  setDevMode: (devMode) => set((s) => (s.viewer ? s : { devMode, tool: "select" })),
  setTool: (tool) => set({ tool }),
  select: (selection) => set({ selection }),
  setPage: (id) =>
    set((s) => {
      if (id === s.pageId || !s.doc.hasNode(id)) return s;
      pageViews.set(s.pageId, s.viewport);
      return { pageId: id, selection: [], menu: null, renaming: null, viewport: pageViews.get(id) ?? DEFAULT_VIEWPORT };
    }),
  setViewport: (viewport) => set({ viewport }),
  rulers: readRulers(),
  setRulers: (rulers) => {
    try {
      localStorage.setItem("canvylo.rulers", rulers ? "1" : "0");
    } catch {
      /* private window: the setting just won't be remembered */
    }
    set({ rulers });
  },
  setShareOpen: (shareOpen) => set({ shareOpen }),
  setDrive: (patch) => set((s) => ({ drive: { ...s.drive, ...patch } })),
  setLoad: (loadState, loadError = null) => set({ loadState, loadError }),
  loadDoc: (doc) => {
    unsubscribe?.();
    unsubscribe = doc.subscribe(() => useEditor.setState((s) => ({ version: s.version + 1 })));
    pageViews.clear();
    set((s) => ({ doc, pageId: doc.pages()[0]!.id, selection: [], tool: "select", version: s.version + 1 }));
  },
}));

unsubscribe = firstDoc.subscribe(() => useEditor.setState((s) => ({ version: s.version + 1 })));

export { route };
