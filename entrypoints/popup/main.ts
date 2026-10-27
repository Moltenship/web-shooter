import "@/assets/ui.css";
import "./style.css";
import { browser } from "wxt/browser";
import { captureTab, writePngToClipboard } from "@/utils/capture";
import { $, applyI18n, renderShortcuts } from "@/utils/dom";
import { t, type MessageKey } from "@/utils/i18n";
import type { CaptureMode, Message } from "@/utils/messages";
import { downscale } from "@/utils/settings";

const LABELS: Record<CaptureMode, MessageKey> = {
  visible: "captureVisible",
  fullPage: "captureFullPage",
};

const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-mode]")];
const status = $("#status");
const preview = $<HTMLImageElement>("#preview");

/** A screenshot whose clipboard write failed; the buttons retry it instead of re-capturing. */
let retryImage: string | null = null;

/**
 * Opened as a standalone window by the background, only to deliver a screenshot. Its
 * "current window" is itself, so capturing from here would shoot the wrong thing.
 */
const isFallbackWindow = new URLSearchParams(location.search).has("fallback");

applyI18n();
void renderShortcuts();
$("#settings").addEventListener("click", () => {
  void browser.runtime.openOptionsPage();
  window.close();
});
for (const button of buttons) {
  button.addEventListener("click", () => {
    if (retryImage) void deliver(retryImage, isFallbackWindow);
    else if (!isFallbackWindow) void captureAndCopy(button);
  });
}

// Opened by the background because the page itself couldn't take the clipboard write.
const pending: string | null = await browser.runtime.sendMessage({
  type: "take-pending",
} satisfies Message);
if (pending) await deliver(pending, true);
else if (isFallbackWindow) window.close();

async function captureAndCopy(button: HTMLButtonElement): Promise<void> {
  const mode = button.dataset.mode as CaptureMode;
  setBusy(button, true);
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) return;
    const png = await captureTab({ ...tab, id: tab.id }, mode, await downscale.getValue()).catch(
      (error: unknown) => {
        console.warn("Capture failed:", error);
        setStatus(
          t("errorGeneric", error instanceof Error ? error.message : String(error)),
          "error",
        );
        return null;
      },
    );
    if (png) await deliver(png, false);
  } finally {
    setBusy(button, false);
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
    // Usually a focus problem; a click on a button gives the page focus and activation.
    retryImage = png;
    setStatus(t("errorGeneric", String(error)), "error");
  }
}

function setBusy(active: HTMLButtonElement, busy: boolean): void {
  for (const button of buttons) button.disabled = busy;
  const label = active.querySelector("span")!;
  label.textContent = t(busy ? "popupCapturing" : LABELS[active.dataset.mode as CaptureMode]);
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
