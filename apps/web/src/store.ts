import { create } from "zustand";
import { DesignDoc } from "@farsha/design-core";
import type { Viewport } from "@farsha/canvas-engine";
import type { DriveUser } from "./drive/drive";
import { parseRoute, type ViewerMode } from "./route";
import { parseTheme, THEME_KEY, type ThemePreference } from "./theme";
import { DEFAULT_PREFS, parsePrefs, PREFS_KEY, type Prefs } from "./prefs";

function readPrefs(): Prefs {
  try {
    return parsePrefs(localStorage.getItem(PREFS_KEY));
  } catch {
    return DEFAULT_PREFS;
  }
}

function readTheme(): ThemePreference {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return "dark";
  }
}

export type Tool = "select" | "hand" | "frame" | "rect" | "ellipse" | "text" | "line" | "arrow" | "polygon" | "star" | "pen" | "pencil" | "section" | "slice" | "scale" | "comment";
export type SaveStatus = "idle" | "saving" | "saved" | "error" | "needs-auth";
export type LoadState = "ready" | "loading" | "error";

const route = parseRoute(window.location.pathname, window.location.search);
const viewer: ViewerMode | null = route.kind === "viewer" ? route.mode : null;

/** The editor starts empty; App loads the saved working copy or the starter file before the boot loader fades out. */
function initialDoc(): DesignDoc {
  return new DesignDoc();
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
  paletteOpen: boolean;
  commentsVisible: boolean;
  /** The comment thread that is open, or the spot of a comment that is being written. */
  activeComment: { id: string } | { draft: { x: number; y: number } } | null;
  findOpen: boolean;
  findReplace: boolean;
  exportOpen: boolean;
  /** Bumped by "Collapse layers"; the Layers panel collapses every container when it changes. */
  collapseTick: number;
  pixelGrid: boolean;
  /** View > Outlines: draw every layer as a thin wireframe. */
  outlines: boolean;
  /** View menu switches: slices, mask outlines, frame outlines, annotations and pixel preview. */
  view: { slices: boolean; maskOutlines: boolean; frameOutlines: boolean; annotations: boolean; pixelPreview: boolean };
  toggleView: (key: "slices" | "maskOutlines" | "frameOutlines" | "annotations" | "pixelPreview") => void;
  setOutlines: (on: boolean) => void;
  prefs: Prefs;
  prefsOpen: boolean;
  shortcutsOpen: boolean;
  /** Figma's "Rename layers" dialog for several selected layers. */
  batchRenameOpen: boolean;
  /** Figma's "Minimize UI": the side panels and toolbar are hidden so the canvas fills the window. */
  uiHidden: boolean;
  /** View > Panels: hide the left (layers) or right (properties) panel on its own. */
  /** The tab of the left panel (Layers, Assets or Comments). */
  leftTab: "layers" | "assets" | "comments";
  setLeftTab: (t: "layers" | "assets" | "comments") => void;
  hideLeftPanel: boolean;
  hideRightPanel: boolean;
  setHideLeftPanel: (on: boolean) => void;
  setHideRightPanel: (on: boolean) => void;
  theme: ThemePreference;
  versionsOpen: boolean;
  /** Id of the pen path whose points are being edited. */
  editingPath: string | null;
  /** The selected anchor of the pen path being edited (Vector > Delete and heal / Split act on it). */
  editingPoint: number | null;
  setEditingPoint: (i: number | null) => void;
  variablesOpen: boolean;
  /** Prototype tab: a read-only canvas where layers get click interactions. Implies devMode. */
  prototypeMode: boolean;
  /** Id of the frame the prototype presentation started from, or null when not presenting. */
  presenting: string | null;
  /** Device bezel drawn around the prototype while presenting. */
  presentDevice: "none" | "phone" | "tablet";
  setPresentDevice: (d: "none" | "phone" | "tablet") => void;
  /** Prototype settings: colour behind the frame while presenting. */
  presentBackground: string;
  presentScale: "FIT" | "FILL" | "ACTUAL";
  setPresentScale: (s: "FIT" | "FILL" | "ACTUAL") => void;
  setPresentBackground: (c: string) => void;
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
  setPaletteOpen: (open: boolean) => void;
  setCommentsVisible: (on: boolean) => void;
  setActiveComment: (c: { id: string } | { draft: { x: number; y: number } } | null) => void;
  setFindOpen: (open: boolean, replace?: boolean) => void;
  setFindReplace: (on: boolean) => void;
  setExportOpen: (open: boolean) => void;
  collapseLayers: () => void;
  setPixelGrid: (on: boolean) => void;
  setPrefs: (patch: Partial<Prefs>) => void;
  setPrefsOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setBatchRenameOpen: (open: boolean) => void;
  setUiHidden: (hidden: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
  setVersionsOpen: (open: boolean) => void;
  setEditingPath: (id: string | null) => void;
  setVariablesOpen: (open: boolean) => void;
  setPrototypeMode: (on: boolean) => void;
  setPresenting: (frameId: string | null) => void;
  setDrive: (patch: Partial<DriveState>) => void;
  setLoad: (state: LoadState, error?: string | null) => void;
  /** Replace the open document (Open from Drive, shared link, New). */
  loadDoc: (doc: DesignDoc) => void;
}

function readRulers(): boolean {
  try {
    return localStorage.getItem("farsha.rulers") === "1";
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
  paletteOpen: false,
  commentsVisible: true,
  activeComment: null,
  findOpen: false,
  findReplace: false,
  exportOpen: false,
  collapseTick: 0,
  pixelGrid: false,
  outlines: false,
  view: { slices: true, maskOutlines: false, frameOutlines: false, annotations: false, pixelPreview: false },
  prefs: readPrefs(),
  prefsOpen: false,
  shortcutsOpen: false,
  batchRenameOpen: false,
  uiHidden: false,
  leftTab: "layers",
  hideLeftPanel: false,
  hideRightPanel: false,
  theme: readTheme(),
  versionsOpen: false,
  editingPath: null,
  editingPoint: null,
  variablesOpen: false,
  prototypeMode: false,
  presenting: null,
  presentDevice: "none",
  presentBackground: "#1E1E1E",
  presentScale: "FIT",
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
  setDevMode: (devMode) => set((s) => (s.viewer ? s : { devMode, prototypeMode: false, tool: "select" })),
  setPrototypeMode: (on) => set((s) => (s.viewer ? s : { prototypeMode: on, devMode: on, tool: "select" })),
  setPresenting: (presenting) => set({ presenting }),
  setPresentDevice: (presentDevice) => set({ presentDevice }),
  setPresentBackground: (presentBackground) => set({ presentBackground }),
  setPresentScale: (presentScale) => set({ presentScale }),
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
      localStorage.setItem("farsha.rulers", rulers ? "1" : "0");
    } catch {
      /* private window: the setting just won't be remembered */
    }
    set({ rulers });
  },
  setShareOpen: (shareOpen) => set({ shareOpen }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setCommentsVisible: (commentsVisible) => set({ commentsVisible, ...(commentsVisible ? {} : { activeComment: null }) }),
  setActiveComment: (activeComment) => set({ activeComment }),
  setFindOpen: (findOpen, replace) => set((s) => ({ findOpen, findReplace: replace ?? s.findReplace })),
  setFindReplace: (findReplace) => set({ findReplace }),
  setExportOpen: (exportOpen) => set({ exportOpen }),
  collapseLayers: () => set((s) => ({ collapseTick: s.collapseTick + 1 })),
  setPixelGrid: (pixelGrid) => set({ pixelGrid }),
  setOutlines: (outlines) => set({ outlines }),
  toggleView: (key) => set((st) => ({ view: { ...st.view, [key]: !st.view[key] } })),
  setPrefs: (patch) =>
    set((s) => {
      const prefs = { ...s.prefs, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      } catch {
        /* private mode: the choice lasts for this session */
      }
      return { prefs };
    }),
  setPrefsOpen: (prefsOpen) => set({ prefsOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  setBatchRenameOpen: (batchRenameOpen) => set({ batchRenameOpen }),
  setUiHidden: (uiHidden) => set({ uiHidden }),
  setHideLeftPanel: (hideLeftPanel) => set({ hideLeftPanel }),
  setLeftTab: (leftTab) => set({ leftTab }),
  setHideRightPanel: (hideRightPanel) => set({ hideRightPanel }),
  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* private mode: the choice just lasts for this session */
    }
    set({ theme });
  },
  setVersionsOpen: (versionsOpen) => set({ versionsOpen }),
  setEditingPath: (editingPath) => set({ editingPath, editingPoint: null }),
  setEditingPoint: (editingPoint) => set({ editingPoint }),
  setVariablesOpen: (variablesOpen) => set({ variablesOpen }),
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
