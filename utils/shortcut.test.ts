import { describe, expect, test } from "vite-plus/test";
import { cssScale } from "./capture";
import { shortcutKeys } from "./shortcut";

describe("shortcutKeys", () => {
  test("splits plus-separated shortcuts", () => {
    expect(shortcutKeys("Alt+Shift+S")).toEqual(["Alt", "Shift", "S"]);
  });
  test("splits macOS glyph shortcuts", () => {
    expect(shortcutKeys("⌥⇧S")).toEqual(["⌥", "⇧", "S"]);
    expect(shortcutKeys("⌘F12")).toEqual(["⌘", "F12"]);
  });
  test("handles unset shortcuts", () => {
    expect(shortcutKeys("")).toEqual([]);
    expect(shortcutKeys(undefined)).toEqual([]);
  });
});

describe("cssScale", () => {
  test("scales HiDPI captures to CSS width", () => {
    expect(cssScale(2560, 1280)).toBe(0.5);
  });
  test("leaves 1x captures and unknown widths alone", () => {
    expect(cssScale(1280, 1280)).toBe(1);
    expect(cssScale(1280, undefined)).toBe(1);
  });
});
