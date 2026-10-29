import type { DesignDoc } from "@canvylo/design-core";

/**
 * Sample content: two screens from the "ThemeForest UI Redesign" Figma file
 * (10 · Sign in, 11 · Create account), rebuilt with Canvylo nodes.
 * Imagery is replaced by placeholder tiles.
 */

const paint = (color: string, opacity = 1) => [{ type: "SOLID" as const, color, opacity }];

const GREEN = "#84d63a";
const INK = "#111111";
const MUTED = "#666666";
const LINE = "#d6d6d6";

interface Ctx {
  doc: DesignDoc;
}

function rect(c: Ctx, parent: string, name: string, x: number, y: number, width: number, height: number, fill: string, opts: { r?: number; stroke?: string } = {}) {
  return c.doc.createNode("RECTANGLE", {
    parentId: parent,
    props: {
      name,
      x,
      y,
      width,
      height,
      fills: paint(fill),
      cornerRadius: opts.r ?? 0,
      strokes: opts.stroke ? paint(opts.stroke) : [],
      strokeWidth: 1,
    },
  });
}

function text(c: Ctx, parent: string, x: number, y: number, characters: string, size: number, weight: number, color: string, width = 400, textAlign: "LEFT" | "CENTER" = "LEFT") {
  return c.doc.createNode("TEXT", {
    parentId: parent,
    props: {
      name: characters,
      x,
      y,
      width,
      height: Math.round(size * 1.4),
      characters,
      fontSize: size,
      fontWeight: weight,
      textAlign,
      fills: paint(color),
    },
  });
}

function header(c: Ctx, frame: string) {
  rect(c, frame, "Header", 0, 0, 1440, 56, INK);
  rect(c, frame, "Logo mark", 48, 14, 28, 28, GREEN, { r: 8 });
  text(c, frame, 56, 18, "e", 18, 700, INK, 14);
  text(c, frame, 88, 14, "envato", 20, 600, "#ffffff", 80);
  text(c, frame, 160, 14, "market", 20, 400, "#a3a3a3", 80);
}

function collage(c: Ctx, frame: string) {
  rect(c, frame, "Hero panel", 720, 56, 720, 844, "#0e0e0e");
  const colors = ["#2b2f77", "#6b3fa0", "#1e5f74", "#8a3b3b", "#2e7d4f", "#c27c2c"];
  colors.forEach((color, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    rect(c, frame, `Preview ${i + 1}`, 770 + col * 320, 120 + row * 200, 300, 180, color, { r: 12 });
  });
  rect(c, frame, "Caption line 1", 770, 740, 420, 14, "#ffffff");
  rect(c, frame, "Caption line 2", 770, 770, 280, 12, "#6b6b6b");
}

function outlineButton(c: Ctx, frame: string, y: number, label: string) {
  rect(c, frame, `${label} button`, 160, y, 400, 44, "#ffffff", { r: 8, stroke: INK });
  text(c, frame, 160, y + 13, label, 14, 500, INK, 400, "CENTER");
}

function authScreen(
  c: Ctx,
  page: string,
  opts: { name: string; x: number; title: string; subtitle: string; fields: { label: string; placeholder: string }[]; checkbox: string; link?: string; cta: string; footer: string },
) {
  const frame = c.doc.createNode("FRAME", {
    parentId: page,
    props: { name: opts.name, x: opts.x, y: 0, width: 1440, height: 900, fills: paint("#ffffff") },
  });
  header(c, frame);
  collage(c, frame);

  text(c, frame, 160, 130, opts.title, 36, 600, INK, 400);
  text(c, frame, 160, 184, opts.subtitle, 14, 400, MUTED, 400);

  let y = 232;
  for (const f of opts.fields) {
    text(c, frame, 160, y, f.label, 13, 500, INK, 400);
    rect(c, frame, `${f.label} input`, 160, y + 22, 400, 44, "#ffffff", { r: 8, stroke: LINE });
    text(c, frame, 176, y + 35, f.placeholder, 14, 400, "#9a9a9a", 360);
    y += 80;
  }

  rect(c, frame, "Checkbox", 160, y + 2, 16, 16, "#ffffff", { r: 3, stroke: "#8a8a8a" });
  text(c, frame, 184, y, opts.checkbox, 14, 400, INK, 220);
  if (opts.link) text(c, frame, 420, y, opts.link, 14, 500, INK, 140);
  y += 36;

  rect(c, frame, "Primary button", 160, y, 400, 44, GREEN, { r: 8 });
  text(c, frame, 160, y + 13, opts.cta, 14, 600, INK, 400, "CENTER");
  y += 76;

  rect(c, frame, "Divider left", 160, y + 8, 180, 1, LINE);
  text(c, frame, 350, y, "or", 13, 400, MUTED, 20, "CENTER");
  rect(c, frame, "Divider right", 380, y + 8, 180, 1, LINE);
  y += 32;

  outlineButton(c, frame, y, "Continue with Google");
  outlineButton(c, frame, y + 56, "Continue with Apple");
  text(c, frame, 160, y + 128, opts.footer, 14, 400, MUTED, 400);
}

export function seedThemeForest(doc: DesignDoc, pageId: string): void {
  const c: Ctx = { doc };
  authScreen(c, pageId, {
    name: "10 · Sign in",
    x: 0,
    title: "Sign in",
    subtitle: "Use your Envato account to continue to ThemeForest.",
    fields: [
      { label: "Email or username", placeholder: "you@example.com" },
      { label: "Password", placeholder: "Password" },
    ],
    checkbox: "Remember me",
    link: "Forgot password?",
    cta: "Sign in",
    footer: "New here? Create an account",
  });
  authScreen(c, pageId, {
    name: "11 · Create account",
    x: 1560,
    title: "Create account",
    subtitle: "Join Envato to buy and download items.",
    fields: [
      { label: "Email", placeholder: "you@example.com" },
      { label: "Username", placeholder: "Choose a username" },
      { label: "Password", placeholder: "Password" },
    ],
    checkbox: "I agree to the Terms",
    cta: "Create account",
    footer: "Already have an account? Sign in",
  });
}
