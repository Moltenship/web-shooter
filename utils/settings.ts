import { storage } from "wxt/utils/storage";

/** Show a "Screenshot copied" toast inside the captured page. */
export const showToast = storage.defineItem<boolean>("sync:showToast", { fallback: true });

/** Scale HiDPI captures down to CSS pixel size instead of keeping device pixels. */
export const downscale = storage.defineItem<boolean>("sync:downscale", { fallback: false });
