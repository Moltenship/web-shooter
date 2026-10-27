import { defineConfig } from "wxt";

export default defineConfig({
  imports: false,
  modules: ["@wxt-dev/auto-icons"],
  autoIcons: {
    baseIconPath: "assets/icon.svg",
  },
  vite: () => ({
    // Matches minimum_chrome_version below, so modern CSS (light-dark, nesting) ships as-is.
    build: { target: "chrome140", cssTarget: "chrome140" },
  }),
  manifest: {
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    // `activeTab` is granted whenever the user presses a shortcut or clicks the toolbar
    // button, which is all `captureVisibleTab` and `scripting` need — no host permissions.
    // `debugger` drives full-page capture; Chrome doesn't allow it as an optional permission.
    permissions: ["activeTab", "scripting", "clipboardWrite", "storage", "debugger"],
    commands: {
      "take-screenshot": {
        suggested_key: { default: "Alt+Shift+S" },
        description: "__MSG_commandDescription__",
      },
      "take-full-page-screenshot": {
        suggested_key: { default: "Alt+Shift+F" },
        description: "__MSG_commandFullPageDescription__",
      },
    },
    options_ui: { open_in_tab: true },
    minimum_chrome_version: "140",
  },
});
