"use client";

import { useState } from "react";
import { FAQ } from "./faq-data";

/** The question list: one answer open at a time, the first one open to start with. */
export function FaqList() {
  const [open, setOpen] = useState(0);
  return (
    <>
      {FAQ.map(([q, a], i) => {
        const isOpen = open === i;
        return (
          <div key={q} className="site-faq__item">
            <button type="button" className="site-faq__question" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)}>
              <span>{q}</span>
              <span className={isOpen ? "site-faq__toggle site-faq__toggle--open" : "site-faq__toggle"}>+</span>
            </button>
            <div className={isOpen ? "site-faq__answer site-faq__answer--open" : "site-faq__answer"}>
              <div className="site-faq__answer-clip">
                <div className="site-faq__answer-text">{a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
