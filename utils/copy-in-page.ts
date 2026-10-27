export type CopyResult = { ok: true } | { ok: false; error: string };

/**
 * Runs inside the captured tab via `scripting.executeScript`, where the page has
 * keyboard focus — which the async clipboard API requires and a service worker lacks.
 *
 * It is serialized into the page, so it must stay self-contained: no imports and no
 * references to anything outside the function body.
 */
export async function copyImageInPage(
  base64: string,
  toastText: string | null,
): Promise<CopyResult> {
  try {
    if (!window.isSecureContext || !navigator.clipboard?.write) {
      return { ok: false, error: "Async clipboard API is unavailable on this page" };
    }
    const blob = new Blob([Uint8Array.fromBase64(base64)], { type: "image/png" });
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  } catch (error) {
    return { ok: false, error: String(error) };
  }

  if (toastText) {
    try {
      showToast(toastText);
    } catch {
      // The copy already succeeded; a page that blocks our toast is not an error.
    }
  }
  return { ok: true };

  function showToast(text: string) {
    const marker = "data-web-shooter-toast";
    for (const old of document.querySelectorAll(`[${marker}]`)) old.remove();

    // Only inline styles and the Web Animations API: both go through CSSOM, so page
    // CSP can't block them.
    const css = (element: HTMLElement | SVGElement, rules: Record<string, string>) => {
      for (const [property, value] of Object.entries(rules)) {
        element.style.setProperty(property, value, "important");
      }
    };

    const host = document.createElement("div");
    host.setAttribute(marker, "");
    host.style.setProperty("all", "initial", "important");
    css(host, {
      position: "fixed",
      inset: "auto 0 24px 0",
      margin: "0 auto",
      width: "max-content",
      height: "auto",
      display: "block",
      background: "none",
      border: "0",
      padding: "0",
      overflow: "visible",
      "pointer-events": "none",
      "z-index": "2147483647",
    });

    const shadow = host.attachShadow({ mode: "closed" });
    const toast = document.createElement("div");
    toast.setAttribute("role", "status");
    css(toast, {
      display: "flex",
      "align-items": "center",
      gap: "8px",
      padding: "10px 16px 10px 12px",
      "border-radius": "999px",
      font: '500 14px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif',
      "letter-spacing": "-0.01em",
      color: "#fafafa",
      background: "rgb(24 24 27 / 0.92)",
      "box-shadow": "0 10px 30px rgb(0 0 0 / 0.25), inset 0 0 0 1px rgb(255 255 255 / 0.08)",
      "backdrop-filter": "blur(12px)",
    });

    const svgNs = "http://www.w3.org/2000/svg";
    const icon = document.createElementNS(svgNs, "svg");
    for (const [name, value] of Object.entries({
      viewBox: "0 0 24 24",
      width: "18",
      height: "18",
      fill: "none",
      stroke: "#4ade80",
      "stroke-width": "2.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    })) {
      icon.setAttribute(name, value);
    }
    css(icon, { flex: "none", display: "block" });
    const check = document.createElementNS(svgNs, "path");
    check.setAttribute("d", "M5 12.5l4.5 4.5L19 7.5");
    icon.append(check);

    toast.append(icon, text);
    shadow.append(toast);
    document.documentElement.append(host);

    // The top layer keeps the toast above modals and fullscreen elements.
    if ("showPopover" in host) {
      host.popover = "manual";
      host.showPopover();
    }

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    toast.animate(
      reduceMotion
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: "translateY(8px) scale(0.96)" },
            { opacity: 1, transform: "none" },
          ],
      { duration: 220, easing: "cubic-bezier(0.2, 0.9, 0.3, 1.1)" },
    );

    setTimeout(() => {
      const leave = toast.animate(
        reduceMotion
          ? [{ opacity: 1 }, { opacity: 0 }]
          : [
              { opacity: 1, transform: "none" },
              { opacity: 0, transform: "translateY(4px) scale(0.98)" },
            ],
        { duration: 180, easing: "ease-in", fill: "forwards" },
      );
      leave.onfinish = () => host.remove();
      setTimeout(() => host.remove(), 400);
    }, 1600);
  }
}

/**
 * Removes a toast still on screen from the previous shot, so it doesn't end up in the
 * next one, and waits until the page has repainted without it. Self-contained as well.
 */
export async function removeToasts(): Promise<void> {
  const toasts = document.querySelectorAll("[data-web-shooter-toast]");
  if (toasts.length === 0) return;
  for (const toast of toasts) toast.remove();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

/** How long a toast can stay on screen, enter-to-gone. */
export const TOAST_LIFETIME_MS = 2100;
