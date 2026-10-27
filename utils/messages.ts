/** Manifest command name for each capture mode. */
export const COMMANDS = {
  visible: "take-screenshot",
  fullPage: "take-full-page-screenshot",
} as const;

export type CaptureMode = keyof typeof COMMANDS;

export function commandMode(command: string): CaptureMode | undefined {
  return (Object.keys(COMMANDS) as CaptureMode[]).find((mode) => COMMANDS[mode] === command);
}

/** Popup → background: hand over the screenshot the page itself couldn't copy. */
export type Message = { type: "take-pending" };
