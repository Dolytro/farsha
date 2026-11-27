import { useEffect, useState } from "react";
import { parseHexAlpha } from "../hex";

/** The hex field next to a colour swatch: type a colour and press Enter (or leave the field) to apply it. */
export function HexInput({ value, onChange, onAlpha }: { value: string; onChange: (hex: string) => void; /** Given when 8 (or 4) digits are typed: the colour comes with an opacity, like Figma. */ onAlpha?: (alpha: number, hex: string) => void }) {
  const shown = value.replace("#", "").toUpperCase();
  const [draft, setDraft] = useState(shown);
  useEffect(() => setDraft(shown), [shown]);
  const commit = () => {
    const parsed = parseHexAlpha(draft);
    if (parsed && parsed.alpha !== undefined && onAlpha) onAlpha(parsed.alpha, parsed.hex);
    else if (parsed && parsed.alpha === undefined && parsed.hex !== value.toLowerCase()) onChange(parsed.hex);
    else setDraft(shown);
  };
  return (
    <input
      className="fill-row__hex fill-row__hex--input"
      value={draft}
      spellCheck={false}
      maxLength={9}
      aria-label="Hex colour"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") e.currentTarget.blur();
        else if (e.key === "Escape") {
          setDraft(shown);
          e.currentTarget.blur();
        }
      }}
    />
  );
}
