import { describe, expect, it } from "vitest";
import vectorFixture from "./fixtures/vector.json";
import { commandsToPath, convertMessage, networkToPath, weightFromStyle } from "./convert";
import { decodeMessage, parseSchema } from "./kiwi";
import { figmaToClips, looksLikeFigma, readArchive } from "./paste";

// ---------- a tiny Kiwi encoder, only for building test inputs ----------

const utf8 = (s: string) => Array.from(new TextEncoder().encode(s));
const varUint = (n: number) => {
  const out: number[] = [];
  do {
    out.push((n & 127) | (n > 127 ? 128 : 0));
    n >>>= 7;
  } while (n);
  return out;
};
const zig = (n: number) => varUint(((n << 1) ^ (n >> 31)) >>> 0);
const str = (s: string) => [...utf8(s), 0];
const float = (v: number) => {
  if (v === 0) return [0];
  const dv = new DataView(new ArrayBuffer(4));
  dv.setFloat32(0, v);
  let bits = dv.getInt32(0);
  bits = (bits >>> 23) | (bits << 9);
  return [bits & 255, (bits >>> 8) & 255, (bits >>> 16) & 255, (bits >>> 24) & 255];
};

const BOOL = -1;
const BYTE = -2;
const UINT = -4;
const FLOAT = -5;
const STRING = -6;
const field = (name: string, type: number, isArray: boolean, value: number) => [...str(name), ...zig(type), isArray ? 1 : 0, ...varUint(value)];

// definitions: 0 Kind (enum), 1 Point (struct), 2 Message
function schemaBytes(): Uint8Array {
  const def = (name: string, kind: number, fields: number[][]) => [...str(name), kind, ...varUint(fields.length), ...fields.flat()];
  return Uint8Array.from([
    ...varUint(3),
    ...def("Kind", 0, [field("SMALL", 0, false, 1), field("LARGE", 0, false, 2)]),
    ...def("Point", 1, [field("x", FLOAT, false, 1), field("y", FLOAT, false, 2)]),
    ...def("Message", 2, [
      field("name", STRING, false, 1),
      field("points", 1, true, 2),
      field("kind", 0, false, 3),
      field("count", UINT, false, 4),
      field("ok", BOOL, false, 5),
      field("data", BYTE, true, 6),
    ]),
  ]);
}

function messageBytes(): Uint8Array {
  return Uint8Array.from([
    ...varUint(1), ...str("héllo"),
    ...varUint(2), ...varUint(2), ...float(1.5), ...float(-2), ...float(0), ...float(100),
    ...varUint(3), ...varUint(2),
    ...varUint(4), ...varUint(300),
    ...varUint(5), 1,
    ...varUint(6), ...varUint(3), 7, 8, 9,
    0,
  ]);
}

describe("kiwi", () => {
  it("parses a schema and decodes every field type", () => {
    const schema = parseSchema(schemaBytes());
    expect([...schema.keys()]).toEqual(["Kind", "Point", "Message"]);
    const msg = decodeMessage(schema, messageBytes());
    expect(msg).toMatchObject({ name: "héllo", kind: "LARGE", count: 300, ok: true });
    expect(msg.points).toEqual([
      { x: 1.5, y: -2 },
      { x: 0, y: 100 },
    ]);
    expect(Array.from(msg.data as Uint8Array)).toEqual([7, 8, 9]);
  });

  it("rejects truncated and unknown data instead of looping or crashing", () => {
    const schema = parseSchema(schemaBytes());
    expect(() => decodeMessage(schema, messageBytes().subarray(0, 6))).toThrow();
    expect(() => decodeMessage(schema, Uint8Array.from([...varUint(99), 1, 0]))).toThrow(/Unknown field/);
    expect(() => parseSchema(Uint8Array.from([5]))).toThrow();
  });
});

// ---------- converter ----------

const revive = (): Record<string, unknown> => {
  const raw = JSON.parse(JSON.stringify(vectorFixture)) as { blobs: { bytes: string }[] };
  raw.blobs = raw.blobs.map((b) => ({ bytes: Uint8Array.from(Buffer.from(b.bytes, "base64")) })) as never;
  return raw as unknown as Record<string, unknown>;
};

const g = (s: number, l: number) => ({ sessionID: s, localID: l });
const id = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };
const white = { type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true };

