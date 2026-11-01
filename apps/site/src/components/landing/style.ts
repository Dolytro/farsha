import type { CSSProperties } from "react";

/** Lets inline styles carry custom properties (`--c`, `--i`, ...) without a cast at every use. */
export const s = (style: Record<string, string>) => style as CSSProperties;
