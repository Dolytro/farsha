import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { BootLoader } from "./components/BootLoader";
import "./styles/app.scss";
import "./styles/ui-v2.scss";
import "@farsha/ui/styles.scss";
import { AnalyticsConsent } from "@farsha/ui/analytics";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <BootLoader />
    <AnalyticsConsent gaId={import.meta.env.VITE_GA_ID} />
  </React.StrictMode>,
);

// Open the editor offline once it has been loaded (production only: the dev server must never be cached)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => undefined);
  });
}
