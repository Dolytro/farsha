import type { DesignDoc } from "@canvylo/design-core";

/** Only these video formats are stored or played; a shared file can't smuggle in another type. */
export const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);
export const MAX_VIDEO_BYTES = 25_000_000;

export const isVideoFile = (f: { type: string }): boolean => VIDEO_TYPES.has(f.type);

export interface VideoData {
  mime: string;
  bytes: Uint8Array;
  width: number;
  height: number;
}

/** Check a file before it is read: type and size. Returns the reason it is refused, or null. */
export function videoProblem(f: { type: string; size: number }): string | null {
  if (!VIDEO_TYPES.has(f.type)) return "Only MP4 and WebM videos are supported";
  if (f.size > MAX_VIDEO_BYTES) return "The video is larger than 25 MB";
  return null;
}

/** Read a video file: its bytes and its picture size (from the first frame's metadata). */
export async function readVideo(file: Blob): Promise<VideoData> {
  const problem = videoProblem(file);
  if (problem) throw new Error(problem);
  const url = URL.createObjectURL(file);
  try {
    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.onloadedmetadata = () => resolve({ width: v.videoWidth || 640, height: v.videoHeight || 360 });
      v.onerror = () => reject(new Error("The browser can't play this video"));
      v.src = url;
    });
    return { mime: file.type, bytes: new Uint8Array(await file.arrayBuffer()), ...size };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const urls = new Map<string, string>();

/** A playable address for a stored video asset (cached), or undefined when the asset is missing or not an allowed video type. */
export function videoUrl(doc: DesignDoc, assetId: string | null | undefined): string | undefined {
  if (!assetId) return undefined;
  const cached = urls.get(assetId);
  if (cached) return cached;
  const asset = doc.getAsset(assetId);
  if (!asset || !VIDEO_TYPES.has(asset.mime)) return undefined;
  const url = URL.createObjectURL(new Blob([asset.bytes as BlobPart], { type: asset.mime }));
  urls.set(assetId, url);
  return url;
}
