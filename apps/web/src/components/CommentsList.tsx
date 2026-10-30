import { useEditor } from "../store";

/** The Comments tab of the left panel: every comment of the file, newest page first; a click opens the thread and moves the canvas there. */
export function CommentsList() {
  const doc = useEditor((s) => s.doc);
  const setPage = useEditor((s) => s.setPage);
  useEditor((s) => s.version);
  const all = doc.comments();
  const pageName = (id: string) => doc.getNode(id)?.name ?? "Page";

  if (!all.length) {
    return <p className="comments-list__empty">No comments yet. Press C and click the canvas to leave one.</p>;
  }
  return (
    <ul className="comments-list">
      {[...all].reverse().map((c) => (
        <li
          key={c.id}
          className={`comments-list__item${c.resolved ? " comments-list__item--resolved" : ""}`}
          onClick={() => {
            const s = useEditor.getState();
            if (s.pageId !== c.pageId && doc.hasNode(c.pageId)) setPage(c.pageId);
            s.setCommentsVisible(true);
            s.setActiveComment({ id: c.id });
            const vp = useEditor.getState().viewport;
            const el = document.querySelector(".canvas")?.getBoundingClientRect();
            // bring the pin into view: centre it when it is off screen
            const sx = vp.x + c.x * vp.zoom;
            const sy = vp.y + c.y * vp.zoom;
            if (el && (sx < 40 || sy < 40 || sx > el.width - 40 || sy > el.height - 40)) s.setViewport({ ...vp, x: el.width / 2 - c.x * vp.zoom, y: el.height / 2 - c.y * vp.zoom });
          }}
        >
          <span>
            {c.resolved ? "✓ " : ""}
            {c.text.length > 90 ? `${c.text.slice(0, 90)}…` : c.text}
          </span>
          <span className="comments-list__meta">
            {c.author} · {pageName(c.pageId)}
            {c.replies.length ? ` · ${c.replies.length} ${c.replies.length === 1 ? "reply" : "replies"}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
