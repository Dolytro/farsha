import type { DesignDoc } from "@canvylo/design-core";
import { cssBlendMode, paintColor, type Box, type DesignNode, type Paint } from "@canvylo/types";
import { effectsFilter, isDrawnVector, letterSpacingAttr, shapeGeometry, shapeMarkup, textBaseline, vectorMarkerDefs, vectorPaintAttrs } from "./appearance";
import { unionBox } from "./measure";
import { maskMarkup } from "./mask";
import { nodeTransform } from "./transform";
import { approxMeasure, layoutText, textFontStyle, verticalTextOffset, type Measure } from "./text";

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

function paint(node: DesignNode, key: "fills"): Paint | undefined {
  return key in node ? (node as unknown as Record<string, Paint[]>)[key]?.[0] : undefined;
}

/** Data-URL source for image fills: only known raster types, so a shared file can't make an export carry anything else. */
function imageHref(doc: DesignDoc): (assetId: string) => string | undefined {
  return (assetId) => {
    const asset = doc.getAsset(assetId);
    return asset && IMAGE_TYPES.has(asset.mime) ? `data:${asset.mime};base64,${toBase64(asset.bytes)}` : undefined;
  };
}

/** Text measurer for the export in progress (the browser passes a real one; the default is an estimate). */
let measure: Measure = approxMeasure;

/** Sibling layers bottom to top; a mask layer is not drawn and clips everything above it. */
function renderList(doc: DesignDoc, list: DesignNode[], clipIds: string[]): string {
  const at = list.findIndex((c) => c.isMask && c.visible);
  if (at < 0) return list.map((c) => render(doc, c, clipIds)).join("");
  const mask = maskMarkup(list[at]!);
  return `${list.slice(0, at).map((c) => render(doc, c, clipIds)).join("")}${mask.defs}<g mask="url(#${mask.id})">${renderList(doc, list.slice(at + 1), clipIds)}</g>`;
}

function render(doc: DesignDoc, n: DesignNode, clipIds: string[]): string {
  if (n.isMask) return "";
  if (!n.visible) return "";
  const fx = effectsFilter(n);
  const body = renderBody(doc, n, clipIds);
  if (!fx) return body;
  // Effects go on the layer's own group: <g transform=.. opacity=..> becomes <g filter=.. transform=..>.
  return body.replace(/^<g /, `<g filter="url(#${fx.id})" `).replace(/^(<g [^>]*>)/, `$1<defs>${fx.markup}</defs>`);
}

