/**
 * Builds public/starter.farsha: the Farsha UI design (editor, files home, loader, landing page, logo) as layers.
 * Input: one JSON per board produced by the DOM extractor (layers as { type, props, children, svg? }).
 * Usage: node dist-script.js <dir with the board JSON files>
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DesignDoc } from "@farsha/design-core";
import { svgToClip } from "../src/svg-import";
import type { ClipNode } from "../src/clipboard";

interface Raw {
  type: string;
  props: Record<string, unknown>;
  children: Raw[];
  svg?: string;
}

/** Where each board sits on the canvas (the same layout as the design canvas). */
const BOARDS: { file: string; name: string; x: number; y: number }[] = [
  { file: "editor", name: "Editor", x: 0, y: 0 },
  { file: "files", name: "Files home", x: 1520, y: 0 },
  { file: "loader", name: "Loader: butterfly", x: 3040, y: 0 },
  { file: "landing", name: "Landing page", x: 0, y: 1020 },
  { file: "logo", name: "Logo", x: 1520, y: 1020 },
];

// Optional, for profiling: ONLY="logo,files" builds just those boards; NOFX=1 drops shadows and blurs.
const only = process.env.ONLY?.split(",");
const noFx = process.env.NOFX === "1";
const dir = process.argv[2];
const out = process.argv[3];
if (!dir || !out) throw new Error("usage: build-starter <json dir> <output file>");

const doc = new DesignDoc();
const page = doc.pages()[0]!.id;

function addClip(clip: ClipNode, parent: string, dx: number, dy: number): string {
  const props = { ...clip.props } as Record<string, unknown> & { x?: number; y?: number };
  if (typeof props.x === "number") props.x += dx;
  if (typeof props.y === "number") props.y += dy;
  const id = doc.createNode(clip.type, { parentId: parent, props });
  for (const c of clip.children) addClip(c, id, 0, 0);
  return id;
}

function sized(svg: string, w: number, h: number): string {
  return svg.replace(/<svg\b([^>]*)>/i, (_m, attrs: string) => {
    const clean = attrs.replace(/\s(width|height)="[^"]*"/gi, "").replace(/\sstyle="[^"]*"/gi, "");
    return `<svg${clean} width="${w}" height="${h}">`;
  });
}

function build(raw: Raw, parent: string): void {
  if (raw.type === "SVG") {
    const p = raw.props as { x: number; y: number; width: number; height: number; name: string; opacity?: number };
    const clip = svgToClip(sized(raw.svg ?? "", p.width, p.height));
    if (!clip) return;
    clip.props.name = p.name;
    clip.props.x = p.x;
    clip.props.y = p.y;
    clip.props.width = p.width;
    clip.props.height = p.height;
    if (p.opacity !== undefined && p.opacity < 1) clip.props.opacity = p.opacity;
    addClip(clip, parent, 0, 0);
    return;
  }
  if (noFx) delete raw.props.effects;
  const id = doc.createNode(raw.type as never, { parentId: parent, props: raw.props as never });
  for (const c of raw.children) build(c, id);
}

doc.rename(page, "Farsha UI");
doc.setPageBackground(page, "#0e0d14");

doc.createNode("TEXT", {
  parentId: page,
  props: {
    name: "Farsha: app, landing and logo",
    x: 0,
    y: -300,
    width: 1400,
    height: 86,
    characters: "Farsha: app, landing and logo",
    fontFamily: "'Bricolage Grotesque', 'Segoe UI', system-ui, sans-serif",
    fontSize: 72,
    fontWeight: 800,
    lineHeight: 86,
    letterSpacing: -2.88,
    textAutoResize: "WIDTH_AND_HEIGHT",
    fills: [{ type: "SOLID", color: "#f2f0fa", opacity: 1 }],
  } as never,
});

let layers = 0;
for (const b of BOARDS) {
  if (only && !only.includes(b.file)) continue;
  const path = join(dir, `${b.file}.json`);
  if (!existsSync(path)) {
    console.warn(`skip ${b.name}: ${path} not found`);
    continue;
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as Raw;
  raw.props.name = b.name;
  raw.props.x = b.x;
  raw.props.y = b.y;
  build(raw, page);
  layers += (raw as unknown as { stats?: { nodes: number } }).stats?.nodes ?? 0;
}

doc.clearHistory();
const bytes = doc.encodeState();
writeFileSync(out, bytes);
console.log(`wrote ${out}: ${bytes.length} bytes, ${layers} layers`);
