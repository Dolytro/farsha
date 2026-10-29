import type { DesignDoc } from "@canvylo/design-core";
import type { Box, DesignNode } from "@canvylo/types";
import { effectsFilter, shapeMarkup } from "./appearance";
import { unionBox } from "./measure";

export interface SvgExport {
  svg: string;
  width: number;
  height: number;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (n: number) => String(Math.round(n * 100) / 100);

/** Image types an exported SVG may embed (a shared file can't make the export carry anything else). */
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function paint(node: DesignNode, key: "fills" | "strokes"): { color: string; opacity: number } | undefined {
  const list = key in node ? (node as unknown as Record<string, { color: string; opacity: number }[]>)[key] : undefined;
  return list?.[0];
}

function render(doc: DesignDoc, n: DesignNode, clipIds: string[]): string {
  if (!n.visible) return "";
  const fx = effectsFilter(n);
  const body = renderBody(doc, n, clipIds);
  if (!fx) return body;
  // Effects go on the layer's own group: <g transform=.. opacity=..> becomes <g filter=.. transform=..>.
  return body.replace(/^<g /, `<g filter="url(#${fx.id})" `).replace(/^(<g [^>]*>)/, `$1<defs>${fx.markup}</defs>`);
}

function renderBody(doc: DesignDoc, n: DesignNode, clipIds: string[]): string {
  const transform = `translate(${num(n.x)} ${num(n.y)})${n.rotation ? ` rotate(${num(n.rotation)} ${num(n.width / 2)} ${num(n.height / 2)})` : ""}`;
  const opacity = n.opacity !== 1 ? ` opacity="${num(n.opacity)}"` : "";
  const fill = paint(n, "fills");
  const fillAttrs = fill ? ` fill="${esc(fill.color)}"${fill.opacity !== 1 ? ` fill-opacity="${num(fill.opacity)}"` : ""}` : ' fill="none"';
  const kids = doc.children(n.id).map((c) => render(doc, c, clipIds)).join("");
  const radius = "cornerRadius" in n && n.cornerRadius > 0 ? ` rx="${num(n.cornerRadius)}"` : "";

  switch (n.type) {
    case "ELLIPSE":
      return `<g transform="${transform}"${opacity}>${shapeMarkup(n)}${kids}</g>`;
    case "TEXT": {
      const anchor = n.textAlign === "CENTER" ? ' text-anchor="middle"' : n.textAlign === "RIGHT" ? ' text-anchor="end"' : "";
      const x = n.textAlign === "CENTER" ? n.width / 2 : n.textAlign === "RIGHT" ? n.width : 0;
      return `<g transform="${transform}"${opacity}><text x="${num(x)}" y="${num(n.fontSize)}"${anchor} font-family="${esc(n.fontFamily)}" font-size="${num(n.fontSize)}" font-weight="${n.fontWeight}"${fillAttrs}>${esc(n.characters)}</text></g>`;
    }
    case "FRAME": {
      const clipId = `clip-${n.id}`;
      clipIds.push(clipId);
      const clip = n.clipsContent ? ` clip-path="url(#${clipId})"` : "";
      return `<g transform="${transform}"${opacity}><clipPath id="${clipId}"><rect width="${num(n.width)}" height="${num(n.height)}"${radius}/></clipPath>${shapeMarkup(n)}<g${clip}>${kids}</g></g>`;
    }
    case "IMAGE": {
      const asset = n.assetId ? doc.getAsset(n.assetId) : undefined;
      if (!asset || !IMAGE_TYPES.has(asset.mime)) return `<g transform="${transform}"${opacity}><rect width="${num(n.width)}" height="${num(n.height)}"${radius} fill="#e5e5e5"/></g>`;
      const clipId = `clip-${n.id}`;
      clipIds.push(clipId);
      return `<g transform="${transform}"${opacity}><clipPath id="${clipId}"><rect width="${num(n.width)}" height="${num(n.height)}"${radius}/></clipPath><image href="data:${asset.mime};base64,${toBase64(asset.bytes)}" width="${num(n.width)}" height="${num(n.height)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/></g>`;
    }
    case "VECTOR":
      return `<g transform="${transform}"${opacity}><svg width="${num(n.width)}" height="${num(n.height)}" viewBox="${esc(n.viewBox)}" overflow="visible">${n.markup}</svg></g>`;
    case "RECTANGLE":
      return `<g transform="${transform}"${opacity}>${shapeMarkup(n)}${kids}</g>`;
    default:
      return `<g transform="${transform}"${opacity}>${kids}</g>`;
  }
}

/**
 * Standalone SVG of the given layers, cropped to their bounding box (the same crop Figma uses for
 * "Copy as SVG" / SVG export). Layers whose ancestor is also listed are drawn once, inside that ancestor.
 */
export function exportSvg(doc: DesignDoc, ids: string[]): SvgExport | null {
  const tops = ids.filter((id) => doc.hasNode(id) && !ids.some((o) => o !== id && doc.isAncestor(o, id)));
  const nodes = tops.map((id) => doc.getNode(id)).filter((n): n is DesignNode => !!n && n.type !== "PAGE" && n.type !== "DOCUMENT" && n.visible);
  const boxes = nodes.map((n) => doc.absoluteBox(n.id)).filter((b): b is Box => !!b);
  const bounds = unionBox(boxes);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

  const clipIds: string[] = [];
  const body = nodes
    .map((n) => {
      const abs = doc.absoluteBox(n.id)!;
      // Draw each top-level layer at its offset inside the crop (its own parent transforms are dropped).
      return `<g transform="translate(${num(abs.x - bounds.x - n.x)} ${num(abs.y - bounds.y - n.y)})">${render(doc, n, clipIds)}</g>`;
    })
    .join("");
  const w = num(bounds.width);
  const h = num(bounds.height);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">${body}</svg>`;
  return { svg, width: bounds.width, height: bounds.height };
}
