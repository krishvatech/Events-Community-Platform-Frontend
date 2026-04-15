import VideoBGAddon from "@cloudflare/realtimekit-ui-addons/video-background";

const STORAGE_SELECTION_KEY = "rtk_vb_selection_v1";
const STORAGE_UPLOAD_CACHE_KEY = "rtk_vb_upload_cache_v1";
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const addonRegistry = new WeakMap();

function svgPresetDataUrl(gradientA, gradientB, accent) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${gradientA}"/>
      <stop offset="100%" stop-color="${gradientB}"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <circle cx="220" cy="120" r="180" fill="${accent}" fill-opacity="0.12"/>
  <circle cx="1160" cy="580" r="220" fill="${accent}" fill-opacity="0.12"/>
  <rect x="110" y="480" width="1060" height="140" rx="18" fill="#ffffff" fill-opacity="0.08"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const VIRTUAL_BG_FEATURE_ENABLED =
  String(import.meta.env.VITE_ENABLE_VIRTUAL_BG || "true").toLowerCase() === "true";

export const VIRTUAL_BG_PRESETS = [
  {
    id: "preset-aurora",
    label: "Aurora",
    imageUrl: svgPresetDataUrl("#0f172a", "#14532d", "#10b981"),
  },
  {
    id: "preset-sunrise",
    label: "Sunrise",
    imageUrl: svgPresetDataUrl("#7c2d12", "#f59e0b", "#fde68a"),
  },
  {
    id: "preset-ocean",
    label: "Ocean",
    imageUrl: svgPresetDataUrl("#0c4a6e", "#1d4ed8", "#38bdf8"),
  },
];

function isObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeBackgroundSelection(input) {
  if (!isObject(input)) {
    return { mode: "none" };
  }

  const mode = String(input.mode || "none").toLowerCase();

  if (mode === "none") {
    return { mode: "none" };
  }

  if (mode === "blur") {
    const blurLevel = input.blurLevel === "high" ? "high" : "low";
    return { mode: "blur", blurLevel, source: "preset" };
  }

  if (mode === "image") {
    const imageUrl = typeof input.imageUrl === "string" ? input.imageUrl.trim() : "";
    if (!imageUrl) {
      return { mode: "none" };
    }
    const source = input.source === "upload" ? "upload" : "preset";
    return { mode: "image", imageUrl, source };
  }

  return { mode: "none" };
}

export function loadStoredBackgroundSelection() {
  try {
    const raw = localStorage.getItem(STORAGE_SELECTION_KEY);
    if (!raw) return { mode: "none" };

    const parsed = JSON.parse(raw);
    const normalized = normalizeBackgroundSelection(parsed);

    if (normalized.mode === "image" && normalized.source === "upload") {
      const cachedUpload = localStorage.getItem(STORAGE_UPLOAD_CACHE_KEY);
      if (cachedUpload) {
        normalized.imageUrl = cachedUpload;
      }
    }

    return normalized;
  } catch {
    return { mode: "none" };
  }
}

export function saveBackgroundSelection(selection) {
  const normalized = normalizeBackgroundSelection(selection);
  try {
    localStorage.setItem(STORAGE_SELECTION_KEY, JSON.stringify(normalized));

    if (normalized.mode === "image" && normalized.source === "upload") {
      if (typeof normalized.imageUrl === "string" && normalized.imageUrl.length < 1_500_000) {
        localStorage.setItem(STORAGE_UPLOAD_CACHE_KEY, normalized.imageUrl);
      }
    } else {
      localStorage.removeItem(STORAGE_UPLOAD_CACHE_KEY);
    }
  } catch {
    // Ignore storage quota or private mode errors.
  }
  return normalized;
}

export function validateBackgroundUpload(file) {
  if (!file) {
    return { ok: false, error: "No file selected." };
  }

  if (!String(file.type || "").startsWith("image/")) {
    return { ok: false, error: "Please upload an image file." };
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return { ok: false, error: "Image is too large. Please upload up to 5MB." };
  }

  return { ok: true };
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read the selected image."));
    reader.readAsDataURL(file);
  });
}

async function runMethod(target, names, ...args) {
  for (const name of names) {
    const method = target?.[name];
    if (typeof method === "function") {
      await method.call(target, ...args);
      return true;
    }
  }
  return false;
}

function isAlreadyExistsError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("already") && message.includes("exist");
}

