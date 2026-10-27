import "@/assets/ui.css";
import "./style.css";
import { browser } from "wxt/browser";
import { captureVisibleTab, writePngToClipboard } from "@/utils/capture";
import { $, applyI18n, getShortcut, renderShortcut } from "@/utils/dom";
import { t } from "@/utils/i18n";
import type { Message } from "@/utils/messages";
import { downscale } from "@/utils/settings";

const captureButton = $<HTMLButtonElement>("#capture");
const captureLabel = $("#capture span");
const status = $("#status");
const preview = $<HTMLImageElement>("#preview");

/** A screenshot whose clipboard write failed; the button retries it instead of re-capturing. */
let retryImage: string | null = null;

/**
 * Opened as a standalone window by the background, only to deliver a screenshot. Its
 * "current window" is itself, so capturing from here would shoot the wrong thing.
 */
const isFallbackWindow = new URLSearchParams(location.search).has("fallback");

applyI18n();
$("#settings").addEventListener("click", () => {
  void browser.runtime.openOptionsPage();
  window.close();
});
captureButton.addEventListener("click", () => {
  if (retryImage) void deliver(retryImage, isFallbackWindow);
  else if (!isFallbackWindow) void captureAndCopy();
});
void getShortcut().then((shortcut) => renderShortcut($("#shortcut"), shortcut));

// Opened by the background because the page itself couldn't take the clipboard write.
const pending: string | null = await browser.runtime.sendMessage({
  type: "take-pending",
} satisfies Message);
if (pending) await deliver(pending, true);
else if (isFallbackWindow) window.close();

async function captureAndCopy(): Promise<void> {
  setBusy(true);
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    const png = await captureVisibleTab(tab.windowId, {
      downscale: await downscale.getValue(),
      cssWidth: tab.width,
    }).catch((error: unknown) => {
      console.warn("Capture failed:", error);
      setStatus(t("errorGeneric", error instanceof Error ? error.message : String(error)), "error");
      return null;
    });
    if (png) await deliver(png, false);
  } finally {
    setBusy(false);
  }
}

async function deliver(png: string, closeWhenDone: boolean): Promise<void> {
  preview.src = `data:image/png;base64,${png}`;
  preview.hidden = false;
  try {
    // A freshly opened window may not have focus yet, and the clipboard needs it.
    if (!document.hasFocus()) await focusOrTimeout(1000);
    await writePngToClipboard(png);
    retryImage = null;
    setStatus(t("popupCopied"), "ok");
    if (closeWhenDone) setTimeout(() => window.close(), 900);
  } catch (error) {
    // Usually a focus problem; a click on the button gives the page focus and activation.
    retryImage = png;
    setStatus(t("errorGeneric", String(error)), "error");
  }
}

function setBusy(busy: boolean): void {
  captureButton.disabled = busy;
  captureLabel.textContent = t(busy ? "popupCapturing" : "popupCapture");
}

function setStatus(text: string, kind: "ok" | "error"): void {
  status.textContent = text;
  status.dataset.kind = kind;
  status.hidden = false;
}

function focusOrTimeout(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.addEventListener("focus", () => resolve(), { once: true });
    setTimeout(resolve, ms);
  });
}
