# Web Shooter

A Chrome extension that captures the current tab on a hotkey, either the visible area or the whole page, and copies the PNG to the clipboard.

- `Alt+Shift+S` (`⌥⇧S`) captures the visible area and `Alt+Shift+F` (`⌥⇧F`) captures the whole page. Both shortcuts can be changed.
- A "Screenshot copied" toast appears on the page. It can be turned off.
- HiDPI/Retina screenshots can optionally be scaled down to CSS-pixel size.
- Clicking the toolbar icon opens a popup with "Visible area" and "Whole page" buttons and a preview.
- Permissions: `activeTab`, `scripting`, `clipboardWrite`, `storage` and `debugger`. `debugger` is only used for whole-page captures, and Chrome doesn't allow it as an optional permission.

## Stack

[WXT](https://wxt.dev) 0.21 · [Vite+](https://viteplus.dev) 1.4 (Vite 8 / Rolldown, Oxlint, Oxfmt, Vitest 5) · TypeScript 7 · Manifest V3 (Chrome ≥ 140) · no UI framework.

## Commands

```sh
vp install            # install dependencies
vp run dev            # launch Chrome with the extension and HMR
vp run build          # build into .output/chrome-mv3
vp run zip            # zip for the Chrome Web Store
vp check              # format + lint + type check
vp test               # unit tests
```

## Manual install

1. `vp run build`
2. Open `chrome://extensions`, turn on "Developer mode", click "Load unpacked" and pick `.output/chrome-mv3`.

## How it works

```
hotkey ─► background: tabs.captureVisibleTab (activeTab)
              │         or chrome.debugger → Page.captureScreenshot (whole page)
              │
              ├─► scripting.executeScript in the page → navigator.clipboard.write + toast
              │        (the page has focus, so the Clipboard API works)
              │
              └─► that failed (chrome://, plain HTTP, focus outside the page)
                       → the image goes to the extension popup, which copies it itself
```

The service worker has no DOM and no focus, so it can't write an image to the clipboard. The page writes it, and when the page can't, the popup does.

### Whole page

This works like DevTools' "Capture full size screenshot": the extension attaches to the tab through `chrome.debugger` and calls `Page.captureScreenshot` with `captureBeyondViewport`. Limitations:

- While the capture runs (about 0.5 s), Chrome shows a "Web Shooter started debugging this browser" bar.
- The extension first waits for that bar to slide in and the viewport to stop resizing. Otherwise Chrome returns the already rendered part tiled over the rest of the page.
- Pages that scroll inside their own panel (Gmail, Notion) only capture the visible part.
- The GPU can't render more than 16,384 px per side. Tall HiDPI pages drop to 1x first, and anything that still doesn't fit is cut off.

### Changing the hotkeys

Chrome's API doesn't let an extension change its shortcuts, so the button in the settings opens `chrome://extensions/shortcuts`. Keep the scope at "In Chrome": a global shortcut doesn't grant the extension `activeTab`, and the capture fails.

## Layout

```
entrypoints/
  background.ts       hotkey handler, capture, clipboard delivery
  popup/              toolbar popup
  options/            settings page
utils/
  capture.ts          visible-area and whole-page capture (+ downscaling)
  copy-in-page.ts     function injected into the page (must stay self-contained)
  shortcut.ts         shortcut parsing for display
  utils.test.ts       unit tests
  settings.ts         settings in storage.sync
public/_locales/en/   UI strings
assets/icon.svg       icon source (@wxt-dev/auto-icons generates the PNGs)
```
