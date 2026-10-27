import { browser, type Browser } from "wxt/browser";
import type { CaptureMode } from "./messages";

/** Larger screenshots exceed the GPU texture limit and come back blank or tiled. */
export const MAX_CAPTURE_PX = 16_384;

/** Factor that brings a capture back to CSS pixels, or 1 when it already is. */
export function cssScale(capturedWidth: number, cssWidth: number | undefined): number {
  if (!cssWidth || capturedWidth <= cssWidth) return 1;
  return cssWidth / capturedWidth;
}

export type CaptureClip = { x: number; y: number; width: number; height: number; scale: number };

/**
 * Clip for `Page.captureScreenshot`. `scale` multiplies device pixels, so 1/dpr gives
 * CSS-pixel output. Pages too big for the texture limit drop to 1x first, then get cut.
 */
export function fullPageClip(
  content: { width: number; height: number },
  dpr: number,
  downscale: boolean,
): CaptureClip {
  let scale = downscale ? 1 / dpr : 1;
  if (Math.max(content.width, content.height) * dpr * scale > MAX_CAPTURE_PX) {
    scale = Math.min(scale, 1 / dpr);
  }
  const maxCss = MAX_CAPTURE_PX / (dpr * scale);
  return {
    x: 0,
    y: 0,
    width: Math.min(content.width, maxCss),
    height: Math.min(content.height, maxCss),
    scale,
  };
}

/** Captures `tab` in the given mode as base64 PNG. */
export function captureTab(
  tab: Browser.tabs.Tab & { id: number },
  mode: CaptureMode,
  downscale: boolean,
): Promise<string> {
  return mode === "fullPage"
    ? captureFullPage(tab.id, { downscale })
    : captureVisibleTab(tab.windowId, { downscale, cssWidth: tab.width });
}

/**
 * Page expression resolving once the viewport has gone 150 ms without a resize (at most
 * 1.5 s), plus two frames to paint the final layout.
 */
const WAIT_FOR_STABLE_VIEWPORT = `new Promise((resolve) => {
  let timer;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    removeEventListener("resize", restart);
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  };
  const restart = () => {
    clearTimeout(timer);
    timer = setTimeout(finish, 150);
  };
  addEventListener("resize", restart);
  restart();
  setTimeout(finish, 1500);
})`;

/**
 * Captures the whole page, beyond the viewport, through the Chrome DevTools Protocol —
 * the same call as DevTools' "Capture full size screenshot". Needs `debugger`; Chrome
 * shows its "started debugging this browser" bar while attached.
 */
export async function captureFullPage(
  tabId: number,
  options: { downscale: boolean },
): Promise<string> {
  const target = { tabId };
  const send = async <Result extends object>(method: string, params?: object) => {
    const result = await browser.debugger.sendCommand<object, Result>(target, method, params);
    if (!result) throw new Error(`${method} returned nothing`);
    return result;
  };

  await browser.debugger.attach(target, "1.3");
  try {
    // Attaching slides in Chrome's debugging bar, which shrinks the viewport over a few
    // frames. Capturing mid-slide measures a stale page size and returns the rendered
    // part tiled over the rest, so wait until resizes stop.
    await send("Runtime.evaluate", { expression: WAIT_FOR_STABLE_VIEWPORT, awaitPromise: true });
    const [metrics, dpr] = await Promise.all([
      send<{ cssContentSize: { width: number; height: number } }>("Page.getLayoutMetrics"),
      send<{ result: { value: number } }>("Runtime.evaluate", {
        expression: "window.devicePixelRatio",
        returnByValue: true,
      }),
    ]);
    const { data } = await send<{ data: string }>("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: fullPageClip(metrics.cssContentSize, dpr.result.value, options.downscale),
    });
    return data;
  } finally {
    await browser.debugger.detach(target).catch(() => {});
  }
}

/**
 * Captures the visible area of the active tab in `windowId` as base64 PNG.
 * Requires `activeTab` (granted by our command / toolbar button) or host access.
 */
export async function captureVisibleTab(
  windowId: number,
  options: { downscale: boolean; cssWidth?: number },
): Promise<string> {
  const dataUrl = await browser.tabs.captureVisibleTab(windowId, { format: "png" });
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  if (!options.downscale) return base64;

  const bitmap = await createImageBitmap(
    new Blob([Uint8Array.fromBase64(base64)], { type: "image/png" }),
  );
  const scale = cssScale(bitmap.width, options.cssWidth);
  if (scale === 1) {
    bitmap.close();
    return base64;
  }

  const canvas = new OffscreenCanvas(
    Math.round(bitmap.width * scale),
    Math.round(bitmap.height * scale),
  );
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is unavailable");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: "image/png" });
  return new Uint8Array(await blob.arrayBuffer()).toBase64();
}

/** Writes a base64 PNG to the clipboard from an extension page (popup). */
export async function writePngToClipboard(base64: string): Promise<void> {
  const blob = new Blob([Uint8Array.fromBase64(base64)], { type: "image/png" });
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}
