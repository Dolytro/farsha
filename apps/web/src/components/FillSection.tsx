import { ColorSwatch } from "./ColorSwatch";
import { useState } from "react";
import type { DesignDoc } from "@farsha/design-core";
import { StyleMenu, StylePill } from "./StyleMenu";
import { VariableButton, VariableChip } from "./VariableMenu";
import { paintCss } from "@farsha/code-generator";
import { paintColor, type DesignNode, type GradientPaint, type GradientStop, type ImageScaleMode, type Paint } from "@farsha/types";
import { readImage } from "../images";
import { pickVideoForLayer } from "../place-image";
import { HexInput } from "./HexInput";
import { useEditor } from "../store";
import { Select } from "./Select";

type Kind = Paint["type"];
const KIND_LABEL: Record<Kind, string> = { SOLID: "Solid", GRADIENT_LINEAR: "Linear", GRADIENT_RADIAL: "Radial", GRADIENT_ANGULAR: "Angular", GRADIENT_DIAMOND: "Diamond", IMAGE: "Image" };
const SCALE_LABEL: Record<ImageScaleMode, string> = { FILL: "Fill", FIT: "Fit", STRETCH: "Stretch" };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Convert a paint to another kind, keeping its colour. */
export function convertPaint(p: Paint, kind: Kind): Paint {
  if (p.type === kind) return p;
  if (kind === "SOLID") return { type: "SOLID", color: p.type === "IMAGE" ? "#d9d9d9" : paintColor(p), opacity: p.opacity };
  if (kind === "IMAGE") return { type: "IMAGE", assetId: null, scaleMode: "FILL", opacity: p.opacity };
  if (p.type.startsWith("GRADIENT")) return { ...(p as GradientPaint), type: kind } as Paint;
  const color = p.type === "SOLID" ? p.color : "#d9d9d9";
  return {
    type: kind,
    angle: 90,
    opacity: p.opacity,
    stops: [
      { position: 0, color, opacity: 1 },
      { position: 1, color, opacity: 0 },
    ],
  };
}

/** Fills are stored bottom to top (SVG paint order) and listed top first, like Figma. */
export function FillSection({ doc, node }: { doc: DesignDoc; node: DesignNode }) {
  const [editingStyle, setEditingStyle] = useState(false);
  if (!("fills" in node) || !node.fills) return null;
  const style = node.fillStyleId ? doc.getFillStyle(node.fillStyleId) : undefined;
  // While a colour style is applied the rows edit the style itself (every layer that uses it follows).
  const fills = style && editingStyle ? style.paints : node.fills;
  const setFills = (next: Paint[]) => (style ? doc.updateFillStyle(style.id, { paints: next }) : doc.setStyle(node.id, { fills: next }));
  // Text is drawn with a single colour, so it keeps one fill.
  const canAdd = !style && (node.type !== "TEXT" || fills.length === 0);
  return (
    <section className="props__section">
      <h3 className="props__heading props__heading--row">
        Fill
        <span className="props__tools">
          <StyleMenu doc={doc} node={node} />
          {canAdd && (
            <button className="props__add" title="Add fill" onClick={() => setFills([...fills, { type: "SOLID", color: "#d9d9d9", opacity: 1 }])}>
              +
            </button>
          )}
        </span>
      </h3>
      {node.type === "RECTANGLE" && node.videoAssetId && (
        <div className="fill-row fill-row--gap" title="This rectangle plays a video when you preview">
          <span>▶ Video</span>
          <button className="props__add" title="Replace the video" onClick={() => pickVideoForLayer(node.id)}>
            ↻
          </button>
          <button className="props__add" title="Remove the video" onClick={() => doc.setStyle(node.id, { videoAssetId: null })}>
            −
          </button>
        </div>
      )}
      {style && <StylePill doc={doc} node={node} style={style} editing={editingStyle} setEditing={setEditingStyle} />}
      {(!style || editingStyle) &&
        fills.map((_, k) => fills.length - 1 - k).map((i) => (
          <FillRow
            key={i}
            doc={doc}
            nodeId={node.id}
            paint={fills[i]!}
            setPaint={(p) => setFills(fills.map((f, j) => (j === i ? p : f)))}
            remove={() => setFills(fills.filter((_, j) => j !== i))}
            bind={style ? undefined : (variableId) => doc.bindPaintVariable(node.id, "fills", i, variableId)}
          />
        ))}
    </section>
  );
}

