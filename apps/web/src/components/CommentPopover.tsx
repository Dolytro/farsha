import { useEffect, useRef, useState } from "react";
import { useEditor } from "../store";

const ago = (t: number) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString();
};

/** The comment thread (or the box for a new comment) next to its pin. Rendered inside the workspace, over the canvas. */
export function CommentPopover() {
  const doc = useEditor((s) => s.doc);
  const active = useEditor((s) => s.activeComment);
  const setActive = useEditor((s) => s.setActiveComment);
  const viewport = useEditor((s) => s.viewport);
  const pageId = useEditor((s) => s.pageId);
  const author = useEditor((s) => s.drive.user?.name ?? "You");
  const viewer = useEditor((s) => s.viewer);
  useEditor((s) => s.version);
  const [text, setText] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const key = active ? ("id" in active ? active.id : "draft") : null;

  useEffect(() => {
    setText("");
    if (key) setTimeout(() => area.current?.focus(), 0);
  }, [key]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setActive(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [active, setActive]);

  // A click anywhere else (not on this box and not on a pin) closes the thread.
  useEffect(() => {
    if (!active) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest?.(".comment, [data-comment]")) return;
      setActive(null);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [active, setActive]);

  if (!active) return null;
  const thread = "id" in active ? doc.getComment(active.id) : undefined;
  if ("id" in active && !thread) return null;
  const at = thread ?? { x: (active as { draft: { x: number; y: number } }).draft.x, y: (active as { draft: { x: number; y: number } }).draft.y };
  const left = viewport.x + at.x * viewport.zoom + 18;
  const top = viewport.y + at.y * viewport.zoom - 34;

  const post = () => {
    const { showToast } = useEditor.getState();
    try {
      if ("draft" in active) {
        const id = doc.addComment({ pageId, x: active.draft.x, y: active.draft.y, author, text });
        setActive({ id });
        useEditor.getState().setTool("select");
      } else if (thread) {
        doc.replyToComment(thread.id, author, text);
      }
      setText("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't post");
    }
  };

  return (
    <div className="comment" style={{ left, top }} role="dialog" aria-label="Comment" onPointerDown={(e) => e.stopPropagation()}>
      {thread && (
        <>
          <div className="comment__head">
            <strong>{thread.author}</strong>
            <span className="comment__time">{ago(thread.at)}</span>
            <span className="comment__spacer" />
            {!viewer && (
              <>
                <button className="icon-btn" title={thread.resolved ? "Reopen" : "Resolve"} aria-label={thread.resolved ? "Reopen comment" : "Resolve comment"} onClick={() => doc.resolveComment(thread.id, !thread.resolved)}>
                  {thread.resolved ? "↺" : "✓"}
                </button>
                <button
                  className="icon-btn"
                  title="Delete thread"
                  aria-label="Delete comment"
                  onClick={() => {
                    doc.deleteComment(thread.id);
                    setActive(null);
                  }}
                >
                  🗑
                </button>
              </>
            )}
          </div>
          <p className="comment__text">{thread.text}</p>
          {thread.replies.map((r) => (
            <div className="comment__reply" key={r.id}>
              <div className="comment__head">
                <strong>{r.author}</strong>
                <span className="comment__time">{ago(r.at)}</span>
              </div>
              <p className="comment__text">{r.text}</p>
            </div>
          ))}
        </>
      )}
      {!viewer && (
        <div className="comment__compose">
          <textarea
            ref={area}
            className="comment__input"
            rows={2}
            placeholder={thread ? "Reply…" : "Add a comment…"}
            aria-label={thread ? "Reply" : "Comment"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                post();
              }
            }}
          />
          <button className="props__button props__button--primary comment__send" disabled={!text.trim()} onClick={post}>
            {thread ? "Reply" : "Comment"}
          </button>
        </div>
      )}
    </div>
  );
}