describe("convertMessage (real Figma paste of one vector)", () => {
  it("turns the pasted vector into a VECTOR layer with its path and fill", () => {
    const clips = convertMessage(revive());
    expect(clips).toHaveLength(1);
    const v = clips[0]!;
    expect(v.type).toBe("VECTOR");
    expect(v.props).toMatchObject({ name: "Vector", x: 15600, y: 7200, width: 1440, height: 900, viewBox: "0 0 1440 900" });
    const markup = String(v.props.markup);
    expect(markup).toContain('fill="#ffffff"');
    expect(markup).toMatch(/d="M0 0L1440 0L1440 900L0 900L0 0Z"|d="M[^"]*Z"/);
  });

  it("decodes the vector network blob into a closed rectangle path", () => {
    const blob = (revive().blobs as { bytes: Uint8Array }[])[0]!.bytes;
    const d = networkToPath(blob);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect((d.match(/L/g) ?? []).length).toBe(4);
  });
});

describe("convertMessage (synthetic scenes)", () => {
  const scene = (nodes: unknown[], blobs: Uint8Array[] = []) => ({ nodeChanges: [{ guid: g(0, 0), type: "DOCUMENT" }, { guid: g(0, 1), type: "CANVAS", parentIndex: { guid: g(0, 0), position: "!" } }, ...nodes], blobs: blobs.map((bytes) => ({ bytes })) });
  const at = (parent: [number, number], position: string) => ({ guid: g(1, 0), parentIndex: { guid: g(parent[0], parent[1]), position } });

  it("builds frames with children, ordered back to front by position", () => {
    const clips = convertMessage(
      scene([
        { guid: g(1, 1), parentIndex: { guid: g(0, 1), position: "!" }, type: "FRAME", name: "Card", size: { x: 200, y: 100 }, transform: { ...id, m02: 10, m12: 20 }, fillPaints: [white], cornerRadius: 12 },
        { guid: g(1, 3), parentIndex: { guid: g(1, 1), position: "b" }, type: "ELLIPSE", name: "Top", size: { x: 10, y: 10 }, transform: id },
        { guid: g(1, 2), parentIndex: { guid: g(1, 1), position: "a" }, type: "ROUNDED_RECTANGLE", name: "Back", size: { x: 50, y: 40 }, transform: id, rectangleTopLeftCornerRadius: 8, fillPaints: [{ ...white, color: { r: 1, g: 0, b: 0, a: 1 } }] },
      ]),
    );
    const card = clips[0]!;
    expect(card.type).toBe("FRAME");
    expect(card.props).toMatchObject({ name: "Card", x: 10, y: 20, width: 200, height: 100, cornerRadius: 12, clipsContent: true });
    expect(card.children.map((c) => c.props.name)).toEqual(["Back", "Top"]);
    expect(card.children[0]!.type).toBe("RECTANGLE");
    expect(card.children[0]!.props).toMatchObject({ cornerRadius: 8, fills: [{ type: "SOLID", color: "#ff0000", opacity: 1 }] });
  });

  it("maps text typography", () => {
    const [t] = convertMessage(
      scene([
        {
          ...at([0, 1], "!"),
          guid: g(1, 5),
          type: "TEXT",
          name: "Title",
          size: { x: 120, y: 24 },
          transform: id,
          textData: { characters: "Hello" },
          fontSize: 20,
          fontName: { family: "Inter", style: "SemiBold" },
          textAlignHorizontal: "CENTER",
          lineHeight: { value: 150, units: "PERCENT" },
          letterSpacing: { value: 2, units: "PIXELS" },
          fillPaints: [{ ...white, color: { r: 0, g: 0, b: 0, a: 1 } }],
        },
      ]),
    );
    expect(t!.props).toMatchObject({ characters: "Hello", fontSize: 20, fontFamily: "Inter", fontWeight: 600, textAlign: "CENTER", lineHeight: 30, letterSpacing: 2 });
  });

  it("rotates around the centre, and skips hidden layers", () => {
    const clips = convertMessage(
      scene([
        // 100x50 rotated 90deg clockwise: its corners land at x 100..150, y 0..100, so the centre is (125, 50)
        { ...at([0, 1], "!"), guid: g(1, 6), type: "RECTANGLE", size: { x: 100, y: 50 }, transform: { m00: 0, m01: -1, m02: 150, m10: 1, m11: 0, m12: 0 } },
        { ...at([0, 1], "\""), guid: g(1, 7), type: "RECTANGLE", size: { x: 5, y: 5 }, transform: id, visible: false },
      ]),
    );
    expect(clips).toHaveLength(1);
    expect(clips[0]!.props).toMatchObject({ rotation: 90, x: 75, y: 25, width: 100, height: 50 });
  });

  it("flattens gradients and images to flat fills", () => {
    const [r] = convertMessage(
      scene([
        {
          ...at([0, 1], "!"),
          guid: g(1, 8),
          type: "RECTANGLE",
          size: { x: 10, y: 10 },
          transform: id,
          fillPaints: [
            { type: "GRADIENT_LINEAR", visible: true, opacity: 1, gradientStops: [{ color: { r: 0, g: 0, b: 1, a: 1 }, position: 0 }, { color: { r: 1, g: 0, b: 0, a: 1 }, position: 1 }] },
            { type: "IMAGE", visible: true, opacity: 0.5 },
          ],
        },
      ]),
    );
    expect(r!.props.fills).toEqual([
      { type: "SOLID", color: "#0000ff", opacity: 1 },
      { type: "SOLID", color: "#d9d9d9", opacity: 0.5 },
    ]);
  });

  it("decodes path command blobs", () => {
    const dv = new DataView(new ArrayBuffer(1 + 8 + 1 + 8 + 1));
    dv.setUint8(0, 1);
    dv.setFloat32(1, 10, true);
    dv.setFloat32(5, 20, true);
    dv.setUint8(9, 2);
    dv.setFloat32(10, 30, true);
    dv.setFloat32(14, 40, true);
    dv.setUint8(18, 0);
    expect(commandsToPath(new Uint8Array(dv.buffer))).toBe("M10 20L30 40Z");
  });

  it("maps weight names", () => {
    expect(weightFromStyle("Bold")).toBe(700);
    expect(weightFromStyle("Semi Bold Italic")).toBe(600);
    expect(weightFromStyle("ExtraBold")).toBe(800);
    expect(weightFromStyle("Light")).toBe(300);
    expect(weightFromStyle(undefined)).toBe(400);
  });
});

