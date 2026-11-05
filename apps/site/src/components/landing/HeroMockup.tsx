import type { CSSProperties } from "react";

/**
 * The editor picture in the hero: a believable Farsha session (layers, a design on the canvas with a selection and
 * a measurement, two collaborators, a comment, the property panel). Sizes are written in pixels of a 695 px wide
 * mockup in the stylesheet (site-mockup.scss) and converted to container units so it scales with the page.
 */
const P = (n: number) => `${(n / 6.95).toFixed(3)}cqw`;

const MUTED = "#a29cba";

/** Lets a style carry custom properties (`--c`) without a cast at every use. */
const tone = (c: string) => ({ "--c": c }) as CSSProperties;

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
  const cls = ["site-mockup__row", depth ? "site-mockup__row--depth-1" : "", selected ? "site-mockup__row--selected" : "", dim ? "site-mockup__row--dim" : ""].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <Icon d={ICONS[icon]} size={9} color={selected ? "#cbbfff" : "#8d87a6"} />
      <span>{name}</span>
    </div>
  );
}

function Label({ children }: { children: string }) {
  return <div className="site-mockup__section-label">{children}</div>;
}

function Field({ k, v, fixed = false }: { k: string; v: string; fixed?: boolean }) {
  return (
    <div className={fixed ? "site-mockup__field site-mockup__field--fixed" : "site-mockup__field"}>
      <span className="site-mockup__field-key">{k}</span>
      <span className="site-mockup__mono">{v}</span>
    </div>
  );
}

function Cursor({ mod, color, name }: { mod: string; color: string; name: string }) {
  return (
    <div className={`site-mockup__cursor site-mockup__cursor--${mod}`} style={tone(color)}>
      <svg width={P(11)} height={P(13)} viewBox="0 0 11 13" aria-hidden="true">
        <path d="M0 0l10 5.2-4.2 1.2L3.8 12z" fill={color} stroke="#0e0d14" strokeWidth=".8" strokeLinejoin="round" />
      </svg>
      <div className="site-mockup__cursor-name">{name}</div>
    </div>
  );
}

