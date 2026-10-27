import "@/assets/ui.css";
import "./style.css";
import { browser } from "wxt/browser";
import type { WxtStorageItem } from "wxt/utils/storage";
import { $, applyI18n, getShortcut, renderShortcut } from "@/utils/dom";
import { t } from "@/utils/i18n";
import { downscale, showToast } from "@/utils/settings";

applyI18n();
document.title = t("optionsTitle");
bindToggle($<HTMLInputElement>("#show-toast"), showToast);
bindToggle($<HTMLInputElement>("#downscale"), downscale);

const shortcutEl = $("#shortcut");
const refreshShortcut = async () => renderShortcut(shortcutEl, await getShortcut());
void refreshShortcut();
// Pick up changes made on the browser's shortcuts page when the user comes back.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refreshShortcut();
});

// Chromium has no API to change a command's shortcut; only its own settings page can.
const shortcutsPage = import.meta.env.EDGE
  ? "edge://extensions/shortcuts"
  : "chrome://extensions/shortcuts";
$("#change").addEventListener("click", () => void browser.tabs.create({ url: shortcutsPage }));

function bindToggle(
  input: HTMLInputElement,
  item: WxtStorageItem<boolean, Record<string, unknown>>,
) {
  void item.getValue().then((value) => (input.checked = value));
  input.addEventListener("change", () => void item.setValue(input.checked));
  item.watch((value) => (input.checked = value));
}
