/**
 * Google sign-in via Google Identity Services (token model). No client secret is
 * involved: the access token lives in memory/sessionStorage and expires after ~1 hour.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
export const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

/** drive.file: the app can only see files it created or the user explicitly opened with it. */
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const STORAGE_KEY = "canvylo.drive.token";

export const driveConfigured = Boolean(CLIENT_ID && API_KEY);

interface Token {
  value: string;
  expiresAt: number;
}

interface TokenResponse {
  access_token: string;
  expires_in: string | number;
  error?: string;
}

interface GisTokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

interface Gis {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (r: TokenResponse) => void;
        error_callback: (e: { type: string }) => void;
      }) => GisTokenClient;
    };
  };
}

declare global {
  interface Window {
    google?: Gis;
  }
}

function readStored(): Token | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as Token;
    return t.expiresAt > Date.now() + 30_000 ? t : null;
  } catch {
    return null;
  }
}

let token: Token | null = readStored();

/** A still-valid access token, or null when the user needs to sign in again. */
export function getToken(): string | null {
  return token && token.expiresAt > Date.now() + 30_000 ? token.value : null;
}

let gisLoading: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google) return Promise.resolve();
  gisLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisLoading = null;
      reject(new Error("Could not load Google sign-in"));
    };
    document.head.appendChild(s);
  });
  return gisLoading;
}

/** Opens Google's consent popup. Must be called from a user gesture (click). */
export async function signIn(): Promise<string> {
  if (!CLIENT_ID) throw new Error("Google Drive is not configured");
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (r.error || !r.access_token) {
          reject(new Error(r.error ?? "Sign-in failed"));
          return;
        }
        token = { value: r.access_token, expiresAt: Date.now() + Number(r.expires_in) * 1000 };
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(token));
        } catch {
          /* sessionStorage unavailable: the token still works for this page load */
        }
        resolve(token.value);
      },
      error_callback: (e) => reject(new Error(e.type === "popup_closed" ? "Sign-in cancelled" : e.type)),
    });
    client.requestAccessToken();
  });
}

export function signOut(): void {
  token = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}
