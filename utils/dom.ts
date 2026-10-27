import { browser } from "wxt/browser";
import { t, type MessageKey } from "./i18n";
import { COMMANDS, type CaptureMode } from "./messages";
import { shortcutKeys } from "./shortcut";

export function $<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

/** Fills `data-i18n` (text) and `data-i18n-title` (tooltip) attributes. */
export function applyI18n(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n as MessageKey);
  }
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n-title]")) {
    el.title = t(el.dataset.i18nTitle as MessageKey);
    el.setAttribute("aria-label", el.title);
  }
}

/** Fills every `[data-shortcut="<mode>"]` element with that command's key caps. */
export async function renderShortcuts(root: ParentNode = document): Promise<void> {
  const commands = await browser.commands.getAll();
  for (const el of root.querySelectorAll<HTMLElement>("[data-shortcut]")) {
    const name = COMMANDS[el.dataset.shortcut as CaptureMode];
    renderShortcut(el, commands.find((command) => command.name === name)?.shortcut ?? "");
  }
}

function renderShortcut(container: HTMLElement, shortcut: string): void {
  const keys = shortcutKeys(shortcut);
  if (keys.length === 0) {
    const empty = document.createElement("span");
    empty.className = "muted";
    empty.textContent = t("shortcutNotSet");
    container.replaceChildren(empty);
    return;
  }
  container.replaceChildren(
    ...keys.map((key) => {
      const kbd = document.createElement("kbd");
      kbd.textContent = key;
      return kbd;
    }),
  );
}
