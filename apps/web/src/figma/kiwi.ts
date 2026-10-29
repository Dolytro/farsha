/**
 * Minimal reader for the Kiwi binary format that Figma uses inside its clipboard payload and .fig files.
 * The schema travels with the data, so no Figma-specific knowledge is needed here: parse the schema,
 * then decode a message with it. Reading only; nothing is ever encoded.
 */

export type KiwiKind = "ENUM" | "STRUCT" | "MESSAGE";

export interface KiwiField {
  name: string;
  /** A builtin type name or the name of another definition. */
  type: string;
  isArray: boolean;
  /** Field id (messages) or ordinal (enums). */
  value: number;
}

export interface KiwiDefinition {
  name: string;
  kind: KiwiKind;
  fields: KiwiField[];
}

export type KiwiSchema = Map<string, KiwiDefinition>;

const BUILTIN = ["bool", "byte", "int", "uint", "float", "string", "int64", "uint64"];
const KINDS: KiwiKind[] = ["ENUM", "STRUCT", "MESSAGE"];
const MAX_DEPTH = 64;
const MAX_ITEMS = 5_000_000;

class Reader {
  private i = 0;
  readonly bytes: Uint8Array;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  get done(): boolean {
    return this.i >= this.bytes.length;
  }

  byte(): number {
    if (this.i >= this.bytes.length) throw new Error("Unexpected end of data");
    return this.bytes[this.i++]!;
  }

  varUint(): number {
    let result = 0;
    let shift = 0;
    for (let n = 0; n < 5; n++) {
      const b = this.byte();
      result |= (b & 127) << shift;
      if (!(b & 128)) return result >>> 0;
      shift += 7;
    }
    return result >>> 0;
  }

  varInt(): number {
    const v = this.varUint();
    return v & 1 ? ~(v >>> 1) : v >>> 1;
  }

  varUint64(): bigint {
    let result = 0n;
    let shift = 0n;
    for (let n = 0; n < 10; n++) {
      const b = this.byte();
      result |= BigInt(b & 127) << shift;
      if (!(b & 128)) return result;
      shift += 7n;
    }
    return result;
  }

  varInt64(): bigint {
    const v = this.varUint64();
    return v & 1n ? ~(v >> 1n) : v >> 1n;
  }

  float(): number {
    const first = this.bytes[this.i];
    if (first === undefined) throw new Error("Unexpected end of data");
    if (first === 0) {
      this.i++;
      return 0;
    }
    if (this.i + 4 > this.bytes.length) throw new Error("Unexpected end of data");
    let bits = this.bytes[this.i]! | (this.bytes[this.i + 1]! << 8) | (this.bytes[this.i + 2]! << 16) | (this.bytes[this.i + 3]! << 24);
    this.i += 4;
    bits = (bits << 23) | (bits >>> 9);
    const view = new DataView(new ArrayBuffer(4));
    view.setInt32(0, bits);
    return view.getFloat32(0);
  }

  string(): string {
    const start = this.i;
    while (this.i < this.bytes.length && this.bytes[this.i] !== 0) this.i++;
    if (this.i >= this.bytes.length) throw new Error("Unterminated string");
    const s = new TextDecoder().decode(this.bytes.subarray(start, this.i));
    this.i++;
    return s;
  }

  raw(n: number): Uint8Array {
    if (n < 0 || this.i + n > this.bytes.length) throw new Error("Unexpected end of data");
    const out = this.bytes.slice(this.i, this.i + n);
    this.i += n;
    return out;
  }
}

/** Parse a binary Kiwi schema. */
export function parseSchema(bytes: Uint8Array): KiwiSchema {
  const r = new Reader(bytes);
  const count = r.varUint();
  if (count > 100_000) throw new Error("Schema is too large");
  const raw: { name: string; kind: KiwiKind; fields: { name: string; typeIndex: number; isArray: boolean; value: number }[] }[] = [];
  for (let i = 0; i < count; i++) {
    const name = r.string();
    const kind = KINDS[r.byte()];
    if (!kind) throw new Error("Unknown definition kind");
    const fieldCount = r.varUint();
    const fields = [];
    for (let j = 0; j < fieldCount; j++) {
      fields.push({ name: r.string(), typeIndex: r.varInt(), isArray: r.byte() !== 0, value: r.varUint() });
    }
    raw.push({ name, kind, fields });
  }
  const schema: KiwiSchema = new Map();
  for (const d of raw) {
    schema.set(d.name, {
      name: d.name,
      kind: d.kind,
      fields: d.fields.map((f) => ({
        name: f.name,
        type: f.typeIndex < 0 ? (BUILTIN[~f.typeIndex] ?? "byte") : (raw[f.typeIndex]?.name ?? "byte"),
        isArray: f.isArray,
        value: f.value,
      })),
    });
  }
  return schema;
}

function readValue(r: Reader, type: string, schema: KiwiSchema, depth: number): unknown {
  switch (type) {
    case "bool":
      return r.byte() !== 0;
    case "byte":
      return r.byte();
    case "int":
      return r.varInt();
    case "uint":
      return r.varUint();
    case "float":
      return r.float();
    case "string":
      return r.string();
    case "int64": {
      const v = r.varInt64();
      return Number.isSafeInteger(Number(v)) ? Number(v) : v;
    }
    case "uint64": {
      const v = r.varUint64();
      return Number.isSafeInteger(Number(v)) ? Number(v) : v;
    }
  }
  if (depth > MAX_DEPTH) throw new Error("Data is nested too deeply");
  const def = schema.get(type);
  if (!def) throw new Error(`Unknown type ${type}`);
  if (def.kind === "ENUM") {
    const id = r.varUint();
    return def.fields.find((f) => f.value === id)?.name ?? id;
  }
  if (def.kind === "STRUCT") {
    const out: Record<string, unknown> = {};
    for (const f of def.fields) out[f.name] = readField(r, f, schema, depth + 1);
    return out;
  }
  const out: Record<string, unknown> = {};
  for (;;) {
    const id = r.varUint();
    if (id === 0) return out;
    const f = def.fields.find((x) => x.value === id);
    if (!f) throw new Error(`Unknown field ${id} in ${def.name}`);
    out[f.name] = readField(r, f, schema, depth + 1);
  }
}

function readField(r: Reader, f: KiwiField, schema: KiwiSchema, depth: number): unknown {
  if (!f.isArray) return readValue(r, f.type, schema, depth);
  const n = r.varUint();
  if (n > MAX_ITEMS) throw new Error("Array is too large");
  if (f.type === "byte") return r.raw(n);
  const out: unknown[] = [];
  for (let i = 0; i < n; i++) out.push(readValue(r, f.type, schema, depth));
  return out;
}

/** Decode `bytes` as a message of type `root` (Figma uses "Message"). */
export function decodeMessage(schema: KiwiSchema, bytes: Uint8Array, root = "Message"): Record<string, unknown> {
  return readValue(new Reader(bytes), root, schema, 0) as Record<string, unknown>;
}
