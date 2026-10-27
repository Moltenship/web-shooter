import { describe, expect, test } from "vite-plus/test";
import { cssScale, fullPageClip, MAX_CAPTURE_PX } from "./capture";
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

describe("fullPageClip", () => {
  test("keeps device pixels by default", () => {
    expect(fullPageClip({ width: 1280, height: 4000 }, 2, false)).toEqual({
      x: 0,
      y: 0,
      width: 1280,
      height: 4000,
      scale: 1,
    });
  });
  test("downscales to CSS pixels when asked", () => {
    expect(fullPageClip({ width: 1280, height: 4000 }, 2, true).scale).toBe(0.5);
  });
  test("drops tall HiDPI pages to 1x before cutting them", () => {
    const clip = fullPageClip({ width: 1280, height: 12_000 }, 2, false);
    expect(clip.scale).toBe(0.5);
    expect(clip.height).toBe(12_000);
  });
  test("cuts pages taller than the texture limit", () => {
    const clip = fullPageClip({ width: 1280, height: 50_000 }, 1, false);
    expect(clip.height).toBe(MAX_CAPTURE_PX);
  });
});
