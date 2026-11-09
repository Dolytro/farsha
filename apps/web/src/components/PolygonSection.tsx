import type { DesignDoc } from "@farsha/design-core";
import type { DesignNode } from "@farsha/types";
import { MAX_SHAPE_RADIUS, MAX_SIDES, MIN_SIDES, DEFAULT_STAR_RATIO, polygonPatch } from "../shape-params";

/** Figma's Polygon and Star controls: the number of sides (or points) and, for a star, how deep the points are. Only for layers made with those tools. */
export function PolygonSection({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  if (node.type !== "VECTOR" || !node.shapeKind) return null;
  const kind = node.shapeKind;
  const sides = node.shapeSides ?? (kind === "STAR" ? 5 : 3);
  const ratio = node.starRatio ?? DEFAULT_STAR_RATIO;
  const radius = node.shapeRadius ?? 0;
  const apply = (nextSides: number, nextRatio: number, nextRadius = radius) => doc.patchNodes({ [node.id]: polygonPatch(kind, nextSides, nextRatio, nextRadius) });
  return (
    <section className="props__section">
      <h3 className="props__heading">{kind === "STAR" ? "Star" : "Polygon"}</h3>
      <div className="props__stack">
        <label className="field field--row" title={kind === "STAR" ? "Number of points" : "Number of sides"}>
          <span className="field__label field__label--text">{kind === "STAR" ? "Points" : "Sides"}</span>
          <input
            className="field__input"
            type="number"
            min={MIN_SIDES}
            max={MAX_SIDES}
            aria-label={kind === "STAR" ? "Star points" : "Polygon sides"}
            value={sides}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(v)) apply(v, ratio);
            }}
          />
        </label>
        <label className="field field--row" title="Corner radius">
          <span className="field__label field__label--text">Radius</span>
          <input
            className="field__input"
            type="number"
            min={0}
            max={MAX_SHAPE_RADIUS}
            aria-label="Polygon corner radius"
            value={radius}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(v)) apply(sides, ratio, v);
            }}
          />
        </label>
        {kind === "STAR" && (
          <label className="field field--row" title="Inner radius as a percentage of the outer radius">
            <span className="field__label field__label--text">Ratio</span>
            <input
              className="field__input"
              type="number"
              min={5}
              max={95}
              aria-label="Star ratio"
              value={Math.round(ratio * 100)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (e.target.value !== "" && Number.isFinite(v)) apply(sides, v / 100);
              }}
            />
          </label>
        )}
      </div>
    </section>
  );
}
