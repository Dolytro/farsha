"use client";

import { useEffect, useState } from "react";
import { OPEN_EVENT, disableAnalytics, enableAnalytics, loadAnalytics, readConsent, saveConsent, trackingOptOut, validGaId, type Consent } from "./analytics";

type Props = {
  /** GA4 measurement ID (G-XXXXXXXXXX). Without a valid one the component renders nothing and loads nothing. */
  gaId?: string;
  /** Where the privacy policy lives. */
  privacyHref?: string;
};

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
    <div role="dialog" aria-label="Cookie settings" className="cookie-consent">
      <p className="cookie-consent__title">Cookies</p>
      <p className="cookie-consent__text">
        Farsha would like to use Google Analytics cookies to count visits and see which pages are useful. They are off unless you accept,
        and your designs are never sent.{" "}
        <a className="cookie-consent__link" href={privacyHref}>
          Privacy policy
        </a>
        {current ? ` (your current choice: ${current === "granted" ? "accepted" : "declined"})` : ""}
      </p>
      <div className="cookie-consent__actions">
        <button type="button" onClick={() => choose("denied")} className="cookie-consent__button">
          Decline
        </button>
        <button type="button" onClick={() => choose("granted")} className="cookie-consent__button">
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
      className="cookie-settings-link"
    >
      Cookie settings
    </button>
  );
}
