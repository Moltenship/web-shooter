# Chrome Web Store listing

Everything to paste into the [developer dashboard](https://chrome.google.com/webstore/devconsole). Images are in `screenshots/` and `promo/`. To regenerate them, run `vp run build && vp run store`.

## Store listing tab

**Name:** Web Shooter (from the manifest)

**Summary** (from the manifest, 132 characters max):

> Copy a screenshot of the visible area or the whole page straight to your clipboard with one hotkey.

**Category:** Productivity → Tools

**Language:** English

**Store icon:** `.output/chrome-mv3/icons/128.png`

**Screenshots** (1280×800, upload in this order):

1. `screenshots/1-hotkey.png`
2. `screenshots/2-whole-page.png`
3. `screenshots/3-popup.png`
4. `screenshots/4-paste.png`
5. `screenshots/5-settings.png`

**Small promo tile** (440×280): `promo/small-440x280.png`

**Marquee promo tile** (1400×560): `promo/marquee-1400x560.png`

**Homepage URL:** https://github.com/Moltenship/web-shooter

**Support URL:** https://github.com/Moltenship/web-shooter/issues

### Description

```text
Press a key, paste the screenshot. Web Shooter puts a picture of the current tab straight on your clipboard: no save dialog, no Downloads folder, no editor window to close.

TWO HOTKEYS
• Alt+Shift+S (⌥⇧S on Mac) copies what you see on screen.
• Alt+Shift+F (⌥⇧F on Mac) copies the whole page, top to bottom, including everything below the fold.

PASTE IT ANYWHERE
The screenshot lands on your clipboard as a regular PNG image. Paste it into a chat, a doc, a bug report, a design file or an email with Ctrl+V (⌘V on Mac).

SMALL TOUCHES
• A "Screenshot copied" toast confirms each capture. You can turn it off.
• Prefer the mouse? The toolbar button has both capture modes and shows a preview of what was copied.
• On Retina and other high-density screens, you can save screenshots at the size you see them, so they don't paste at double size.
• Change either shortcut to any combination you like at chrome://extensions/shortcuts.
• Follows your system's light or dark theme.

PRIVATE BY DESIGN
Web Shooter works entirely on your computer. It has no servers, no analytics and no account. Screenshots go from the tab to your clipboard and nowhere else. The source code is public: https://github.com/Moltenship/web-shooter

ABOUT THE PERMISSIONS
Web Shooter can't read or change your data on websites. It only touches the tab you capture, at the moment you press the hotkey or click the button.
• "Modify data you copy and paste" lets it put the screenshot on your clipboard.
• "Access the page debugger backend" is needed for whole-page screenshots only. Chrome renders content beyond the screen only through its debugging protocol (the same thing DevTools uses for "Capture full size screenshot"). Web Shooter attaches for about half a second, takes the picture and detaches. While it's attached, Chrome shows a "started debugging this browser" bar; that's expected.

GOOD TO KNOW
• Chrome doesn't allow screenshots of its own pages (chrome://, the Chrome Web Store).
• Apps that scroll inside their own panel, such as some mail and note-taking apps, are captured only as far as they show on screen.
• Pages taller than 16,384 pixels are cut at that height, a limit of the graphics card.
```

## Privacy practices tab

**Single purpose:**

> Capture the current tab, either the visible area or the whole page, as an image and copy it to the clipboard.

**Permission justifications:**

| Permission       | Justification                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeTab`      | Gives temporary access to the tab the user captures with the hotkey or the toolbar button, so the extension can call `tabs.captureVisibleTab` on it and inject the clipboard script into it. No other tab is accessed.                                                                                                                                                                                                                                                    |
| `scripting`      | Injects one small function into the captured tab. It writes the image to the clipboard (the page has keyboard focus, which the Clipboard API requires; the background service worker does not) and shows a short "Screenshot copied" confirmation. It doesn't read the page.                                                                                                                                                                                              |
| `clipboardWrite` | Writes the PNG screenshot to the clipboard. That is the extension's purpose.                                                                                                                                                                                                                                                                                                                                                                                              |
| `storage`        | Stores two user settings (show the confirmation toast; downscale HiDPI screenshots) in `chrome.storage.sync`.                                                                                                                                                                                                                                                                                                                                                             |
| `debugger`       | Used only for whole-page screenshots, after the user presses the whole-page hotkey or button. The extension attaches to that one tab, calls `Page.getLayoutMetrics` and `Page.captureScreenshot` with `captureBeyondViewport` (no other Chrome API can render content outside the viewport), then detaches immediately, usually within a second. It doesn't read the DOM, network traffic, cookies or storage. Chrome doesn't allow `debugger` as an optional permission. |

**Host permissions:** none requested.

**Remote code:** No, I am not using remote code. All JavaScript is bundled in the package.

**Data usage:** don't tick any category. The extension collects no user data.

Tick all three certifications: the data isn't sold to third parties, isn't used or transferred for purposes unrelated to the single purpose, and isn't used to determine creditworthiness.

**Privacy policy URL:** https://github.com/Moltenship/web-shooter/blob/main/PRIVACY.md

## Notes for the review

Because of `debugger`, expect an in-depth review that takes longer than usual. If the dashboard asks for test instructions, paste this:

```text
No account is needed. Open any web page, for example https://en.wikipedia.org/wiki/Clipboard_(computing).
1. Press Alt+Shift+S. A "Screenshot copied" toast appears; paste into any image-accepting app to see the visible area.
2. Press Alt+Shift+F. Chrome briefly shows its debugging bar, then "Whole page copied"; paste to see the full page.
3. The toolbar button offers the same two captures with a preview. Settings are under the gear icon.
```
