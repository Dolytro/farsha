import { screenToWorld } from "@farsha/canvas-engine";
import { useEditor } from "../store";
import { loadDefaults, withDefaults } from "../defaults";
import { FRAME_PRESETS, presetFrameProps } from "../frame-presets";

/** With the Frame tool chosen and nothing selected, the Design panel lists device sizes; a click puts a frame of that size in the middle of the view (Figma). */
export function FramePresetsSection() {
  const groups = [...new Set(FRAME_PRESETS.map((p) => p.group))];
  const place = (index: number) => {
    const s = useEditor.getState();
    const preset = FRAME_PRESETS[index]!;
    const box = document.querySelector(".canvas__svg")?.getBoundingClientRect();
    const center = box ? screenToWorld(s.viewport, box.width / 2, box.height / 2) : { x: 0, y: 0 };
    s.doc.stopCapturing();
    const id = s.doc.createNode("FRAME", { parentId: s.pageId, props: withDefaults("FRAME", presetFrameProps(preset, center), loadDefaults()) });
    s.doc.stopCapturing();
    s.select([id]);
    s.setTool("select");
  };
  return (
    <section className="props__section">
      <h3 className="props__heading">Frame</h3>
      {groups.map((group) => (
        <div key={group} className="presets">
          <div className="presets__group">{group}</div>
          {FRAME_PRESETS.map((p, i) =>
            p.group === group ? (
              <button key={i} className="presets__item" onClick={() => place(i)}>
                <span>{p.name}</span>
                <span className="presets__size">
                  {p.width} × {p.height}
                </span>
              </button>
            ) : null,
          )}
        </div>
      ))}
    </section>
  );
}
