import type { DesignDoc } from "@farsha/design-core";
import type { Viewport } from "./viewport";

/** Replaceable rendering backend. SVG first; Canvas/WebGL can implement this later. */
export interface Renderer {
  mount(container: HTMLElement): void;
  render(doc: DesignDoc, pageId: string, viewport: Viewport, selection: string[]): void;
  destroy(): void;
}
