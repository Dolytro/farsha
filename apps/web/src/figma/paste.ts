import { decompress as zstd } from "fzstd";
import type { ClipNode } from "../clipboard";
import { convertMessage } from "./convert";
import { decodeMessage, parseSchema } from "./kiwi";

const MAGIC = "fig-kiwi";
const MAX_CLIPBOARD = 40_000_000;

/** True when clipboard HTML carries Figma layers (it embeds them as base64 between (figma) markers). */
export function looksLikeFigma(html: string): boolean {
  return html.includes("(figma)") && html.includes("(/figma)");
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Figma compresses with deflate (older versions) or zstd (newer): tell them apart by the zstd magic. */
async function decompress(bytes: Uint8Array): Promise<Uint8Array> {
  const isZstd = bytes[0] === 0x28 && bytes[1] === 0xb5 && bytes[2] === 0x2f && bytes[3] === 0xfd;
  return isZstd ? zstd(bytes) : inflateRaw(bytes);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Split a "fig-kiwi" archive into its chunks: [schema, data, ...]. */
export function readArchive(bytes: Uint8Array): Uint8Array[] {
  if (bytes.length < 12 || String.fromCharCode(...bytes.subarray(0, 8)) !== MAGIC) throw new Error("Not a Figma design clipboard");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: Uint8Array[] = [];
  let o = 12;
  while (o + 4 <= bytes.length) {
    const len = dv.getUint32(o, true);
    o += 4;
    if (len > bytes.length - o) throw new Error("Corrupt Figma clipboard");
    chunks.push(bytes.subarray(o, o + len));
    o += len;
  }
  if (chunks.length < 2) throw new Error("Corrupt Figma clipboard");
  return chunks;
}

/** Decode the Figma clipboard HTML into top-level Farsha layers (canvas coordinates). */
export async function figmaToClips(html: string): Promise<ClipNode[]> {
  const m = /\(figma\)([A-Za-z0-9+/=]+)\(\/figma\)/.exec(html);
  if (!m || m[1]!.length > MAX_CLIPBOARD) throw new Error("No Figma layers on the clipboard");
  const [schemaChunk, dataChunk] = readArchive(base64ToBytes(m[1]!));
  const schema = parseSchema(await decompress(schemaChunk!));
  const message = decodeMessage(schema, await decompress(dataChunk!));
  return convertMessage(message);
}
