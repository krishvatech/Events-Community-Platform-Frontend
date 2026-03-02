import DyteVideoBackgroundTransformer from "@dytesdk/video-background-transformer";

const STORAGE_KEY = "dyte_video_background_effect_v1";

function makeSvgDataUrl({ top, bottom, accent, label, motif }) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${top}" />
          <stop offset="100%" stop-color="${bottom}" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#bg)" />
      <circle cx="1270" cy="150" r="220" fill="${accent}" opacity="0.18" />
      <circle cx="290" cy="720" r="260" fill="${accent}" opacity="0.12" />
      <rect x="90" y="110" width="1420" height="680" rx="40" fill="white" fill-opacity="0.06" stroke="white" stroke-opacity="0.22" />
      <text x="120" y="205" fill="white" font-size="86" font-family="Arial, Helvetica, sans-serif" font-weight="700">${label}</text>
      <text x="120" y="275" fill="white" fill-opacity="0.88" font-size="30" font-family="Arial, Helvetica, sans-serif">${motif}</text>
      <path d="M0 650 C260 560 390 770 640 700 C860 640 940 420 1200 480 C1380 520 1470 630 1600 590 L1600 900 L0 900 Z" fill="white" fill-opacity="0.08" />
      <path d="M0 740 C180 690 320 830 550 800 C830 760 990 620 1240 690 C1380 730 1480 810 1600 780 L1600 900 L0 900 Z" fill="white" fill-opacity="0.13" />
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const VIDEO_BACKGROUND_OPTIONS = [
  {
    id: "none",
    type: "none",
    label: "None",
    description: "Keep your real background.",
  },
  {
    id: "blur-soft",
    type: "blur",
    label: "Blur",
    description: "Light background blur.",
    blurLength: 8,
  },
  {
    id: "blur-strong",
    type: "blur",
    label: "Strong Blur",
    description: "Heavier background blur.",
    blurLength: 16,
  },
  {
    id: "preset-studio",
    type: "image",
    label: "Studio",
    description: "Clean presentation backdrop.",
    imageUrl: makeSvgDataUrl({
      top: "#0f172a",
      bottom: "#155e75",
      accent: "#22d3ee",
      label: "Studio Session",
      motif: "Minimal stage lighting for webinars",
    }),
  },
  {
    id: "preset-sunrise",
    type: "image",
    label: "Sunrise",
    description: "Warm gradient with soft depth.",
    imageUrl: makeSvgDataUrl({
      top: "#7c2d12",
      bottom: "#f59e0b",
      accent: "#fde68a",
      label: "Sunrise Lounge",
      motif: "Warm networking atmosphere",
    }),
  },
  {
    id: "preset-aurora",
    type: "image",
    label: "Aurora",
    description: "Cool ambient lighting.",
    imageUrl: makeSvgDataUrl({
      top: "#111827",
      bottom: "#312e81",
      accent: "#34d399",
      label: "Aurora Room",
      motif: "Balanced contrast for camera framing",
    }),
  },
  {
    id: "preset-city",
    type: "image",
    label: "City",
    description: "Urban skyline silhouette.",
    imageUrl: makeSvgDataUrl({
      top: "#1e293b",
      bottom: "#0f766e",
      accent: "#38bdf8",
      label: "City View",
      motif: "Polished business-style virtual backdrop",
    }),
  },
];

const EFFECTS_BY_ID = new Map(VIDEO_BACKGROUND_OPTIONS.map((effect) => [effect.id, effect]));

export function isDyteBackgroundEffectsSupported() {
  if (typeof window === "undefined") return false;
  return DyteVideoBackgroundTransformer.isSupported();
}

export function getDefaultVideoBackgroundEffect() {
  return VIDEO_BACKGROUND_OPTIONS[0];
}

export function getVideoBackgroundEffect(effectId) {
  return EFFECTS_BY_ID.get(effectId) || getDefaultVideoBackgroundEffect();
}

export function readStoredVideoBackgroundEffect() {
  if (typeof window === "undefined") return getDefaultVideoBackgroundEffect();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultVideoBackgroundEffect();
    const parsed = JSON.parse(raw);
    return getVideoBackgroundEffect(parsed?.id);
  } catch {
    return getDefaultVideoBackgroundEffect();
  }
}

export function storeVideoBackgroundEffect(effect) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: getVideoBackgroundEffect(effect?.id).id })
    );
  } catch {
    // Best-effort persistence only.
  }
}

export async function createDyteBackgroundEffectsController(meeting) {
  if (!meeting?.self) {
    throw new Error("Dyte meeting is not ready.");
  }

  if (!isDyteBackgroundEffectsSupported()) {
    throw new Error("Virtual backgrounds are not supported in this browser.");
  }

  let currentMiddleware = null;
  let transformer = null;

  const ensureTransformer = async () => {
    if (transformer) return transformer;

    await meeting.self.setVideoMiddlewareGlobalConfig({
      disablePerFrameCanvasRendering: true,
    });

    try {
      transformer = await DyteVideoBackgroundTransformer.init({
        meeting,
        segmentationConfig: {
          pipeline: "webgl2",
          targetFps: 24,
        },
      });
    } catch {
      transformer = await DyteVideoBackgroundTransformer.init({
        meeting,
        segmentationConfig: {
          pipeline: "canvas2dCpu",
          targetFps: 18,
        },
      });
    }

    return transformer;
  };

  const removeCurrentMiddleware = async () => {
    if (!currentMiddleware) return;
    try {
      await meeting.self.removeVideoMiddleware(currentMiddleware);
    } finally {
      currentMiddleware = null;
    }
  };

  return {
    async apply(effect) {
      const nextEffect = getVideoBackgroundEffect(effect?.id);

      if (nextEffect.type === "none") {
        await removeCurrentMiddleware();
        return nextEffect;
      }

      const activeTransformer = await ensureTransformer();
      await removeCurrentMiddleware();

      currentMiddleware =
        nextEffect.type === "blur"
          ? await activeTransformer.createBackgroundBlurVideoMiddleware(
              nextEffect.blurLength
            )
          : await activeTransformer.createStaticBackgroundVideoMiddleware(
              nextEffect.imageUrl
            );

      await meeting.self.addVideoMiddleware(currentMiddleware);
      return nextEffect;
    },

    async clear() {
      await removeCurrentMiddleware();
    },

    async destroy() {
      await removeCurrentMiddleware();
      transformer?.destruct?.();
      transformer = null;
    },
  };
}
