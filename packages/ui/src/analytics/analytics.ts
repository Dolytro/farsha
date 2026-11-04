/** Google Analytics 4, loaded only after the visitor accepts. Nothing is sent or stored before that. */

export const CONSENT_KEY = "farsha-analytics-consent";
export type Consent = "granted" | "denied";

type Win = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; __farshaGa?: string };

/** True when the browser asks not to be tracked (Global Privacy Control or Do Not Track). */
export function trackingOptOut(): boolean {
  if (typeof navigator === "undefined") return true;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1" || nav.msDoNotTrack === "1";
}

export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function saveConsent(value: Consent): void {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* storage can be blocked; the choice then lasts for this page view only */
  }
}

/** Measurement IDs look like G-XXXXXXXXXX. Anything else is ignored so a bad setting cannot inject a script URL. */
export function validGaId(id: string | undefined): id is string {
  return typeof id === "string" && /^G-[A-Z0-9]{4,20}$/.test(id);
}

export function loadAnalytics(id: string): void {
  const w = window as Win;
  if (w.__farshaGa === id) return;
  w.__farshaGa = id;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag("js", new Date());
  w.gtag("config", id, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

/** Turns Google Analytics off for this page and removes its cookies (used when a visitor withdraws consent). */
export function disableAnalytics(id: string): void {
  const w = window as unknown as Record<string, unknown>;
  w[`ga-disable-${id}`] = true;
  const host = location.hostname;
  const bare = host.replace(/^www\./, "");
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0].trim();
    if (name === "_ga" || name.startsWith("_ga_") || name === "_gid" || name.startsWith("_gat")) {
      for (const domain of [host, `.${bare}`, ""]) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ""}`;
      }
    }
  }
}

/** Undo disableAnalytics for a visitor who accepts later. */
export function enableAnalytics(id: string): void {
  (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = false;
}

export const OPEN_EVENT = "farsha:cookie-settings";