function FillRow({ doc, nodeId, paint, setPaint, remove, bind }: { doc: DesignDoc; nodeId: string; paint: Paint; setPaint: (p: Paint) => void; remove: () => void; bind?: (variableId: string | null) => void }) {
  const setStops = (g: GradientPaint, stops: GradientStop[]) => setPaint({ ...g, stops });
  return (
    <div className="fill-item">
      <div className="fill-item__head">
        <Select
          className="field__select field__select--wide"
          value={paint.type}
          onChange={(e) => {
            // Video is not a paint: it turns the rectangle into a video layer
            if (e.target.value === "VIDEO") pickVideoForLayer(nodeId);
            else setPaint(convertPaint(paint, e.target.value as Kind));
          }}
        >
          {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
          {doc.getNode(nodeId)?.type === "RECTANGLE" && <option value="VIDEO">Video</option>}
        </Select>
        {bind && paint.type === "SOLID" && !paint.variableId && <VariableButton doc={doc} onPick={bind} />}
        <button className="props__add" title="Remove fill" onClick={remove}>
          −
        </button>
      </div>
      {paint.type === "SOLID" && paint.variableId && bind && <VariableChip doc={doc} variableId={paint.variableId} onDetach={() => bind(null)} />}

      {paint.type === "IMAGE" ? (
        <ImageFill doc={doc} nodeId={nodeId} paint={paint} setPaint={setPaint} />
      ) : paint.type === "SOLID" && paint.variableId && bind ? null : paint.type === "SOLID" ? (
        <div className="fill-row fill-row--gap">
          <ColorSwatch value={paint.color} onChange={(color) => setPaint({ ...paint, color })} />
          <HexInput value={paint.color} onChange={(color) => setPaint({ ...paint, color })} />
          <input
            className="fill-row__pct"
            type="number"
            min={0}
            max={100}
            value={Math.round(paint.opacity * 100)}
            onChange={(e) => setPaint({ ...paint, opacity: clamp01(Number(e.target.value) / 100) })}
          />
        </div>
      ) : (
        <>
          <div className="gradient-bar" style={{ background: paintCss({ ...paint, type: "GRADIENT_LINEAR", angle: 0 }) }} />
          {(paint.type === "GRADIENT_LINEAR" || paint.type === "GRADIENT_ANGULAR") && (
            <label className="field field--gap" title="Angle (0 = left to right, 90 = top to bottom)">
              <span className="field__label">∠</span>
              <input className="field__input" type="number" value={paint.angle} onChange={(e) => Number.isFinite(Number(e.target.value)) && setPaint({ ...paint, angle: Number(e.target.value) })} />
            </label>
          )}
          {paint.stops.map((s, i) => {
            const patch = (p: Partial<GradientStop>) => setStops(paint, paint.stops.map((o, j) => (j === i ? { ...o, ...p } : o)));
            return (
              <div className="fill-row fill-row--gap" key={i}>
                <input
                  className="fill-row__pct"
                  type="number"
                  min={0}
                  max={100}
                  title="Stop position (%)"
                  value={Math.round(s.position * 100)}
                  onChange={(e) => patch({ position: clamp01(Number(e.target.value) / 100) })}
                />
                <ColorSwatch value={s.color} onChange={(color) => patch({ color })} />
                <HexInput value={s.color} onChange={(color) => patch({ color })} />
                <input className="fill-row__pct" type="number" min={0} max={100} title="Stop opacity (%)" value={Math.round(s.opacity * 100)} onChange={(e) => patch({ opacity: clamp01(Number(e.target.value) / 100) })} />
                <button
                  className="props__add"
                  title="Remove stop"
                  disabled={paint.stops.length <= 2}
                  onClick={() => setStops(paint, paint.stops.filter((_, j) => j !== i))}
                >
                  −
                </button>
              </div>
            );
          })}
          <button
            className="props__link"
            onClick={() => {
              const last = paint.stops[paint.stops.length - 1];
              setStops(paint, [...paint.stops, { position: 1, color: last?.color ?? "#000000", opacity: 1 }]);
            }}
          >
            + Add stop
          </button>
        </>
      )}
    </div>
  );
}

function ImageFill({ doc, paint, setPaint }: { doc: DesignDoc; nodeId: string; paint: Extract<Paint, { type: "IMAGE" }>; setPaint: (p: Paint) => void }) {
  const choose = async (file: File | undefined) => {
    if (!file) return;
    const { showToast } = useEditor.getState();
    try {
      const image = await readImage(file);
      const assetId = doc.addAsset(image.mime, image.bytes);
      doc.stopCapturing();
      setPaint({ ...paint, assetId });
      doc.stopCapturing();
    } catch (err) {
      showToast(err instanceof Error ? `Couldn't add the image: ${err.message}` : "Couldn't add the image");
    }
  };
  return (
    <>
      <Select className="field__select field__select--wide field--gap" title="Scale mode" value={paint.scaleMode} onChange={(e) => setPaint({ ...paint, scaleMode: e.target.value as ImageScaleMode })}>
        {(Object.keys(SCALE_LABEL) as ImageScaleMode[]).map((m) => (
          <option key={m} value={m}>
            {SCALE_LABEL[m]}
          </option>
        ))}
      </Select>
      <label className="props__link props__file">
        {paint.assetId ? "Change image" : "Choose image"}
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => void choose(e.target.files?.[0])} />
      </label>
      <label className="field field--gap" title="Image opacity (%)">
        <span className="field__label">%</span>
        <input className="field__input" type="number" min={0} max={100} value={Math.round(paint.opacity * 100)} onChange={(e) => setPaint({ ...paint, opacity: clamp01(Number(e.target.value) / 100) })} />
      </label>
    </>
  );
}
