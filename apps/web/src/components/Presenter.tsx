import { useEffect, useMemo, useState } from "react";
import type { Interaction } from "@canvylo/types";
import { exportSvg } from "@canvylo/canvas-engine";
import { canvasMeasure } from "../text-layout";
import { followInteraction, hotspotsIn, safeUrl, timedAndKeyIn, transitionAnimation } from "../prototype";
import { useEditor } from "../store";

/** Full-screen prototype presentation: shows one frame at a time; layers with interactions react to clicks, hovering, time and keys. */
export function Presenter() {
  const start = useEditor((s) => s.presenting);
  const setPresenting = useEditor((s) => s.setPresenting);
  const showToast = useEditor((s) => s.showToast);
  const doc = useEditor((s) => s.doc);
  const [current, setCurrent] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [transition, setTransition] = useState<{ name: string; durationMs: number; n: number } | null>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    setCurrent(start);
    setHistory([]);
    setTransition(null);
  }, [start]);

  const frame = useMemo(() => (start && current && doc.hasNode(current) ? exportSvg(doc, [current], { measure: canvasMeasure }) : null), [doc, current, start]);
  const spots = useMemo(() => (start && current && doc.hasNode(current) ? hotspotsIn(doc, current) : []), [doc, current, start]);
  const auto = useMemo(() => (start && current && doc.hasNode(current) ? timedAndKeyIn(doc, current) : []), [doc, current, start]);

  /** Run an interaction: open its address, or change frame with its transition. */
  const run = (interaction: Interaction) => {
    if (!current) return;
    if (interaction.action.type === "OPEN_URL") {
      const url = safeUrl(interaction.action.url);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else showToast("This prototype link is not a web address");
      return;
    }
    const next = followInteraction(doc, current, history, interaction);
    if (!next) return;
    const anim = transitionAnimation(interaction.transition);
    setTransition(anim ? { ...anim, n: Date.now() } : null);
    setCurrent(next.frame);
    setHistory(next.history);
  };

  useEffect(() => {
    if (!start) return;
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setPresenting(null);
        return;
      }
      const bound = auto.find((a) => a.interaction.trigger === "ON_KEY" && a.interaction.key === e.key);
      if (bound) {
        e.preventDefault();
        run(bound.interaction);
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
    // run reads current state; it is recreated with the frame, as are the key bindings
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, setPresenting, auto, current, history]);

  // After-delay interactions start when their frame appears.
  useEffect(() => {
    if (!start) return;
    const timers = auto.filter((a) => a.interaction.trigger === "AFTER_DELAY").map((a) => setTimeout(() => run(a.interaction), Math.max(0, a.interaction.delayMs ?? 0)));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, auto, current]);

  if (!start) return null;

  const scale = frame ? Math.min((size.w - 40) / frame.width, (size.h - 40) / frame.height, 4) : 1;

  return (
    <div className="presenter" role="dialog" aria-label="Prototype">
      <button className="presenter__close" onClick={() => setPresenting(null)} title="Exit (Esc)">
        ✕
      </button>
      {frame ? (
        <div
          key={transition?.n ?? 0}
          className="presenter__stage"
          style={{ width: frame.width * scale, height: frame.height * scale, animation: transition ? `${transition.name} ${transition.durationMs}ms ease both` : undefined }}
        >
          <div className="presenter__frame" style={{ width: frame.width, height: frame.height, transform: `scale(${scale})` }} dangerouslySetInnerHTML={{ __html: frame.svg }} />
          {spots.map((h, i) => (
            <div
              key={`${h.id}-${i}`}
              className="presenter__hotspot"
              style={{ left: h.box.x * scale, top: h.box.y * scale, width: h.box.width * scale, height: h.box.height * scale }}
              onClick={h.interaction.trigger === "ON_CLICK" ? () => run(h.interaction) : undefined}
              onMouseEnter={h.interaction.trigger === "ON_HOVER" ? () => run(h.interaction) : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="presenter__empty">This frame no longer exists.</p>
      )}
    </div>
  );
}
