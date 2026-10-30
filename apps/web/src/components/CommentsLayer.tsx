import { useEditor } from "../store";

/** Comment pins drawn on the canvas (inside the zoomed group, so they stay a fixed size on screen). */
export function CommentsLayer({ zoom }: { zoom: number }) {
  const doc = useEditor((s) => s.doc);
  const pageId = useEditor((s) => s.pageId);
  const visible = useEditor((s) => s.commentsVisible);
  const active = useEditor((s) => s.activeComment);
  const setActive = useEditor((s) => s.setActiveComment);
  useEditor((s) => s.version);
  if (!visible) return null;
  const r = 12 / zoom;
  const comments = doc.comments(pageId);
  return (
    <g>
      {comments.map((c, i) => {
        const isActive = active && "id" in active && active.id === c.id;
        return (
          <g
            key={c.id}
            transform={`translate(${c.x} ${c.y})`}
            data-comment={c.id}
            style={{ cursor: "pointer" }}
            opacity={c.resolved && !isActive ? 0.45 : 1}
            onPointerDown={(e) => {
              e.stopPropagation();
              setActive({ id: c.id });
            }}
          >
            <path d={`M0 0 L${-r * 0.35} ${-r * 0.9} A${r} ${r} 0 1 1 ${r * 0.35} ${-r * 0.9} Z`} fill={c.resolved ? "#8c8c8c" : "#ff5d3a"} stroke="#fff" strokeWidth={1.5 / zoom} />
            <text y={-r * 1.35} textAnchor="middle" fontSize={11 / zoom} fontWeight={700} fill="#fff" pointerEvents="none">
              {c.resolved ? "✓" : i + 1}
            </text>
          </g>
        );
      })}
      {active && "draft" in active && (
        <g transform={`translate(${active.draft.x} ${active.draft.y})`} pointerEvents="none">
          <path d={`M0 0 L${-r * 0.35} ${-r * 0.9} A${r} ${r} 0 1 1 ${r * 0.35} ${-r * 0.9} Z`} fill="#ff5d3a" fillOpacity={0.6} stroke="#fff" strokeWidth={1.5 / zoom} />
        </g>
      )}
    </g>
  );
}
