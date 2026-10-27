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
    // `activeTab` is granted whenever the user presses our shortcut or clicks the toolbar
    // button, which is all `captureVisibleTab` and `scripting` need — no host permissions.
    permissions: ["activeTab", "scripting", "clipboardWrite", "storage"],
    commands: {
      "take-screenshot": {
        suggested_key: { default: "Alt+Shift+S" },
        description: "__MSG_commandDescription__",
      },
    },
    options_ui: { open_in_tab: true },
    minimum_chrome_version: "140",
  },
});
