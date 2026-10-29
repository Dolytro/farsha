import { create } from "zustand";
import { DesignDoc } from "@canvylo/design-core";
import type { Viewport } from "@canvylo/canvas-engine";
import { seedThemeForest } from "./seed/themeforest";

export type Tool = "select" | "hand" | "frame" | "rect" | "ellipse" | "text";

const doc = new DesignDoc();
const pageId = doc.pages()[0]!.id;
seedThemeForest(doc, pageId);
doc.clearHistory();

interface EditorState {
  doc: DesignDoc;
  pageId: string;
  /** Bumped whenever the Yjs document changes, to re-render consumers. */
  version: number;
  tool: Tool;
  /** Developer handoff mode: inspect and copy code, never modifies the design. */
  devMode: boolean;
  selection: string[];
  viewport: Viewport;
  setDevMode: (on: boolean) => void;
  setTool: (t: Tool) => void;
  select: (ids: string[]) => void;
  setViewport: (v: Viewport) => void;
}

export const useEditor = create<EditorState>((set) => ({
  doc,
  pageId,
  version: 0,
  tool: "select",
  devMode: false,
  setDevMode: (devMode) => set({ devMode, tool: "select" }),
  selection: [],
  viewport: { x: 40, y: 80, zoom: 0.28 },
  setTool: (tool) => set({ tool }),
  select: (selection) => set({ selection }),
  setViewport: (viewport) => set({ viewport }),
}));

doc.subscribe(() => useEditor.setState((s) => ({ version: s.version + 1 })));
