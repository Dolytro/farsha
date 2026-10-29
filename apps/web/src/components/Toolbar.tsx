import type { ReactElement } from "react";
import { useEditor, type Tool } from "../store";

const icon = (d: ReactElement) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const TOOLS: { id: Tool; label: string; key: string; icon: ReactElement }[] = [
  { id: "select", label: "Move", key: "V", icon: icon(<path d="M3.5 2.5l9 4-3.8 1.4-1.4 3.8z" fill="currentColor" />) },
  { id: "hand", label: "Hand tool", key: "H", icon: icon(<path d="M5.5 8V3.8a.9.9 0 011.8 0V7m0-3.7a.9.9 0 011.8 0V7m0-2.5a.9.9 0 011.8 0V9c0 2.5-1.5 4-3.7 4-1.7 0-2.6-.8-3.6-2.2L3 8.7a.9.9 0 011.4-1.1l1.1 1" />) },
  { id: "frame", label: "Frame", key: "F", icon: icon(<path d="M5 1.5v13M11 1.5v13M1.5 5h13M1.5 11h13" />) },
  { id: "rect", label: "Rectangle", key: "R", icon: icon(<rect x="2.5" y="3.5" width="11" height="9" rx="1" />) },
  { id: "ellipse", label: "Ellipse", key: "O", icon: icon(<circle cx="8" cy="8" r="5.5" />) },
  { id: "text", label: "Text", key: "T", icon: icon(<path d="M3 4V3h10v1M8 3v10M6 13h4" />) },
];

export function Toolbar() {
  const { tool, setTool } = useEditor();
  return (
    <div className="toolbar" role="toolbar" aria-label="Tools">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          className={`toolbar__btn${tool === t.id ? " toolbar__btn--active" : ""}`}
          onClick={() => setTool(t.id)}
          title={`${t.label} — ${t.key}`}
          aria-label={t.label}
          aria-pressed={tool === t.id}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
}
