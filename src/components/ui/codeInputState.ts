/**
 * Pure transitions for the six-box code entry.
 *
 * The code is a fixed-length array, not a string. A string cannot hold a gap, so
 * clearing a middle box would shift every later digit one place left — which
 * both corrupts the code and breaks backspace-on-empty, since that depends on
 * knowing whether *this* box is empty.
 */
export type CodeDigits = string[];

export const CODE_LENGTH = 6;

export const emptyCode = (length = CODE_LENGTH): CodeDigits => Array.from({ length }, () => '');

export const codeToString = (value: CodeDigits): string => value.join('');

export const isCodeComplete = (value: CodeDigits): boolean =>
  value.length > 0 && value.every((digit) => digit !== '');

export const digitsOnly = (text: string): string => text.replace(/\D/g, '');

/** Normalise any incoming value to exactly `length` slots. */
export function normalise(value: CodeDigits, length = CODE_LENGTH): CodeDigits {
  return Array.from({ length }, (_, index) => value[index] ?? '');
}

export function setDigit(value: CodeDigits, index: number, digit: string): CodeDigits {
  const next = normalise(value, value.length || CODE_LENGTH);
  next[index] = digit;
  return next;
}

export interface WriteResult {
  digits: CodeDigits;
  /** The box that should take focus next. */
  cursor: number;
}

/** Write a run of digits starting at `start`, leaving earlier boxes untouched. */
export function writeFrom(value: CodeDigits, start: number, incoming: string): WriteResult {
  const length = value.length || CODE_LENGTH;
  const next = normalise(value, length);
  let cursor = start;
  for (const digit of digitsOnly(incoming)) {
    if (cursor >= length) break;
    next[cursor] = digit;
    cursor += 1;
  }
  return { digits: next, cursor };
}

/**
 * Backspace. On a filled box the browser's own delete is enough; on an empty one
 * we step back and clear the previous box.
 */
export function backspace(value: CodeDigits, index: number): { digits: CodeDigits; focus: number } | null {
  const next = normalise(value, value.length || CODE_LENGTH);
  if (next[index] || index === 0) return null;
  next[index - 1] = '';
  return { digits: next, focus: index - 1 };
}

/**
 * Paste. A full-length paste fills from the first box wherever it was dropped —
 * that is what someone copying six digits out of an email means by it.
 */
export function paste(value: CodeDigits, index: number, text: string): WriteResult | null {
  const incoming = digitsOnly(text);
  if (!incoming) return null;
  const length = value.length || CODE_LENGTH;
  return writeFrom(value, incoming.length >= length ? 0 : index, incoming);
}
