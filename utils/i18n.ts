import { browser } from "wxt/browser";
import type messages from "../public/_locales/en/messages.json";

export type MessageKey = keyof typeof messages;

export function t(key: MessageKey, ...substitutions: string[]): string {
  return browser.i18n.getMessage(key, substitutions);
}
