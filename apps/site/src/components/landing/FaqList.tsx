"use client";

import { useState } from "react";

const FAQ: [string, string][] = [
  ["Is Farsha really free?", "Yes. It is open source, runs in the browser, and has no seats, plans or paywall."],
  ["Where are my files stored?", "In your own Google Drive, as .farsha files. Farsha has no server or database of its own. You can also download a local copy."],
  ["Can I paste designs from Figma?", "Yes. Copy frames, text, shapes and vectors in Figma and paste them in. Auto layout, components, images and effects do not carry over yet."],
  ["How is Farsha different from Figma?", "Farsha is free and open source, and your files are saved to your own Google Drive. It uses the same panel names, tool order and shortcuts as Figma. Figma still leads on live multiplayer and comments, which are next on our roadmap."],
  ["Can we edit together live?", "Not yet. Share view links work today. Live cursors and comments are next on the roadmap."],
  ["Does it work offline?", "Your working copy autosaves in the browser and a local .farsha download opens without signing in. A full offline sync queue is not built yet."],
];

export function FaqList() {
  const [open, setOpen] = useState(0);
  return (
    <>
      {FAQ.map(([q, a], i) => {
        const isOpen = open === i;
        return (
          <div key={q} className="fq" style={{ borderBottom: "1px solid #2a2640" }}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : i)}
              style={{
                width: "100%",
                minHeight: 56,
                padding: "0 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                background: "transparent",
                border: 0,
                color: "#f2f0fa",
                fontFamily: "inherit",
                fontSize: 15,
                fontWeight: 600,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span>{q}</span>
              <span
                style={{
                  fontFamily: "Geist Mono,monospace",
                  fontSize: 20,
                  color: "#a592ff",
                  transition: "transform .24s",
                  transform: isOpen ? "rotate(45deg)" : undefined,
                }}
              >
                +
              </span>
            </button>
            <div
              style={{
                display: "grid",
                transition: "grid-template-rows .45s cubic-bezier(.2,.8,.2,1),opacity .45s",
                opacity: isOpen ? 1 : 0,
                gridTemplateRows: isOpen ? "1fr" : "0fr",
              }}
            >
              <div style={{ minHeight: 0, overflow: "hidden" }}>
                <div style={{ padding: "0 24px 20px", color: "#c9c4de", lineHeight: "24px", fontSize: 15 }}>{a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
