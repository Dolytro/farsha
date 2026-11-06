import { useEffect, useMemo, useRef, useState } from "react";
import type { Easing, Interaction, OverlayPosition } from "@farsha/types";
import { exportSvg } from "@farsha/canvas-engine";
import { canvasMeasure } from "../text-layout";
import { easingFn, followInteraction, hotspotsIn, layerBoxIn, overlayTarget, safeUrl, stageLayout, videosIn, timedAndKeyIn, transitionAnimation } from "../prototype";
import { frameAt, matchLayers, scratchCopy } from "../smart-animate";
import { videoUrl } from "../video";
import { useEditor } from "../store";

/** Full-screen prototype presentation: shows one frame at a time; layers with interactions react to clicks, hovering, time and keys. */
export function Presenter() {
  const start = useEditor((s) => s.presenting);
  const setPresenting = useEditor((s) => s.setPresenting);
  const showToast = useEditor((s) => s.showToast);
  const device = useEditor((s) => s.presentDevice);
  const background = useEditor((s) => s.presentBackground);
  const zoom = useEditor((s) => s.presentScale);
  const doc = useEditor((s) => s.doc);
  const [current, setCurrent] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [hints, setHints] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [overlay, setOverlay] = useState<string | null>(null);
  const [tween, setTween] = useState<{ svg: string; width: number; height: number } | null>(null);
  const tweenRun = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overlayCfg, setOverlayCfg] = useState<{ dim: boolean; closeOnOutside: boolean; position: OverlayPosition }>({ dim: true, closeOnOutside: true, position: "CENTER" });
  const dragFrom = useRef<{ x: number; y: number } | null>(null);
  const [transition, setTransition] = useState<{ name: string; durationMs: number; timing: string; n: number } | null>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  // variable modes switched by "Set variable mode" are only for the presentation: the file's own mode comes back afterwards
  const [modeTick, setModeTick] = useState(0);
  const startMode = useRef<string | null>(null);
  const restoreMode = () => {
    if (startMode.current && doc.activeModeId() !== startMode.current) {
      try {
        doc.setActiveMode(startMode.current);
      } catch {
        // the mode was deleted meanwhile: nothing to restore
      }
      setModeTick((n) => n + 1);
    }
  };
  useEffect(() => {
    if (!start) return;
    startMode.current = doc.activeModeId();
    return () => {
      restoreMode();
      startMode.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  useEffect(() => {
    setCurrent(start);
    setHistory([]);
    setTransition(null);
    setOverlay(null);
    tweenRun.current++;
    setTween(null);
  }, [start]);

  const frame = useMemo(() => (start && current && doc.hasNode(current) ? exportSvg(doc, [current], { measure: canvasMeasure }) : null), [doc, current, start, modeTick]);
  const spots = useMemo(() => (start && current && doc.hasNode(current) ? hotspotsIn(doc, current) : []), [doc, current, start]);
  const overlayFrame = useMemo(() => (start && overlay && doc.hasNode(overlay) ? exportSvg(doc, [overlay], { measure: canvasMeasure }) : null), [doc, overlay, start, modeTick]);
  const overlaySpots = useMemo(() => (start && overlay && doc.hasNode(overlay) ? hotspotsIn(doc, overlay) : []), [doc, overlay, start]);
  const videos = useMemo(() => (start && current && doc.hasNode(current) ? videosIn(doc, current) : []), [doc, current, start]);
  const auto = useMemo(() => (start && current && doc.hasNode(current) ? timedAndKeyIn(doc, current) : []), [doc, current, start]);

  /** Smart animate: tween the paired layers of the next frame from where they were in this one. */
  const startTween = (from: string, to: string, durationMs: number, easing?: Easing) => {
    const ease = easingFn(easing);
    const pairs = matchLayers(doc, from, to);
    const run = ++tweenRun.current;
    if (!pairs.length) return;
    const scratch = scratchCopy(doc);
    const total = Math.min(5000, Math.max(50, durationMs || 300));
    const t0 = performance.now();
    const step = (now: number) => {
      if (tweenRun.current !== run) return;
      const p = Math.min(1, (now - t0) / total);
      setTween(p >= 1 ? null : frameAt(scratch, to, pairs, p, ease));
      if (p < 1) requestAnimationFrame(step);
    };
    setTween(frameAt(scratch, to, pairs, 0, ease));
    requestAnimationFrame(step);
  };

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
    if (interaction.action.type === "SET_MODE") {
      try {
        doc.setActiveMode(interaction.action.modeId);
        setModeTick((n) => n + 1);
      } catch {
        showToast("That variable mode no longer exists");
      }
      return;
    }
    if (interaction.action.type === "SCROLL_TO") {
      const box = layerBoxIn(doc, current, interaction.action.targetId);
      if (box && scrollRef.current) scrollRef.current.scrollTo({ top: box.y * scale, left: box.x * scale, behavior: "smooth" });
      else showToast("The layer to scroll to is not in this frame");
      return;
    }
    const toOpen = overlayTarget(doc, overlay ?? current, interaction);
    if (toOpen) {
      const a = interaction.action;
      setOverlay(toOpen);
      setOverlayCfg(a.type === "OPEN_OVERLAY" || a.type === "SWAP_OVERLAY" ? { dim: a.dim !== false, closeOnOutside: a.closeOnOutside !== false, position: a.position ?? "CENTER" } : { dim: true, closeOnOutside: true, position: "CENTER" });
      return;
    }
    const next = followInteraction(doc, current, history, interaction);
    if (!next) return;
    setOverlay(null);
    tweenRun.current++;
    setTween(null);
    if (interaction.transition?.type === "SMART_ANIMATE") startTween(current, next.frame, interaction.transition.durationMs, interaction.transition.easing);
    const anim = transitionAnimation(interaction.transition);
    setTransition(anim ? { ...anim, n: Date.now() } : null);
    setCurrent(next.frame);
    setHistory(next.history);
  };

  /** Mouse handlers of a hotspot: click, hover, or a drag of more than 10 pixels. */
  const spotEvents = (interaction: Interaction) => {
    if (interaction.trigger === "ON_CLICK") return { onClick: () => run(interaction) };
    if (interaction.trigger === "ON_HOVER" || interaction.trigger === "ON_MOUSE_ENTER") return { onMouseEnter: () => run(interaction) };
    if (interaction.trigger === "ON_MOUSE_LEAVE") return { onMouseLeave: () => run(interaction) };
    if (interaction.trigger === "ON_MOUSE_DOWN") return { onPointerDown: () => run(interaction) };
    if (interaction.trigger === "ON_MOUSE_UP") return { onPointerUp: () => run(interaction) };
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
      if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Figma: R restarts the prototype from its starting frame
        e.preventDefault();
        restoreMode();
        setCurrent(start);
        setHistory([]);
        setOverlay(null);
        setTransition(null);
        tweenRun.current++;
        setTween(null);
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
  const scrollMode = currentNode?.type === "FRAME" && currentNode.overflowScroll ? currentNode.overflowScroll : "NONE";
  const shown = tween ?? frame;
  const { scale, stageWidth, stageHeight } = frame ? stageLayout(frame, size, scrollMode, zoom) : { scale: 1, stageWidth: 0, stageHeight: 0 };

  return (
    <div className="presenter" role="dialog" aria-label="Prototype" style={{ background }}>
      <button className="presenter__close" onClick={() => setPresenting(null)} title="Exit (Esc)">
        ✕
      </button>
      {frame ? (
        <div
          key={transition?.n ?? 0}
          className={`presenter__stage${device !== "none" ? ` presenter__stage--${device}` : ""}`}
          onClick={(e) => {
            // Figma flashes the clickable areas when a click hits nothing
            if ((e.target as HTMLElement).closest(".presenter__hotspot")) return;
            setHints(true);
            clearTimeout(hintTimer.current);
            hintTimer.current = setTimeout(() => setHints(false), 700);
          }}
          style={{ width: stageWidth, height: stageHeight, animation: transition ? `${transition.name} ${transition.durationMs}ms ${transition.timing} both` : undefined }}
        >
          <div className="presenter__scroll" ref={scrollRef} style={{ height: stageHeight, width: stageWidth, overflowY: scrollMode === "VERTICAL" || scrollMode === "BOTH" ? "auto" : "hidden", overflowX: scrollMode === "HORIZONTAL" || scrollMode === "BOTH" ? "auto" : "hidden" }}>
          <div style={{ position: "relative", width: frame.width * scale, height: frame.height * scale }}>
          <div className="presenter__frame" style={{ width: frame.width, height: frame.height, transform: `scale(${scale})` }} dangerouslySetInnerHTML={{ __html: shown!.svg }} />
          {videos.map((v) => {
            const src = videoUrl(doc, v.assetId);
            return src ? (
              <video key={`video-${v.id}`} src={src} autoPlay muted loop playsInline controls style={{ position: "absolute", left: v.box.x * scale, top: v.box.y * scale, width: v.box.width * scale, height: v.box.height * scale, objectFit: "cover", background: "#000" }} />
            ) : null;
          })}
          {spots.map((h, i) => (
            <div
              key={`${h.id}-${i}`}
              className={`presenter__hotspot${hints ? " presenter__hotspot--hint" : ""}`}
              style={{ left: h.box.x * scale, top: h.box.y * scale, width: h.box.width * scale, height: h.box.height * scale }}
              {...spotEvents(h.interaction)}
            />
          ))}
          </div>
          </div>
          {overlayFrame && (
            <div className={`presenter__overlay presenter__overlay--${overlayCfg.position.toLowerCase()}`} style={{ background: overlayCfg.dim ? undefined : "transparent" }} onClick={() => overlayCfg.closeOnOutside && setOverlay(null)}>
              <div
                className="presenter__overlay-frame"
                style={{ width: overlayFrame.width * scale, height: overlayFrame.height * scale }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="presenter__frame" style={{ width: overlayFrame.width, height: overlayFrame.height, transform: `scale(${scale})` }} dangerouslySetInnerHTML={{ __html: overlayFrame.svg }} />
                {overlaySpots.map((h, i) => (
                  <div
                    key={`o-${h.id}-${i}`}
                    className={`presenter__hotspot${hints ? " presenter__hotspot--hint" : ""}`}
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
