import type { CSSProperties, ReactNode } from "react";

/**
 * The editor picture in the hero: a believable Farsha session (layers, a design on the canvas with a selection and
 * a measurement, two collaborators, a comment, the property panel). Sizes are written in pixels of a 695 px wide
 * mockup and converted to container units so it scales with the page.
 */
const P = (n: number) => `${(n / 6.95).toFixed(3)}cqw`;

const MONO = "'Geist Mono', monospace";
const LINE = "#262046";
const MUTED = "#a29cba";
const IRIS = "#7c5cff";

type Box = { x: number; y: number; w: number; h: number };
const abs = ({ x, y, w, h }: Box, extra: CSSProperties = {}): CSSProperties => ({ position: "absolute", left: P(x), top: P(y), width: P(w), height: P(h), ...extra });

function Icon({ d, size = 9, color = MUTED, fill = "none" }: { d: string; size?: number; color?: string; fill?: string }) {
  return (
    <svg width={P(size)} height={P(size)} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  frame: "M8 3v18M16 3v18M3 8h18M3 16h18",
  text: "M6 6h12M12 6v13",
  rect: "M5 6h14v12H5z",
  ellipse: "M12 5a7 7 0 100 14 7 7 0 000-14z",
  pen: "M4 20l4-1 11-11-3-3L5 16z",
  move: "M6 4l12 6-5 1.5L11 17z",
  comment: "M4 5h16v11H9l-5 4z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z",
};

function Row({ icon, name, depth = 0, selected = false, dim = false }: { icon: keyof typeof ICONS; name: string; depth?: number; selected?: boolean; dim?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: P(6), height: P(20), padding: `0 ${P(6)} 0 ${P(6 + depth * 12)}`, borderRadius: P(5), background: selected ? "#3a2f7a" : "transparent", color: selected ? "#fff" : dim ? MUTED : "#d8d3ee", fontSize: P(10.5), whiteSpace: "nowrap" }}>
      <Icon d={ICONS[icon]} size={9} color={selected ? "#cbbfff" : "#8d87a6"} />
      <span>{name}</span>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: MONO, fontSize: P(8), letterSpacing: ".1em", color: MUTED, padding: `${P(8)} ${P(8)} ${P(3)}` }}>{children}</div>;
}

function Field({ k, v, w }: { k: string; v: string; w?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: P(5), height: P(20), padding: `0 ${P(7)}`, borderRadius: P(5), background: "#1e1a36", fontSize: P(10), width: w ? P(w) : undefined, flex: w ? undefined : 1 }}>
      <span style={{ color: MUTED }}>{k}</span>
      <span style={{ fontFamily: MONO }}>{v}</span>
    </div>
  );
}

function Cursor({ x, y, color, name }: { x: number; y: number; color: string; name: string }) {
  return (
    <div style={{ position: "absolute", left: P(x), top: P(y) }}>
      <svg width={P(11)} height={P(13)} viewBox="0 0 11 13" aria-hidden="true">
        <path d="M0 0l10 5.2-4.2 1.2L3.8 12z" fill={color} stroke="#0e0d14" strokeWidth=".8" strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", left: P(10), top: P(9), padding: `${P(1.5)} ${P(6)}`, borderRadius: P(8), background: color, color: "#0e0d14", fontSize: P(8.5), fontWeight: 600, whiteSpace: "nowrap" }}>{name}</div>
    </div>
  );
}

