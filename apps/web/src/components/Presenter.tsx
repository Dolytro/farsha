import { useEffect, useMemo, useState } from "react";
import { exportSvg } from "@canvylo/canvas-engine";
import { canvasMeasure } from "../text-layout";
import { followInteraction, hotspotsIn } from "../prototype";
import { useEditor } from "../store";

/** Full-screen prototype presentation: shows one frame at a time; clicking a linked layer follows its interaction. */
export function Presenter() {
  const start = useEditor((s) => s.presenting);
  const setPresenting = useEditor((s) => s.setPresenting);
  const doc = useEditor((s) => s.doc);
  const [current, setCurrent] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    setCurrent(start);
    setHistory([]);
  }, [start]);

  useEffect(() => {
    if (!start) return;
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setPresenting(null);
      } else if (e.key === "Backspace" || e.key === "ArrowLeft") {
        e.preventDefault();
        setHistory((h) => {
          const prev = h[h.length - 1];
          if (prev) setCurrent(prev);
          return prev ? h.slice(0, -1) : h;
        });
      }
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [start, setPresenting]);

  const frame = useMemo(() => (start && current && doc.hasNode(current) ? exportSvg(doc, [current], { measure: canvasMeasure }) : null), [doc, current, start]);
  const spots = useMemo(() => (start && current && doc.hasNode(current) ? hotspotsIn(doc, current) : []), [doc, current, start]);
  if (!start) return null;

  const scale = frame ? Math.min((size.w - 40) / frame.width, (size.h - 40) / frame.height, 4) : 1;
  const go = (interaction: (typeof spots)[number]["interaction"]) => {
    if (!current) return;
    const next = followInteraction(doc, current, history, interaction);
    if (!next) return;
    setCurrent(next.frame);
    setHistory(next.history);
  };

  return (
    <div className="presenter" role="dialog" aria-label="Prototype">
      <button className="presenter__close" onClick={() => setPresenting(null)} title="Exit (Esc)">
        ✕
      </button>
      {frame ? (
        <div className="presenter__stage" style={{ width: frame.width * scale, height: frame.height * scale }}>
          <div className="presenter__frame" style={{ width: frame.width, height: frame.height, transform: `scale(${scale})` }} dangerouslySetInnerHTML={{ __html: frame.svg }} />
          {spots.map((h) => (
            <div
              key={h.id}
              className="presenter__hotspot"
              style={{ left: h.box.x * scale, top: h.box.y * scale, width: h.box.width * scale, height: h.box.height * scale }}
              onClick={() => go(h.interaction)}
            />
          ))}
        </div>
      ) : (
        <p className="presenter__empty">This frame no longer exists.</p>
      )}
    </div>
  );
}
