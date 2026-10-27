import { browser, type Browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { captureTab } from "@/utils/capture";
import {
  copyImageInPage,
  removeToasts,
  TOAST_LIFETIME_MS,
  type CopyResult,
} from "@/utils/copy-in-page";
import { t } from "@/utils/i18n";
import { commandMode, type CaptureMode, type Message } from "@/utils/messages";
import { downscale, showToast } from "@/utils/settings";

export default defineBackground({
  type: "module",
  main() {
    /** Give up on handing a screenshot to the popup after this long. */
    const PENDING_TTL_MS = 10_000;

    let busy = false;
    /** A screenshot the page couldn't copy, waiting for the popup to pick it up. */
    let pending: { png: string; at: number } | null = null;
    /** Our last toast, which may still be on screen. */
    let lastToast: { tabId: number; at: number } | null = null;
    let badgeTimer: ReturnType<typeof setTimeout> | undefined;

    browser.commands.onCommand.addListener((command, tab) => {
      const mode = commandMode(command);
      if (!mode || busy) return;
      busy = true;
      void shoot(tab, mode).finally(() => (busy = false));
    });

    browser.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
      if (message.type !== "take-pending") return;
      sendResponse(pending && Date.now() - pending.at < PENDING_TTL_MS ? pending.png : null);
      pending = null;
    });

    async function shoot(
      commandTab: Browser.tabs.Tab | undefined,
      mode: CaptureMode,
    ): Promise<void> {
      const tab =
        commandTab?.id !== undefined
          ? commandTab
          : (await browser.tabs.query({ active: true, lastFocusedWindow: true }))[0];
      if (tab?.id === undefined) return;

      const [toastEnabled, downscaleEnabled] = await Promise.all([
        showToast.getValue(),
        downscale.getValue(),
      ]);

      if (lastToast?.tabId === tab.id && Date.now() - lastToast.at < TOAST_LIFETIME_MS) {
        await browser.scripting
          .executeScript({ target: { tabId: tab.id }, func: removeToasts })
          .catch(() => {});
      }

      let png: string;
      try {
        png = await captureTab({ ...tab, id: tab.id }, mode, downscaleEnabled);
      } catch (error) {
        // No activeTab grant (restricted page, or a Chrome "Global" shortcut, which
        // doesn't grant it), the 2-captures-per-second quota, or (full page) another
        // debugger already attached.
        console.warn("Capture failed:", error);
        return flashBadge("error", t("errorGeneric", errorMessage(error)));
      }

      const toast = mode === "fullPage" ? t("toastCopiedFullPage") : t("toastCopied");
      if (await copyInTab(tab.id, png, toastEnabled ? toast : null)) {
        if (toastEnabled) lastToast = { tabId: tab.id, at: Date.now() };
        return flashBadge("ok");
      }

      // The page couldn't take the clipboard write (restricted URL, insecure context,
      // focus elsewhere…). Our popup is a focused extension page, so let it copy instead.
      pending = { png, at: Date.now() };
      try {
        await openPopup();
      } catch (error) {
        pending = null;
        console.error("Couldn't open the popup to copy:", error);
        flashBadge("error", t("errorGeneric", errorMessage(error)));
      }
    }

    async function copyInTab(tabId: number, png: string, toast: string | null): Promise<boolean> {
      try {
        const [injection] = await browser.scripting.executeScript({
          target: { tabId },
          func: copyImageInPage,
          args: [png, toast],
        });
        const result = injection?.result as CopyResult | undefined;
        if (result?.ok) return true;
        console.warn("In-page copy failed:", result?.error);
      } catch (error) {
        console.warn("Couldn't run in the page:", error);
      }
      return false;
    }

    async function openPopup(): Promise<void> {
      try {
        await browser.action.openPopup();
      } catch {
        // No focused browser window to anchor the popup to.
        await browser.windows.create({
          url: browser.runtime.getURL("/popup.html?fallback"),
          type: "popup",
          width: 320,
          height: 340,
          focused: true,
        });
      }
    }

    function errorMessage(error: unknown): string {
      return error instanceof Error ? error.message : String(error);
    }

    function flashBadge(kind: "ok" | "error", title?: string): void {
      clearTimeout(badgeTimer);
      void browser.action.setBadgeBackgroundColor({ color: kind === "ok" ? "#16a34a" : "#dc2626" });
      void browser.action.setBadgeText({ text: kind === "ok" ? "✓" : "!" });
      if (title) void browser.action.setTitle({ title });
      badgeTimer = setTimeout(
        () => {
          void browser.action.setBadgeText({ text: "" });
          void browser.action.setTitle({ title: t("extName") });
        },
        kind === "ok" ? 1500 : 5000,
      );
    }
  },
});