export function HeroMockup() {
  const canvasX = 158;
  return (
    <>
      {/* left: layers */}
      <div style={{ width: P(158), flex: "none", borderRight: `1px solid ${LINE}`, display: "flex", flexDirection: "column", padding: `${P(10)} ${P(6)}`, gap: P(1) }}>
        <div style={{ display: "flex", gap: P(5), padding: `0 ${P(4)} ${P(9)}` }}>
          {["#ff5e4d", "#ffb020", "#4fd19a"].map((c) => (
            <span key={c} style={{ width: P(7), height: P(7), borderRadius: "50%", background: c }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: P(12), padding: `0 ${P(6)} ${P(7)}`, fontSize: P(10.5), fontWeight: 600 }}>
          <span>Layers</span>
          <span style={{ color: MUTED, fontWeight: 500 }}>Assets</span>
        </div>
        <Row icon="frame" name="Onboarding" depth={0} />
        <Row icon="rect" name="Hero image" depth={1} />
        <Row icon="text" name="Plan your trip" depth={1} />
        <Row icon="text" name="Subtitle" depth={1} dim />
        <Row icon="rect" name="Get started" depth={1} selected />
        <Row icon="ellipse" name="Page dots" depth={1} dim />
        <Row icon="frame" name="Home" depth={0} />
        <Row icon="rect" name="Card list" depth={1} dim />
        <Row icon="rect" name="Tab bar" depth={1} dim />
        <Row icon="frame" name="Settings" depth={0} dim />
      </div>

      {/* centre: canvas */}
      <div style={{ flex: 1, minWidth: 0, position: "relative", backgroundColor: "#0f0c1c", backgroundImage: "radial-gradient(#26204a 1px,transparent 1.5px)", backgroundSize: `${P(20)} ${P(20)}`, overflow: "hidden" }}>
        {/* top toolbar */}
        <div style={abs({ x: 12, y: 10, w: 180, h: 24 }, { display: "flex", alignItems: "center", gap: P(14), padding: `0 ${P(10)}`, borderRadius: P(8), background: "#17151f", border: `1px solid ${LINE}`, color: MUTED })}>
          <Icon d={ICONS.move} size={11} color="#fff" />
          <Icon d={ICONS.frame} size={11} />
          <Icon d={ICONS.rect} size={11} />
          <Icon d={ICONS.pen} size={11} />
          <Icon d={ICONS.text} size={11} />
          <Icon d={ICONS.comment} size={11} />
        </div>

        {/* frame label + onboarding screen */}
        <div style={{ ...abs({ x: 20, y: 50, w: 130, h: 12 }), fontFamily: MONO, fontSize: P(8.5), color: MUTED }}>Onboarding</div>
        <div style={abs({ x: 20, y: 66, w: 130, h: 258 }, { borderRadius: P(16), background: "#fbfaff", overflow: "hidden", boxShadow: "0 18px 40px #0008" })}>
          <div style={abs({ x: 8, y: 8, w: 114, h: 112 }, { borderRadius: P(11), background: "linear-gradient(150deg,#ff7a59,#c04fd0 55%,#5b3fd8)", overflow: "hidden" })}>
            <div style={abs({ x: 0, y: 70, w: 114, h: 42 }, { background: "#ffffff22", clipPath: "polygon(0 60%,28% 20%,50% 55%,72% 10%,100% 50%,100% 100%,0 100%)" })} />
            <div style={abs({ x: 78, y: 14, w: 20, h: 20 }, { borderRadius: "50%", background: "#ffe3a3" })} />
          </div>
          <div style={abs({ x: 10, y: 130, w: 110, h: 24 }, { fontWeight: 800, fontSize: P(15), color: "#15131d", letterSpacing: "-.02em", fontFamily: "'Bricolage Grotesque',sans-serif", lineHeight: 1.05 })}>Plan your trip</div>
          <div style={abs({ x: 10, y: 162, w: 110, h: 30 }, { fontSize: P(8.5), color: "#6b6781", lineHeight: 1.45 })}>Save places, share routes and travel together.</div>
          <div style={abs({ x: 10, y: 200, w: 110, h: 28 }, { borderRadius: P(9), background: "#6a46f2", color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: P(10) })}>Get started</div>
          <div style={abs({ x: 49, y: 240, w: 32, h: 6 }, { display: "flex", gap: P(4), alignItems: "center", justifyContent: "center" })}>
            <i style={{ width: P(10), height: P(5), borderRadius: P(3), background: "#6a46f2" }} />
            <i style={{ width: P(5), height: P(5), borderRadius: "50%", background: "#d6d1ec" }} />
            <i style={{ width: P(5), height: P(5), borderRadius: "50%", background: "#d6d1ec" }} />
          </div>
        </div>

        {/* selection around the button, size pill and a measurement to the frame edge */}
        <div style={abs({ x: 30, y: 266, w: 110, h: 28 }, { border: `1.5px solid ${IRIS}`, borderRadius: P(9) })}>
          {[[-4, -4], [106, -4], [-4, 24], [106, 24]].map(([hx, hy]) => (
            <i key={`${hx}${hy}`} style={abs({ x: hx!, y: hy!, w: 7, h: 7 }, { background: "#fff", border: `1.5px solid ${IRIS}`, borderRadius: P(1.5) })} />
          ))}
          <div style={abs({ x: 25, y: 33, w: 60, h: 14 }, { background: IRIS, color: "#fff", borderRadius: P(4), fontFamily: MONO, fontSize: P(8), display: "grid", placeItems: "center" })}>110 × 28</div>
        </div>
        <div style={abs({ x: 132, y: 294, w: 1, h: 30 }, { background: "#ff4fa3" })} />
        <div style={abs({ x: 135, y: 303, w: 16, h: 12 }, { background: "#ff4fa3", color: "#fff", borderRadius: P(3), fontFamily: MONO, fontSize: P(8), display: "grid", placeItems: "center" })}>16</div>

        {/* home screen */}
        <div style={{ ...abs({ x: 168, y: 50, w: 130, h: 12 }), fontFamily: MONO, fontSize: P(8.5), color: MUTED }}>Home</div>
        <div style={abs({ x: 168, y: 66, w: 130, h: 258 }, { borderRadius: P(16), background: "#17151f", border: `1px solid ${LINE}`, overflow: "hidden" })}>
          <div style={abs({ x: 10, y: 12, w: 80, h: 12 }, { fontWeight: 700, fontSize: P(11) })}>Good morning</div>
          {[
            ["#ff5e4d", "Lisbon", "5 days"],
            ["#2de2c8", "Kyoto", "9 days"],
            ["#ffb020", "Oslo", "3 days"],
          ].map(([c, name, meta], i) => (
            <div key={name} style={abs({ x: 10, y: 38 + i * 56, w: 110, h: 48 }, { borderRadius: P(11), background: "#221f2e", display: "flex", alignItems: "center", gap: P(8), padding: `0 ${P(8)}` })}>
              <i style={{ width: P(30), height: P(30), borderRadius: P(9), background: c, flex: "none" }} />
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: P(10.5), fontWeight: 600 }}>{name}</div>
                <div style={{ fontSize: P(8.5), color: MUTED }}>{meta}</div>
              </div>
            </div>
          ))}
          <div style={abs({ x: 0, y: 220, w: 130, h: 38 }, { borderTop: `1px solid ${LINE}`, display: "flex", justifyContent: "space-around", alignItems: "center" })}>
            {[IRIS, "#4a4470", "#4a4470", "#4a4470"].map((c, i) => (
              <i key={i} style={{ width: P(12), height: P(12), borderRadius: P(4), background: c }} />
            ))}
          </div>
        </div>

        {/* collaborators and a comment */}
        <Cursor x={262} y={118} color="#ff5e4d" name="Nadia" />
        <Cursor x={120} y={250} color="#2de2c8" name="Rafi" />
        <div style={abs({ x: 296, y: 100, w: 20, h: 20 }, { borderRadius: "50% 50% 50% 0", background: "#ffb020", color: "#0e0d14", display: "grid", placeItems: "center", fontSize: P(9), fontWeight: 700 })}>3</div>

        {/* a palette row below the screens */}
        <div style={{ ...abs({ x: 20, y: 372, w: 80, h: 12 }), fontFamily: MONO, fontSize: P(8.5), color: MUTED }}>Palette</div>
        <div style={abs({ x: 20, y: 390, w: 280, h: 30 }, { display: "flex", gap: P(10) })}>
          {["#6a46f2", "#ff4fa3", "#ff5e4d", "#ffb020", "#2de2c8", "#4fd19a"].map((c, i) => (
            <i key={c} style={{ width: P(30), height: P(30), borderRadius: i % 2 ? P(9) : "50%", background: c, display: "block", flex: "none" }} />
          ))}
        </div>

        {/* bottom: zoom */}
        <div style={abs({ x: canvasX - 158 + 262, y: 438, w: 50, h: 20 }, { borderRadius: P(6), background: "#17151f", border: `1px solid ${LINE}`, fontFamily: MONO, fontSize: P(8.5), color: MUTED, display: "grid", placeItems: "center" })}>100%</div>
      </div>

      {/* right: properties */}
      <div style={{ width: P(205), flex: "none", borderLeft: `1px solid ${LINE}`, display: "flex", flexDirection: "column", padding: `${P(10)} ${P(8)}`, gap: P(2) }}>
        <div style={{ display: "flex", gap: P(5), paddingBottom: P(6) }}>
          <span style={{ padding: `${P(4)} ${P(10)}`, borderRadius: P(7), background: "#221d3e", fontWeight: 600, fontSize: P(10.5) }}>Design</span>
          <span style={{ padding: `${P(4)} ${P(8)}`, color: "#b7b2cc", fontSize: P(10.5) }}>Prototype</span>
        </div>
        <div style={{ fontWeight: 600, fontSize: P(11), padding: `${P(2)} ${P(2)} ${P(5)}` }}>Get started</div>
        <div style={{ display: "flex", gap: P(5) }}><Field k="X" v="10" /><Field k="Y" v="200" /></div>
        <div style={{ display: "flex", gap: P(5), marginTop: P(5) }}><Field k="W" v="110" /><Field k="H" v="28" /></div>
        <div style={{ display: "flex", gap: P(5), marginTop: P(5) }}><Field k="R" v="9" /><Field k="%" v="100" /></div>
        <Label>AUTO LAYOUT</Label>
        <div style={{ display: "flex", gap: P(5) }}>
          <div style={{ flex: 1, height: P(20), borderRadius: P(5), background: "#1e1a36", display: "flex", alignItems: "center", justifyContent: "center", gap: P(8) }}>
            <Icon d="M5 12h14M13 6l6 6-6 6" size={9} color="#fff" />
            <Icon d="M12 5v14M6 13l6 6 6-6" size={9} />
          </div>
          <Field k="Gap" v="8" w={56} />
        </div>
        <Label>FILL</Label>
        <div style={{ display: "flex", alignItems: "center", gap: P(7), height: P(22), padding: `0 ${P(7)}`, borderRadius: P(5), background: "#1e1a36", fontSize: P(10) }}>
          <i style={{ width: P(12), height: P(12), borderRadius: P(3), background: "#6a46f2", display: "block" }} />
          <span style={{ fontFamily: MONO }}>6A46F2</span>
          <span style={{ marginLeft: "auto", color: MUTED, fontFamily: MONO }}>100%</span>
        </div>
        <Label>STROKE</Label>
        <div style={{ height: P(22), padding: `0 ${P(7)}`, borderRadius: P(5), background: "#1e1a36", fontSize: P(10), color: MUTED, display: "flex", alignItems: "center" }}>Add stroke</div>
        <Label>EFFECTS</Label>
        <div style={{ display: "flex", alignItems: "center", gap: P(7), height: P(22), padding: `0 ${P(7)}`, borderRadius: P(5), background: "#1e1a36", fontSize: P(10) }}>
          <i style={{ width: P(12), height: P(12), borderRadius: P(3), background: "#00000099", border: "1px solid #4a4470", display: "block" }} />
          <span>Drop shadow</span>
          <span style={{ marginLeft: "auto", color: MUTED, fontFamily: MONO }}>0 6 16</span>
        </div>
      </div>
    </>
  );
}
