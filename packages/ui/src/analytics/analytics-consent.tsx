"use client";

import { useEffect, useState } from "react";
import { OPEN_EVENT, disableAnalytics, enableAnalytics, loadAnalytics, readConsent, saveConsent, trackingOptOut, validGaId, type Consent } from "./analytics";

type Props = {
  /** GA4 measurement ID (G-XXXXXXXXXX). Without a valid one the component renders nothing and loads nothing. */
  gaId?: string;
  /** Where the privacy policy lives. */
  privacyHref?: string;
};

const buttonStyle = {
  flex: 1,
  height: 38,
  padding: "0 14px",
  borderRadius: 8,
  background: "#221f2e",
  color: "#f2f0fa",
  border: "1px solid #5a5478",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
} as const;

/**
 * Cookie consent for Google Analytics (opt-in, as the EU requires): nothing loads or is stored until the visitor
 * accepts, "Accept" and "Decline" look the same, the choice can be changed later from "Cookie settings", and a
 * browser that sends Global Privacy Control or Do Not Track is never asked.
 */
export function AnalyticsConsent({ gaId, privacyHref = "/privacy" }: Props) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Consent | null>(null);

  useEffect(() => {
    if (!validGaId(gaId) || trackingOptOut()) return;
    const stored = readConsent();
    setCurrent(stored);
    if (stored === "granted") loadAnalytics(gaId);
    else if (stored === null) setOpen(true);
    const reopen = () => {
      setCurrent(readConsent());
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, [gaId]);

  if (!open || !validGaId(gaId)) return null;

  const choose = (value: Consent) => {
    saveConsent(value);
    setCurrent(value);
    setOpen(false);
    if (value === "granted") {
      enableAnalytics(gaId);
      loadAnalytics(gaId);
    } else {
      disableAnalytics(gaId);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie settings"
      style={{
        position: "fixed",
        left: 16,
        bottom: 16,
        zIndex: 2147483000,
        maxWidth: 380,
        padding: 16,
        borderRadius: 14,
        background: "#17151f",
        color: "#f2f0fa",
        border: "1px solid #34304a",
        boxShadow: "0 12px 40px rgba(0,0,0,.45)",
        fontFamily: "'Geist','Segoe UI',system-ui,sans-serif",
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: 14 }}>Cookies</p>
      <p style={{ margin: "0 0 12px" }}>
        Farsha would like to use Google Analytics cookies to count visits and see which pages are useful. They are off unless you accept,
        and your designs are never sent.{" "}
        <a href={privacyHref} style={{ color: "#a99bff" }}>
          Privacy policy
        </a>
        {current ? ` (your current choice: ${current === "granted" ? "accepted" : "declined"})` : ""}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => choose("denied")} style={buttonStyle}>
          Decline
        </button>
        <button type="button" onClick={() => choose("granted")} style={buttonStyle}>
          Accept
        </button>
      </div>
    </div>
  );
}

/** A footer link that reopens the cookie choice. Renders nothing when analytics is not configured. */
export function CookieSettingsLink({ gaId }: { gaId?: string }) {
  if (!validGaId(gaId)) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "inherit", textDecoration: "underline", cursor: "pointer" }}
    >
      Cookie settings
    </button>
  );
}
