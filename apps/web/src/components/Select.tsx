import { Children, Fragment, isValidElement, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Option {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
}

const text = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  if (isValidElement(node)) return text((node.props as { children?: ReactNode }).children);
  return "";
};

/** Reads <option> and <optgroup> children (also inside fragments and arrays) into a flat list. */
function readOptions(children: ReactNode, group?: string, out: Option[] = []): Option[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ value?: string | number; label?: string; disabled?: boolean; children?: ReactNode }>;
    if (el.type === "option") out.push({ value: String(el.props.value ?? text(el.props.children)), label: text(el.props.children), group, disabled: el.props.disabled });
    else if (el.type === "optgroup") readOptions(el.props.children, el.props.label, out);
    else if (el.type === Fragment) readOptions(el.props.children, group, out);
  });
  return out;
}

export interface SelectProps {
  value: string | number;
  /** Same shape as a native select's change event, so `e.target.value` keeps working. */
  onChange: (e: { target: { value: string } }) => void;
  children: ReactNode;
  className?: string;
  title?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

const GAP = 6;
const MAX_HEIGHT = 320;

/**
 * Canvylo's dropdown: a button that opens a roomy list with a check mark on the current value. It replaces the native select
 * and accepts the same <option> children. Keyboard: arrows, Enter, Esc, and typing to jump to an option.
 */
export function Select({ value, onChange, children, className = "", title, disabled, "aria-label": ariaLabel }: SelectProps) {
  const options = useMemo(() => readOptions(children), [children]);
  const current = options.find((o) => o.value === String(value));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; maxHeight: number; up: boolean } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  const choose = (o: Option | undefined) => {
    if (!o || o.disabled) return;
    onChange({ target: { value: o.value } });
    close();
  };

  // Place the list under the button, or above it when there is not enough room below.
  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const place = () => {
      const r = button.current!.getBoundingClientRect();
      const below = window.innerHeight - r.bottom - GAP - 8;
      const above = r.top - GAP - 8;
      const up = below < Math.min(MAX_HEIGHT, 200) && above > below;
      const width = Math.max(r.width, 160);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      setPos({ left, top: up ? r.top - GAP : r.bottom + GAP, width, maxHeight: Math.max(120, Math.min(MAX_HEIGHT, up ? above : below)), up });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === String(value))));
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!list.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (!list.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", outside, true);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, pos]);

  const move = (delta: number) => {
    if (!options.length) return;
    let i = active;
    for (let n = 0; n < options.length; n++) {
      i = (i + delta + options.length) % options.length;
      if (!options[i]!.disabled) break;
    }
    setActive(i);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // type to jump: letters typed quickly build one search string
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (hit >= 0) setActive(hit);
    }
  };

  const wide = className.includes("wide") ? " dd--wide" : "";
  const gap = className.includes("field--gap") ? " field--gap" : "";
  let lastGroup: string | undefined;
  return (
    <div className={`dd${wide}${gap}`}>
      <button
        ref={button}
        type="button"
        className={`dd__button${open ? " dd__button--open" : ""}`}
        title={title}
        aria-label={ariaLabel ?? title}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        onKeyDown={onKeyDown}
      >
        <span className="dd__value">{current?.label ?? String(value)}</span>
        <svg className="dd__chevron" width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open &&
        pos &&
        createPortal(
          <ul
            ref={list}
            className={`dd__list${pos.up ? " dd__list--up" : ""}`}
            role="listbox"
            style={{ left: pos.left, minWidth: pos.width, maxHeight: pos.maxHeight, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {options.map((o, i) => {
              const header = o.group && o.group !== lastGroup ? <li key={`g-${o.group}-${i}`} className="dd__group" role="presentation">{o.group}</li> : null;
              lastGroup = o.group;
              return (
                <Fragment key={`${o.value}-${i}`}>
                  {header}
                  <li
                    role="option"
                    aria-selected={o.value === String(value)}
                    data-index={i}
                    className={`dd__option${i === active ? " dd__option--active" : ""}${o.value === String(value) ? " dd__option--selected" : ""}${o.disabled ? " dd__option--disabled" : ""}`}
                    onMouseMove={() => setActive(i)}
                    onClick={() => choose(o)}
                  >
                    <span className="dd__check" aria-hidden>
                      {o.value === String(value) ? (
                        <svg width="12" height="12" viewBox="0 0 12 12">
                          <path d="M2.5 6.5l2.5 2.5 4.5-5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : null}
                    </span>
                    {o.label}
                  </li>
                </Fragment>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
