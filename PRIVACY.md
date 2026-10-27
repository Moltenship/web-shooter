# Privacy policy

_Last updated: October 27, 2026_

Web Shooter is a browser extension that copies screenshots of the current tab to your clipboard. This policy explains what it does with your data: nothing leaves your computer.

## What the extension handles

- **Screenshots.** When you press a Web Shooter hotkey or click its toolbar button, the extension captures the current tab and writes the image to your clipboard. The image is kept in memory only until it's on the clipboard. If the page can't take the clipboard write itself, the extension keeps the image in memory for up to 10 seconds so its popup can finish the copy. Screenshots are never saved to disk by the extension and never sent anywhere.
- **Settings.** Two preferences (whether to show the "Screenshot copied" toast, and whether to downscale HiDPI screenshots) are saved with `chrome.storage.sync`. If you've turned on Chrome sync, Google syncs these values between your browsers like any other extension setting.

## What the extension doesn't do

- It doesn't collect, store or transmit personal information, browsing history, page contents or usage statistics.
- It has no servers, analytics, advertising or third-party code.
- It doesn't read pages. The `debugger` permission is used only to render a whole-page screenshot of the tab you asked to capture, and it's detached as soon as the screenshot is taken.

## Changes

If this policy changes, the new version will be published at this address with a new date.

## Contact

Questions: open an issue at https://github.com/Moltenship/web-shooter/issues.
