"use client";

import { useState } from "react";
import { FAQ } from "./faq-data";


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
