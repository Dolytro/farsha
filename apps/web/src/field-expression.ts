/**
 * Evaluate what was typed in a number field: a plain number, a sum such as "100+20" or "(8+4)*2", or an operator in front of the old
 * value ("*2", "+10", "/2", "-5"). Only numbers, + - * / and brackets are understood (no names, no exponents), so nothing typed can run code.
 * Returns null when the text is not such an expression.
 */
export function evalFieldExpression(text: string, current: number): number | null {
  const src = text.replace(/\s+/g, "").replace(/,/g, ".");
  if (!src || src.length > 80 || !/^[0-9+\-*/().]+$/.test(src)) return null;
  // an operator first means "apply this to the old value" (a lone minus sign before a number is just a negative number)
  const tokens = src.match(/\d+\.?\d*|\.\d+|[+\-*/()]/g);
  if (!tokens || tokens.join("") !== src) return null;
  const relative = /^[*/+]/.test(src) || (src[0] === "-" && /^-(?:\d+\.?\d*|\.\d+)?$/.test(src) === false && false);
  let pos = 0;
  const peek = () => tokens[pos];
  const number = (): number | null => {
    const t = peek();
    if (t === undefined) return null;
    if (t === "(") {
      pos++;
      const v = sum();
      if (v === null || peek() !== ")") return null;
      pos++;
      return v;
    }
    if (t === "-") {
      pos++;
      const v = number();
      return v === null ? null : -v;
    }
    if (t === "+") {
      pos++;
      return number();
    }
    if (/^[\d.]/.test(t)) {
      pos++;
      const v = Number(t);
      return Number.isFinite(v) ? v : null;
    }
    return null;
  };
  const product = (): number | null => {
    let v = number();
    while (v !== null && (peek() === "*" || peek() === "/")) {
      const op = tokens[pos++];
      const r = number();
      if (r === null) return null;
      v = op === "*" ? v * r : r === 0 ? null : v / r;
    }
    return v;
  };
  const sum = (): number | null => {
    let v = product();
    while (v !== null && (peek() === "+" || peek() === "-")) {
      const op = tokens[pos++];
      const r = product();
      if (r === null) return null;
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  let value: number | null;
  if (relative) {
    // "*2", "/2", "+10": the old value stands in front
    pos = 0;
    value = null;
    const whole = evalFieldExpression(`${current}${src}`.replace(/^(-?[\d.]+(?:e[+-]?\d+)?)/i, (m) => `(${m})`), current);
    return whole !== null && Number.isFinite(whole) ? Math.round(whole * 100) / 100 : null;
  }
  value = sum();
  if (value === null || pos !== tokens.length || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

/** True while the text is still a plain number being typed (digits, a minus sign, one dot): the field's own handler can see it. */
export const isPlainNumberText = (text: string): boolean => /^-?\d*\.?\d*$/.test(text);
