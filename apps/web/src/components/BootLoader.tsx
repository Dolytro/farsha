import { useEffect, useState } from "react";
import { ButterflyLoader } from "@farsha/ui";
import { useEditor } from "../store";
import { parseRoute } from "../route";

const MIN_VISIBLE_MS = 1500;
const isViewer = parseRoute(window.location.pathname, window.location.search).kind === "viewer";

/** Butterfly screen shown while the editor boots; it fades out once sign-in state and the design are ready. */
export function BootLoader() {
  const authChecked = useEditor((s) => s.drive.checked);
  const loadState = useEditor((s) => s.loadState);
  const [waited, setWaited] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setWaited(true), MIN_VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, []);

  const devBypass = import.meta.env.DEV && new URLSearchParams(window.location.search).has("nologin");
  const ready = waited && (isViewer ? loadState !== "loading" : authChecked || devBypass);
  if (gone) return null;
  return <ButterflyLoader hidden={ready} onHidden={() => setGone(true)} />;
}
