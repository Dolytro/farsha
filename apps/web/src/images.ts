import type { DesignDoc } from "@canvylo/design-core";

const MAX_EDGE = 2048;
const MAX_BYTES = 25_000_000;
const KEEP_AS_IS_BYTES = 2_000_000;

/** Only these formats are stored or drawn; a shared file can't smuggle in another type. */
export const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export interface ImageData {
  mime: string;
  bytes: Uint8Array;
  width: number;
  height: number;
}

export const isImageFile = (f: { type: string }): boolean => IMAGE_TYPES.has(f.type);

/** Size a new image is first shown at: its own size, shrunk so the longest edge is at most `max`. */
export function fitSize(width: number, height: number, max = 800): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height, 1));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Read an image file. Large images are scaled down to 2048px and re-encoded (PNG stays PNG so
 * transparency survives; others become JPEG); small ones are kept byte-for-byte. GIFs are kept as is.
 */
export async function readImage(file: Blob): Promise<ImageData> {
  if (!IMAGE_TYPES.has(file.type)) throw new Error("That image type isn't supported");
  if (file.size > MAX_BYTES) throw new Error("The image is larger than 25 MB");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (file.type === "image/gif" || (scale === 1 && file.size <= KEEP_AS_IS_BYTES)) {
      return { mime: file.type, bytes: new Uint8Array(await file.arrayBuffer()), width: bitmap.width, height: bitmap.height };
    }
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas isn't available");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't encode the image"))), mime, 0.88));
    return { mime, bytes: new Uint8Array(await blob.arrayBuffer()), width, height };
  } finally {
    bitmap.close();
  }
}

const urls = new Map<string, string>();

/** A blob: URL for an image layer's asset, cached so repeated renders reuse it. */
export function assetUrl(doc: DesignDoc, assetId: string | null | undefined): string | undefined {
  if (!assetId) return undefined;
  const cached = urls.get(assetId);
  if (cached) return cached;
  const asset = doc.getAsset(assetId);
  if (!asset || !IMAGE_TYPES.has(asset.mime)) return undefined;
  const url = URL.createObjectURL(new Blob([asset.bytes as BlobPart], { type: asset.mime }));
  urls.set(assetId, url);
  return url;
}
