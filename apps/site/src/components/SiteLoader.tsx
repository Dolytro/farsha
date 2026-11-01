"use client";

import { useEffect, useRef, useState } from "react";
import { ButterflyLoader, LOADER_INTRO_MS } from "@farsha/ui";

const SEEN_KEY = "farsha-site-intro";

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Butterfly intro on the first visit of a browser session; the whole intro plays before the page shows. */
export function SiteLoader() {
  const [hidden, setHidden] = useState(false);
  const [gone, setGone] = useState(false);
  // Decided once per page load; React may run the effect twice and the second run must not see our own flag.
  const skip = useRef<boolean | null>(null);

  useEffect(() => {
    if (skip.current === null) {
      skip.current = alreadySeen();
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        // storage can be blocked; the intro then simply plays on every visit
      }
    }
    if (skip.current) {
      setGone(true);
      return;
    }
    const t = window.setTimeout(() => setHidden(true), LOADER_INTRO_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (gone) return null;
  return <ButterflyLoader hidden={hidden} onHidden={() => setGone(true)} />;
}
