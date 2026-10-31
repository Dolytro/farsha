import { useEffect, useMemo, useRef, useState } from "react";
import type { Interaction } from "@canvylo/types";
import { exportSvg } from "@canvylo/canvas-engine";
import { canvasMeasure } from "../text-layout";
import { followInteraction, hotspotsIn, overlayTarget, safeUrl, stageLayout, timedAndKeyIn, transitionAnimation } from "../prototype";
import { useEditor } from "../store";

/** Full-screen prototype presentation: shows one frame at a time; layers with interactions react to clicks, hovering, time and keys. */
export function Presenter() {
  const start = useEditor((s) => s.presenting);
  const setPresenting = useEditor((s) => s.setPresenting);
  const showToast = useEditor((s) => s.showToast);
  const device = useEditor((s) => s.presentDevice);
  const doc = useEditor((s) => s.doc);
  const [current, setCurrent] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [overlay, setOverlay] = useState<string | null>(null);
  const dragFrom = useRef<{ x: number; y: number } | null>(null);
  const [transition, setTransition] = useState<{ name: string; durationMs: number; n: number } | null>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    setCurrent(start);
    setHistory([]);
    setTransition(null);
    setOverlay(null);
  }, [start]);

  const frame = useMemo(() => (start && current && doc.hasNode(current) ? exportSvg(doc, [current], { measure: canvasMeasure }) : null), [doc, current, start]);
  const spots = useMemo(() => (start && current && doc.hasNode(current) ? hotspotsIn(doc, current) : []), [doc, current, start]);
  const overlayFrame = useMemo(() => (start && overlay && doc.hasNode(overlay) ? exportSvg(doc, [overlay], { measure: canvasMeasure }) : null), [doc, overlay, start]);
  const overlaySpots = useMemo(() => (start && overlay && doc.hasNode(overlay) ? hotspotsIn(doc, overlay) : []), [doc, overlay, start]);
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
    if (interaction.action.type === "CLOSE_OVERLAY") {
      setOverlay(null);
      return;
    }
    const toOpen = overlayTarget(doc, overlay ?? current, interaction);
    if (toOpen) {
      setOverlay(toOpen);
      return;
    }
    const next = followInteraction(doc, current, history, interaction);
    if (!next) return;
    setOverlay(null);
    const anim = transitionAnimation(interaction.transition);
    setTransition(anim ? { ...anim, n: Date.now() } : null);
    setCurrent(next.frame);
    setHistory(next.history);
  };

  /** Mouse handlers of a hotspot: click, hover, or a drag of more than 10 pixels. */
  const spotEvents = (interaction: Interaction) => {
    if (interaction.trigger === "ON_CLICK") return { onClick: () => run(interaction) };
    if (interaction.trigger === "ON_HOVER") return { onMouseEnter: () => run(interaction) };
    if (interaction.trigger === "ON_DRAG") {
      return {
        onPointerDown: (e: React.PointerEvent) => {
          dragFrom.current = { x: e.clientX, y: e.clientY };
        },
        onPointerUp: (e: React.PointerEvent) => {
          const from = dragFrom.current;
          dragFrom.current = null;
          if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) > 10) run(interaction);
        },
      };
    }
    return {};
  };

  useEffect(() => {
    if (!start) return;
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (overlay) setOverlay(null);
        else setPresenting(null);
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
  }, [start, setPresenting, auto, current, history, overlay]);

  // After-delay interactions start when their frame appears.
  useEffect(() => {
    if (!start) return;
    const timers = auto.filter((a) => a.interaction.trigger === "AFTER_DELAY").map((a) => setTimeout(() => run(a.interaction), Math.max(0, a.interaction.delayMs ?? 0)));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, auto, current]);

  if (!start) return null;

  const currentNode = current ? doc.getNode(current) : undefined;
  const scrolls = currentNode?.type === "FRAME" && currentNode.overflowScroll === "VERTICAL";
  const { scale, stageHeight } = frame ? stageLayout(frame, size, scrolls) : { scale: 1, stageHeight: 0 };

  return (
    <div className="presenter" role="dialog" aria-label="Prototype">
      <button className="presenter__close" onClick={() => setPresenting(null)} title="Exit (Esc)">
        ✕
      </button>
      {frame ? (
        <div
          key={transition?.n ?? 0}
          className={`presenter__stage${device !== "none" ? ` presenter__stage--${device}` : ""}`}
          style={{ width: frame.width * scale, height: stageHeight, animation: transition ? `${transition.name} ${transition.durationMs}ms ease both` : undefined }}
        >
          <div className="presenter__scroll" style={{ height: stageHeight, overflowY: scrolls ? "auto" : "hidden" }}>
          <div style={{ position: "relative", width: frame.width * scale, height: frame.height * scale }}>
          <div className="presenter__frame" style={{ width: frame.width, height: frame.height, transform: `scale(${scale})` }} dangerouslySetInnerHTML={{ __html: frame.svg }} />
          {spots.map((h, i) => (
            <div
              key={`${h.id}-${i}`}
              className="presenter__hotspot"
              style={{ left: h.box.x * scale, top: h.box.y * scale, width: h.box.width * scale, height: h.box.height * scale }}
              {...spotEvents(h.interaction)}
            />
          ))}
          </div>
          </div>
          {overlayFrame && (
            <div className="presenter__overlay" onClick={() => setOverlay(null)}>
              <div
                className="presenter__overlay-frame"
                style={{ width: overlayFrame.width * scale, height: overlayFrame.height * scale }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="presenter__frame" style={{ width: overlayFrame.width, height: overlayFrame.height, transform: `scale(${scale})` }} dangerouslySetInnerHTML={{ __html: overlayFrame.svg }} />
                {overlaySpots.map((h, i) => (
                  <div
                    key={`o-${h.id}-${i}`}
                    className="presenter__hotspot"
                    style={{ left: h.box.x * scale, top: h.box.y * scale, width: h.box.width * scale, height: h.box.height * scale }}
                    {...spotEvents(h.interaction)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="presenter__empty">This frame no longer exists.</p>
      )}
    </div>
  );
}
