/**
 * Pure helpers for the 6-character admin PIN entry on the login screen.
 * Kept free of React so the behaviour is unit-testable.
 */

export const PIN_LENGTH = 6;

/** The uppercased character if it is [A-Za-z0-9], otherwise "". */
export const sanitizePinChar = (c: string): string =>
  /^[A-Za-z0-9]$/.test(c) ? c.toUpperCase() : "";

/**
 * Turn pasted text into PIN cells: invalid characters are dropped, the rest
 * are uppercased, truncated to PIN_LENGTH and padded with "".
 */
export const applyPaste = (text: string): string[] => {
  const chars = Array.from(text ?? "")
    .map(sanitizePinChar)
    .filter(Boolean)
    .slice(0, PIN_LENGTH);
  return [...chars, ...Array(PIN_LENGTH - chars.length).fill("")];
};

export const pinValue = (cells: string[]): string => cells.join("");

export const isComplete = (cells: string[]): boolean =>
  cells.length === PIN_LENGTH && cells.every((c) => c.length === 1);

/** "45 s" under a minute; whole minutes (rounded up) from 60 seconds. */
export const formatRetry = (seconds: number): string => {
  const s = Math.max(0, Math.ceil(seconds));
  return s < 60 ? `${s} s` : `${Math.ceil(s / 60)} min`;
};
