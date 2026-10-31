import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/app.scss";
import "./styles/ui-v2.scss";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
