import type { CSSProperties } from "react";

const TOOLS: [string, string, string, string][] = [
  ["Move", "V", "M6 4l12 6-5 1.5L11 17z", "#4da3ff"],
  ["Rectangle", "R", "M5 6h14v12H5z", "#ff7a3d"],
  ["Ellipse", "O", "M12 5a7 7 0 100 14 7 7 0 000-14z", "#ffb020"],
  ["Text", "T", "M6 6h12M12 6v13", "#2de2c8"],
  ["Frame", "F", "M8 3v18M16 3v18M3 8h18M3 16h18", "#8a6bff"],
  ["Pen", "P", "M4 20l4-1 11-11-3-3L5 16zM14 7l3 3", "#4da3ff"],
  ["Scale", "K", "M5 19V9h10v10zM15 5h4v4M19 5l-6 6", "#4da3ff"],
  ["Line", "L", "M5 19L19 5", "#2de2c8"],
  ["Auto layout", "Shift+A", "M4 6h16M4 12h16M4 18h16", "#ff4fa3"],
  ["Components", "Ctrl+Alt+K", "M12 3l4 4-4 4-4-4zM12 13l4 4-4 4-4-4z", "#4da3ff"],
  ["Prototype", "Shift+E", "M6 6h4v4H6zM14 14h4v4h-4zM10 8h4a2 2 0 012 2v4", "#8a6bff"],
  ["Variables", "Ctrl+K", "M12 4a8 8 0 100 16 8 8 0 000-16zM12 4v16", "#4da3ff"],
];

/** The twelve tool tiles. Each tile takes its colour from --c (and a soft version of it from --c-soft). */
export function ToolTiles() {
  return (
    <>
      {TOOLS.map(([name, key, path, color], i) => (
        <div key={name} className="site-parity__tile" style={{ "--i": i, "--c": color, "--c-soft": `${color}22` } as CSSProperties}>
          <span className="site-parity__tile-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={path} />
            </svg>
          </span>
          <span>{name}</span>
          <span className="site-parity__tile-key">{key}</span>
        </div>
      ))}
    </>
  );
}