export function HeroMockup() {
  return (
    <>
      {/* left: layers */}
      <div className="site-mockup__layers">
        <div className="site-mockup__window-dots">
          {["#ff5e4d", "#ffb020", "#4fd19a"].map((c) => (
            <span key={c} className="site-mockup__window-dot" style={tone(c)} />
          ))}
        </div>
        <div className="site-mockup__tabs">
          <span>Layers</span>
          <span className="site-mockup__tabs-muted">Assets</span>
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
      <div className="site-mockup__canvas">
        {/* bottom toolbar, where the editor keeps it */}
        <div className="site-mockup__toolbar">
          <Icon d={ICONS.move} size={11} color="#fff" />
          <Icon d={ICONS.frame} size={11} />
          <Icon d={ICONS.rect} size={11} />
          <Icon d={ICONS.pen} size={11} />
          <Icon d={ICONS.text} size={11} />
          <Icon d={ICONS.comment} size={11} />
        </div>

        {/* frame label + onboarding screen */}
        <div className="site-mockup__frame-label site-mockup__frame-label--onboarding">Onboarding</div>
        <div className="site-mockup__screen site-mockup__screen--onboarding">
          <div className="site-mockup__photo">
            <div className="site-mockup__hills" />
            <div className="site-mockup__sun" />
          </div>
          <div className="site-mockup__headline">Plan your trip</div>
          <div className="site-mockup__copy">Save places, share routes and travel together.</div>
          <div className="site-mockup__cta">Get started</div>
          <div className="site-mockup__pager">
            <i className="site-mockup__pager-active" />
            <i className="site-mockup__pager-dot" />
            <i className="site-mockup__pager-dot" />
          </div>
        </div>

        {/* selection around the button, size pill and a measurement to the frame edge */}
        <div className="site-mockup__selection">
          {["tl", "tr", "bl", "br"].map((corner) => (
            <i key={corner} className={`site-mockup__handle site-mockup__handle--${corner}`} />
          ))}
          <div className="site-mockup__size-pill">110 × 28</div>
        </div>
        <div className="site-mockup__measure-line" />
        <div className="site-mockup__measure-tag">16</div>

        {/* home screen */}
        <div className="site-mockup__frame-label site-mockup__frame-label--home">Home</div>
        <div className="site-mockup__screen site-mockup__screen--home">
          <div className="site-mockup__greeting">Good morning</div>
          {[
            ["#ff5e4d", "Lisbon", "5 days"],
            ["#2de2c8", "Kyoto", "9 days"],
            ["#ffb020", "Oslo", "3 days"],
          ].map(([c, name, meta], i) => (
            <div key={name} className={`site-mockup__trip site-mockup__trip--${i + 1}`} style={tone(c!)}>
              <i className="site-mockup__trip-swatch" />
              <div className="site-mockup__trip-text">
                <div className="site-mockup__trip-name">{name}</div>
                <div className="site-mockup__trip-meta">{meta}</div>
              </div>
            </div>
          ))}
          <div className="site-mockup__tabbar">
            {["#7c5cff", "#4a4470", "#4a4470", "#4a4470"].map((c, i) => (
              <i key={i} className="site-mockup__tabbar-icon" style={tone(c)} />
            ))}
          </div>
        </div>

        {/* collaborators and a comment */}
        <Cursor mod="nadia" color="#ff5e4d" name="Nadia" />
        <Cursor mod="rafi" color="#2de2c8" name="Rafi" />
        <div className="site-mockup__comment">3</div>

        {/* a palette row below the screens */}
        <div className="site-mockup__frame-label site-mockup__frame-label--palette">Palette</div>
        <div className="site-mockup__palette">
          {["#6a46f2", "#ff4fa3", "#ff5e4d", "#ffb020", "#2de2c8", "#4fd19a"].map((c, i) => (
            <i key={c} className={i % 2 ? "site-mockup__swatch" : "site-mockup__swatch site-mockup__swatch--round"} style={tone(c)} />
          ))}
        </div>

        {/* bottom: zoom */}
        <div className="site-mockup__zoom">100%</div>
      </div>

      {/* right: properties */}
      <div className="site-mockup__props">
        <div className="site-mockup__props-tabs">
          <span className="site-mockup__props-tab site-mockup__props-tab--active">Design</span>
          <span className="site-mockup__props-tab">Prototype</span>
        </div>
        <div className="site-mockup__props-title">Get started</div>
        <div className="site-mockup__fields">
          <Field k="X" v="10" />
          <Field k="Y" v="200" />
        </div>
        <div className="site-mockup__fields site-mockup__fields--spaced">
          <Field k="W" v="110" />
          <Field k="H" v="28" />
        </div>
        <div className="site-mockup__fields site-mockup__fields--spaced">
          <Field k="R" v="9" />
          <Field k="%" v="100" />
        </div>
        <Label>AUTO LAYOUT</Label>
        <div className="site-mockup__fields">
          <div className="site-mockup__direction">
            <Icon d="M5 12h14M13 6l6 6-6 6" size={9} color="#fff" />
            <Icon d="M12 5v14M6 13l6 6 6-6" size={9} />
          </div>
          <Field k="Gap" v="8" fixed />
        </div>
        <Label>FILL</Label>
        <div className="site-mockup__value-row">
          <i className="site-mockup__chip site-mockup__chip--fill" />
          <span className="site-mockup__mono">6A46F2</span>
          <span className="site-mockup__value-end">100%</span>
        </div>
        <Label>STROKE</Label>
        <div className="site-mockup__empty-row">Add stroke</div>
        <Label>EFFECTS</Label>
        <div className="site-mockup__value-row">
          <i className="site-mockup__chip site-mockup__chip--shadow" />
          <span>Drop shadow</span>
          <span className="site-mockup__value-end">0 6 16</span>
        </div>
      </div>
    </>
  );
}
