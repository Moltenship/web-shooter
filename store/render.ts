/// <reference types="node" />
/**
 * Renders the Chrome Web Store screenshots and promo tiles into store/.
 *
 *   vp run build && vp run store
 *
 * First captures the real extension UI (popup, settings, on-page toast) from the build in
 * .output/chrome-mv3, then lays those captures out with store/src/shots.html.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { copyImageInPage } from "../utils/copy-in-page.ts";

const root = join(import.meta.dirname, "..");
const extension = join(root, ".output/chrome-mv3");
const src = join(import.meta.dirname, "src");
const captures = join(src, "captures");
/** Wide page for the whole-page shot; compact one so the toast fits in the other frames. */
const WIDE = { width: 1280, height: 760 };
const COMPACT = { width: 1100, height: 500 };

if (!existsSync(extension)) throw new Error("Build the extension first: vp run build");
await mkdir(captures, { recursive: true });

// The in-page copy needs a secure context, so serve the demo site from localhost.
const landingHtml = await readFile(join(src, "landing.html"));
const server = createServer((_, res) =>
  res.setHeader("content-type", "text/html").end(landingHtml),
);
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const landingUrl = `http://localhost:${(server.address() as AddressInfo).port}/`;

const context = await chromium.launchPersistentContext("", {
  channel: "chromium",
  headless: true,
  viewport: WIDE,
  deviceScaleFactor: 2,
  permissions: ["clipboard-read", "clipboard-write"],
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
try {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const extensionUrl = (path: string) => `chrome-extension://${new URL(worker.url()).host}/${path}`;

  const landing = await context.newPage();
  await landing.goto(landingUrl);

  // The real toast, exactly as the extension injects it.
  const toast = async (text: string, file: string) => {
    const png = (await landing.screenshot()).toString("base64");
    await landing.evaluate(
      `(${copyImageInPage.toString()})(${JSON.stringify(png)}, ${JSON.stringify(text)})`,
    );
    await landing.waitForTimeout(450);
    await landing.screenshot({ path: join(captures, file) });
    await landing.waitForFunction(() => !document.querySelector("[data-web-shooter-toast]"));
  };
  await landing.screenshot({ path: join(captures, "landing-full.png"), fullPage: true });
  await toast("Whole page copied", "landing-wide-toast.png");

  await landing.setViewportSize(COMPACT);
  const base64 = (await landing.screenshot({ path: join(captures, "landing.png") })).toString(
    "base64",
  );
  await toast("Screenshot copied", "landing-toast.png");

  const popup = await context.newPage();
  await popup.setViewportSize({ width: 300, height: 400 });
  await popup.goto(extensionUrl("popup.html"));
  await popup.evaluate((png) => {
    const preview = document.querySelector<HTMLImageElement>("#preview")!;
    preview.src = `data:image/png;base64,${png}`;
    preview.hidden = false;
    const status = document.querySelector<HTMLElement>("#status")!;
    status.textContent = "Copied to clipboard";
    status.dataset.kind = "ok";
    status.hidden = false;
  }, base64);
  await settle(popup);
  await popup.locator("main").screenshot({ path: join(captures, "popup.png") });

  const options = await context.newPage();
  await options.setViewportSize({ width: 760, height: 900 });
  await options.goto(extensionUrl("options.html"));
  await settle(options);
  await options.screenshot({ path: join(captures, "options.png") });
  await options.emulateMedia({ colorScheme: "dark" });
  await options.screenshot({ path: join(captures, "options-dark.png") });
} finally {
  await context.close();
  server.close();
}

const browser = await chromium.launch({ channel: "chromium", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await page.goto(`file://${join(src, "shots.html")}?viewport=${WIDE.height}`);
  await page.waitForSelector("body[data-ready]");
  for (const shot of await page.locator("[data-out]").all()) {
    const out = join(import.meta.dirname, (await shot.getAttribute("data-out"))!);
    await shot.screenshot({ path: out });
    console.log("wrote", out);
  }
} finally {
  await browser.close();
}

/** Lets fonts, images and entry animations finish. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}