function renderBody(doc: DesignDoc, n: DesignNode, clipIds: string[]): string {
  const transform = nodeTransform(n);
  const blend = cssBlendMode(n.blendMode);
  const opacity = (n.opacity !== 1 ? ` opacity="${num(n.opacity)}"` : "") + (blend ? ` style="mix-blend-mode:${blend}"` : "");
  const fill = paint(n, "fills");
  const fillAttrs = fill ? ` fill="${esc(paintColor(fill))}"${fill.opacity !== 1 ? ` fill-opacity="${num(fill.opacity)}"` : ""}` : ' fill="none"';
  const kids = renderList(doc, doc.children(n.id), clipIds);

  switch (n.type) {
    case "ELLIPSE":
      return `<g transform="${transform}"${opacity}>${shapeMarkup(n, imageHref(doc))}${kids}</g>`;
    case "TEXT": {
      const anchor = n.textAlign === "CENTER" ? ' text-anchor="middle"' : n.textAlign === "RIGHT" ? ' text-anchor="end"' : "";
      const x = n.textAlign === "CENTER" ? n.width / 2 : n.textAlign === "RIGHT" ? n.width : 0;
      const { lines, lineHeight, height: textHeight } = layoutText(n, measure);
      const style = textFontStyle(n);
      const decoration = `${style.fontStyle ? ' font-style="italic"' : ""}${style.textDecoration ? ` text-decoration="${style.textDecoration}"` : ""}`;
      const spans = lines.map((l, i) => `<tspan x="${num(x)}" dy="${i ? num(lineHeight) : 0}">${esc(l)}</tspan>`).join("");
      return `<g transform="${transform}"${opacity}><text x="${num(x)}" y="${num(textBaseline(n) + verticalTextOffset(n, textHeight))}"${anchor}${letterSpacingAttr(n)}${decoration} font-family="${esc(n.fontFamily)}" font-size="${num(n.fontSize)}" font-weight="${n.fontWeight}"${fillAttrs} xml:space="preserve">${spans}</text></g>`;
    }
    case "FRAME": {
      const clipId = `clip-${n.id}`;
      clipIds.push(clipId);
      const clip = n.clipsContent ? ` clip-path="url(#${clipId})"` : "";
      return `<g transform="${transform}"${opacity}><clipPath id="${clipId}">${shapeGeometry(n, "")}</clipPath>${shapeMarkup(n, imageHref(doc))}<g${clip}>${kids}</g></g>`;
    }
    case "IMAGE": {
      const asset = n.assetId ? doc.getAsset(n.assetId) : undefined;
      if (!asset || !IMAGE_TYPES.has(asset.mime)) return `<g transform="${transform}"${opacity}>${shapeGeometry(n, ' fill="#e5e5e5"')}</g>`;
      const clipId = `clip-${n.id}`;
      clipIds.push(clipId);
      return `<g transform="${transform}"${opacity}><clipPath id="${clipId}">${shapeGeometry(n, "")}</clipPath><image href="data:${asset.mime};base64,${toBase64(asset.bytes)}" width="${num(n.width)}" height="${num(n.height)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/></g>`;
    }
    case "VECTOR":
      if (isDrawnVector(n)) {
        return `<g transform="${transform}"${opacity}><svg width="${num(n.width)}" height="${num(Math.max(n.height, 0.001))}" viewBox="${esc(n.viewBox)}" preserveAspectRatio="none" overflow="visible"><defs>${vectorMarkerDefs(n)}</defs><g ${vectorPaintAttrs(n)}>${n.markup}</g></svg></g>`;
      }
      return `<g transform="${transform}"${opacity}><svg width="${num(n.width)}" height="${num(n.height)}" viewBox="${esc(n.viewBox)}" overflow="visible">${n.markup}</svg></g>`;
    case "RECTANGLE":
      if (n.isSlice) return "";
      return `<g transform="${transform}"${opacity}>${shapeMarkup(n, imageHref(doc))}${kids}</g>`;
    default:
      return `<g transform="${transform}"${opacity}>${kids}</g>`;
  }
}

/** A slice exports whatever the page shows inside its box, cropped to it. */
function exportSlice(doc: DesignDoc, slice: DesignNode, bounds: Box, clipIds: string[]): SvgExport {
  let top: DesignNode | undefined = slice;
  while (top && top.parentId && doc.getNode(top.parentId)?.type !== "PAGE") top = doc.getNode(top.parentId);
  const pageId = top?.parentId;
  const body = (pageId ? doc.children(pageId) : [])
    .filter((n) => n.visible)
    .map((n) => {
      const abs = doc.absoluteBox(n.id);
      return abs ? `<g transform="translate(${num(abs.x - bounds.x - n.x)} ${num(abs.y - bounds.y - n.y)})">${render(doc, n, clipIds)}</g>` : "";
    })
    .join("");
  const w = num(bounds.width);
  const h = num(bounds.height);
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">${body}</svg>`, width: bounds.width, height: bounds.height };
}

/**
 * Standalone SVG of the given layers, cropped to their bounding box (the same crop Figma uses for
 * "Copy as SVG" / SVG export). Layers whose ancestor is also listed are drawn once, inside that ancestor.
 */
export function exportSvg(doc: DesignDoc, ids: string[], opts: { measure?: Measure } = {}): SvgExport | null {
  measure = opts.measure ?? approxMeasure;
  const tops = ids.filter((id) => doc.hasNode(id) && !ids.some((o) => o !== id && doc.isAncestor(o, id)));
  const nodes = tops.map((id) => doc.getNode(id)).filter((n): n is DesignNode => !!n && n.type !== "PAGE" && n.type !== "DOCUMENT" && n.visible);
  const boxes = nodes.map((n) => doc.absoluteBox(n.id)).filter((b): b is Box => !!b);
  const bounds = unionBox(boxes);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

  const clipIds: string[] = [];
  const slice = nodes.length === 1 && nodes[0]!.type === "RECTANGLE" && nodes[0]!.isSlice ? nodes[0]! : undefined;
  if (slice) return exportSlice(doc, slice, bounds, clipIds);
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
