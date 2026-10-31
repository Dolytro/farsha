export interface FramePreset {
  group: string;
  name: string;
  width: number;
  height: number;
}

const g = (group: string, items: [string, number, number][]): FramePreset[] => items.map(([name, width, height]) => ({ group, name, width, height }));

/** Device and paper sizes for a new or resized frame, like the list behind Figma's frame header. */
export const FRAME_PRESETS: FramePreset[] = [
  ...g("Phone", [
    ["iPhone Duo, Closed", 466, 678],
    ["iPhone Duo, Open", 890, 626],
    ["iPhone 18 Pro", 402, 874],
    ["iPhone 18 Pro Max", 440, 956],
    ["iPhone 17", 402, 874],
    ["iPhone 16 & 17 Pro", 402, 874],
    ["iPhone 16", 393, 852],
    ["iPhone 16 & 17 Pro Max", 440, 956],
    ["iPhone 16 Plus", 430, 932],
    ["iPhone Air", 420, 912],
    ["iPhone 14 & 15 Pro Max", 430, 932],
    ["iPhone 14 & 15 Pro", 393, 852],
    ["iPhone 13 & 14", 390, 844],
    ["iPhone 14 Plus", 428, 926],
    ["Android Compact", 412, 917],
    ["Android Medium", 700, 840],
  ]),
  ...g("Tablet", [
    ["iPad mini 8.3", 744, 1133],
    ["Surface Pro 8", 1440, 960],
    ['iPad Pro 11"', 834, 1194],
    ['iPad Pro 12.9"', 1024, 1366],
    ["Android Expanded", 1280, 800],
  ]),
  ...g("Desktop", [
    ["MacBook Air", 1280, 832],
    ['MacBook Pro 14"', 1512, 982],
    ['MacBook Pro 16"', 1728, 1117],
    ["Desktop", 1440, 1024],
    ["Wireframes", 1440, 1024],
    ["TV", 1280, 720],
  ]),
  ...g("Presentation", [
    ["Slide 16:9", 1920, 1080],
    ["Slide 4:3", 1024, 768],
  ]),
  ...g("Watch", [
    ["Apple Watch Series 10 42mm", 187, 223],
    ["Apple Watch Series 10 46mm", 208, 248],
    ["Apple Watch 41mm", 176, 215],
    ["Apple Watch 45mm", 198, 242],
    ["Apple Watch 44mm", 184, 224],
    ["Apple Watch 40mm", 162, 197],
  ]),
  ...g("Paper", [
    ["A4", 595, 842],
    ["A5", 420, 595],
    ["A6", 297, 420],
    ["Letter", 612, 792],
    ["Tabloid", 792, 1224],
  ]),
];

/** The preset whose size a frame has now (either orientation counts as the same device), if any. */
export function presetOf(width: number, height: number): FramePreset | undefined {
  const w = Math.round(width);
  const h = Math.round(height);
  return FRAME_PRESETS.find((p) => p.width === w && p.height === h);
}

/** The label of a preset: "Phone · iPhone 16 (393 × 852)". */
export const presetLabel = (p: FramePreset): string => `${p.group} · ${p.name} (${p.width} × ${p.height})`;
