import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { BootLoader } from "./components/BootLoader";
import "./styles/app.scss";
import "./styles/ui-v2.scss";
import "@farsha/ui/styles.scss";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <BootLoader />
  </React.StrictMode>,
);
