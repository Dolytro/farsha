import type { CSSProperties } from "react";
import { Butterfly } from "./butterfly";
import { TRAIL_DOTS } from "./trail";

type Props = {
  /** Fades the loader out; the parent removes it once the transition has ended. */
  hidden?: boolean;
  /** Called after the fade-out finished. */
  onHidden?: () => void;
};

export function ButterflyLoader({ hidden = false, onHidden }: Props) {
  return (
    <div
      className={`loader${hidden ? " loader--hidden" : ""}`}
      role="status"
      aria-label="Loading Farsha"
      onTransitionEnd={(e) => {
        if (hidden && e.target === e.currentTarget) onHidden?.();
      }}
    >
      <div className="loader__dots" />
      <i className="loader__orbit loader__orbit--iris" />
      <i className="loader__orbit loader__orbit--pink" />
      <i className="loader__orbit loader__orbit--aqua" />
      <div className="loader__stage">
        {TRAIL_DOTS.map((d, i) => (
          <i
            key={i}
            className="loader__trail"
            style={{ "--i": i, "--dd": `${d.delay.toFixed(2)}s`, background: d.color, width: d.size, height: d.size } as CSSProperties}
          />
        ))}
        <div className="loader__flyer">
          <div className="loader__sway-x">
            <div className="loader__sway-y">
              <Butterfly p="fly-" />
            </div>
          </div>
        </div>
        <div className="loader__ring" />
        <div className="loader__perched">
          <Butterfly p="perch-" />
        </div>
        <svg className="loader__logo" viewBox="0 0 64 64" role="img" aria-label="Farsha">
          <defs>
            <linearGradient id="loader-flt" gradientUnits="userSpaceOnUse" x1="28.6" y1="0" x2="47.4" y2="0">
              <stop offset="0" stopColor="#6c8cf5" />
              <stop offset=".5" stopColor="#3fb9e0" />
              <stop offset="1" stopColor="#2de2c8" />
            </linearGradient>
            <linearGradient id="loader-flm" gradientUnits="userSpaceOnUse" x1="16.6" y1="0" x2="35.4" y2="0">
              <stop offset="0" stopColor="#c06fe0" />
              <stop offset=".55" stopColor="#ff9a6a" />
              <stop offset="1" stopColor="#ffb020" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="52" height="52" rx="2" fill="#0e0d14" stroke="#7c5cff" strokeWidth="1.8" />
          <circle cx="20" cy="15" r="3.4" fill="#6c8cf5" />
          <rect x="28.6" y="11.6" width="18.8" height="6.8" rx="3.4" fill="url(#loader-flt)" />
          <circle cx="20" cy="24" r="3.4" fill="#8a6bff" />
          <circle cx="32" cy="24" r="1.5" fill="#4a4470" />
          <circle cx="44" cy="24" r="1.5" fill="#4a4470" />
          <rect x="16.6" y="29.6" width="18.8" height="6.8" rx="3.4" fill="url(#loader-flm)" />
          <circle cx="32" cy="42" r="1.5" fill="#4a4470" />
          <circle cx="44" cy="42" r="1.5" fill="#4a4470" />
          <circle cx="20" cy="42" r="3.4" fill="#f2658f" />
          <circle cx="20" cy="51" r="3.4" fill="#ff5e4d" />
          <circle cx="32" cy="51" r="1.5" fill="#4a4470" />
          <circle cx="44" cy="51" r="1.5" fill="#4a4470" />
          {[2, 54].flatMap((x) =>
            [2, 54].map((y) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="8" height="8" rx="1.4" fill="#fff" stroke="#7c5cff" strokeWidth="1.6" />
            )),
          )}
        </svg>
        <div className="loader__wordmark">Farsha</div>
        <div className="loader__progress">
          <div className="loader__bar">
            <i className="loader__bar-fill" />
          </div>
          <div className="loader__percent" />
        </div>
      </div>
    </div>
  );
}