// ---------- archive ----------

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** A zstd frame holding one raw (uncompressed) block, enough to exercise the zstd branch. */
function zstdRaw(data: Uint8Array): Uint8Array {
  const n = data.length;
  return Uint8Array.from([0x28, 0xb5, 0x2f, 0xfd, 0x20, n, (n << 3) | 1, (n << 3) >> 8, 0, ...data]);
}

function archive(chunks: Uint8Array[]): string {
  const parts: number[] = [...utf8("fig-kiwi"), 106, 0, 0, 0];
  for (const c of chunks) parts.push(c.length & 255, (c.length >>> 8) & 255, (c.length >>> 16) & 255, (c.length >>> 24) & 255, ...c);
  return `<meta charset="utf-8"><span data-buffer="<!--(figma)${Buffer.from(parts).toString("base64")}(/figma)-->"></span>`;
}

describe("figma clipboard", () => {
  it("detects figma html", () => {
    expect(looksLikeFigma(archive([new Uint8Array(1), new Uint8Array(1)]))).toBe(true);
    expect(looksLikeFigma("<b>plain</b>")).toBe(false);
  });

  it("rejects archives that aren't fig-kiwi or are cut short", () => {
    expect(() => readArchive(Uint8Array.from(utf8("fig-jam.xxxx")))).toThrow(/Not a Figma/);
    expect(() => readArchive(Uint8Array.from([...utf8("fig-kiwi"), 106, 0, 0, 0, 255, 255, 255, 255, 1]))).toThrow(/Corrupt/);
  });

  it("decodes a deflate schema with a zstd data chunk end to end", async () => {
    const schema = parseSchema; // keep the import used
    expect(schema).toBeTypeOf("function");
    // Message{ nodeChanges: NodeChange[] }, NodeChange{ guid, type, name, size, transform, fillPaints }
    // is large; use the tiny schema and make sure the pipeline decompresses both chunk styles.
    const s = schemaBytes();
    const m = messageBytes();
    const html = archive([await deflateRaw(s), zstdRaw(m)]);
    await expect(figmaToClips(html)).resolves.toEqual([]); // decodes fine, but has no nodeChanges
  });

  it("fails clearly on a corrupt payload", async () => {
    await expect(figmaToClips("(figma)AAAA(/figma)")).rejects.toThrow();
    await expect(figmaToClips("nothing here")).rejects.toThrow(/No Figma layers/);
  });
});
