import { browser } from "wxt/browser";

/** Factor that brings a capture back to CSS pixels, or 1 when it already is. */
export function cssScale(capturedWidth: number, cssWidth: number | undefined): number {
  if (!cssWidth || capturedWidth <= cssWidth) return 1;
  return cssWidth / capturedWidth;
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