export async function initializeVirtualBackgroundMiddleware(meeting, middlewareName = "VirtualBackground") {
  const self = meeting?.self;
  if (!self) {
    return { ok: false, supported: false, error: new Error("Meeting self participant not ready") };
  }

  const existingAddon = addonRegistry.get(meeting);
  if (existingAddon) {
    return { ok: true, supported: true };
  }

  try {
    const addon = await VideoBGAddon.init({
      meeting,
      modes: ["none", "blur", "virtual"],
      images: VIRTUAL_BG_PRESETS.map((preset) => preset.imageUrl),
      randomCount: 3,
      blurStrength: 35,
    });
    addonRegistry.set(meeting, addon);
    return { ok: true, supported: true };
  } catch (addonError) {
    const msg = String(addonError?.message || addonError || "").toLowerCase();
    if (
      msg.includes("not supported") ||
      msg.includes("unsupported") ||
      msg.includes("webgl") ||
      msg.includes("wasm")
    ) {
      return { ok: false, supported: false, error: addonError };
    }
    // Fall back to lower-level middleware path if addon initialization failed for a non-support reason.
  }

  const canAdd = typeof self.addVideoMiddleware === "function";
  const canSetGlobal = typeof self.setVideoMiddlewareGlobalConfig === "function";

  if (!canAdd) {
    return { ok: false, supported: false, error: new Error("Video middleware is not supported") };
  }

  try {
    if (canSetGlobal) {
      await self.setVideoMiddlewareGlobalConfig({
        segmentation: { model: "selfie" },
      });
    }

    await self.addVideoMiddleware(middlewareName, {
      enabled: false,
    });

    return { ok: true, supported: true };
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      return { ok: true, supported: true };
    }
    return { ok: false, supported: true, error };
  }
}

async function updateVirtualBackground(self, middlewareName, payload) {
  const candidates = [
    ["updateVideoMiddleware"],
    ["setVideoMiddlewareConfig"],
    ["setVideoMiddleware"],
  ];

  for (const names of candidates) {
    try {
      const handled = await runMethod(self, names, middlewareName, payload);
      if (handled) return true;
    } catch {
      // Try the next API variant for compatibility.
    }
  }

  return false;
}

export async function applyBackgroundSelection(meeting, selection, middlewareName = "VirtualBackground") {
  const self = meeting?.self;
  if (!self) {
    return { ok: false, supported: false, error: new Error("Meeting self participant not ready") };
  }

  const normalized = normalizeBackgroundSelection(selection);
  const addon = addonRegistry.get(meeting);
  if (addon) {
    try {
      if (normalized.mode === "none") {
        const result = await addon.removeBackground();
        if (result?.isSuccessful === false) {
          return { ok: false, supported: true, error: new Error(result.error || "Failed to remove background") };
        }
        return { ok: true, supported: true };
      }

      if (normalized.mode === "blur") {
        addon.blurStrength = normalized.blurLevel === "high" ? 60 : 25;
        const result = await addon.applyBlurBackground();
        if (result?.isSuccessful === false) {
          return { ok: false, supported: true, error: new Error(result.error || "Failed to apply blur background") };
        }
        return { ok: true, supported: true };
      }

      if (normalized.mode === "image") {
        const image = String(normalized.imageUrl || "");
        const result = await addon.applyVirtualBackground(image, image);
        if (result?.isSuccessful === false) {
          return { ok: false, supported: true, error: new Error(result.error || "Failed to apply virtual background") };
        }
        return { ok: true, supported: true };
      }
    } catch (error) {
      const msg = String(error?.message || error || "").toLowerCase();
      if (
        msg.includes("not supported") ||
        msg.includes("unsupported") ||
        msg.includes("webgl") ||
        msg.includes("wasm")
      ) {
        return { ok: false, supported: false, error };
      }
      return { ok: false, supported: true, error };
    }
  }

  const canUpdate =
    typeof self.updateVideoMiddleware === "function" ||
    typeof self.setVideoMiddleware === "function" ||
    typeof self.setVideoMiddlewareConfig === "function";

  if (!canUpdate) {
    return { ok: false, supported: false, error: new Error("Video middleware update method is unavailable") };
  }

  const payloads = [];

  if (normalized.mode === "none") {
    payloads.push({ enabled: false });
  } else if (normalized.mode === "blur") {
    const intensity = normalized.blurLevel === "high" ? 12 : 6;
    payloads.push(
      { enabled: true, type: "blur", blurIntensity: intensity },
      { enabled: true, backgroundType: "blur", blurIntensity: intensity },
      { enabled: true, type: "blur", blurAmount: intensity }
    );
  } else if (normalized.mode === "image") {
    payloads.push(
      { enabled: true, type: "image", image: normalized.imageUrl },
      { enabled: true, backgroundType: "image", image: normalized.imageUrl },
      { enabled: true, type: "image", source: normalized.imageUrl }
    );
  }

  for (const payload of payloads) {
    const handled = await updateVirtualBackground(self, middlewareName, payload);
    if (handled) {
      return { ok: true, supported: true };
    }
  }

  return { ok: false, supported: true, error: new Error("Failed to update virtual background") };
}
