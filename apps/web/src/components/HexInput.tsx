import { useEffect, useState } from "react";
import { parseHex } from "../hex";

/** The hex field next to a colour swatch: type a colour and press Enter (or leave the field) to apply it. */
export function HexInput({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const shown = value.replace("#", "").toUpperCase();
  const [draft, setDraft] = useState(shown);
  useEffect(() => setDraft(shown), [shown]);
  const commit = () => {
    const hex = parseHex(draft);
    if (hex && hex !== value.toLowerCase()) onChange(hex);
    else setDraft(shown);
  };
  return (
    <input
      className="fill-row__hex fill-row__hex--input"
      value={draft}
      spellCheck={false}
      maxLength={7}
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
