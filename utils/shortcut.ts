const MAC_MODIFIERS = "⌃⌥⇧⌘";

/**
 * Splits a browser-formatted shortcut into key caps.
 * "Alt+Shift+S" → ["Alt", "Shift", "S"]; Chrome on macOS reports "⌥⇧S" → ["⌥", "⇧", "S"].
 */
export function shortcutKeys(shortcut: string | undefined): string[] {
  if (!shortcut) return [];
  if (shortcut.includes("+")) return shortcut.split("+");

  const keys: string[] = [];
  let rest = shortcut;
  while (rest && MAC_MODIFIERS.includes(rest[0]!)) {
    keys.push(rest[0]!);
    rest = rest.slice(1);
  }
  if (rest) keys.push(rest);
  return keys;
}
