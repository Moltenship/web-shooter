export const COMMAND = "take-screenshot";

/** Popup → background: hand over the screenshot the page itself couldn't copy. */
export type Message = { type: "take-pending" };
