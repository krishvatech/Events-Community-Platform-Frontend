"use client";

// Next.js route entry for /training-design-review (public design-review gallery; no auth, checkout or
// backend calls). Thin client-only wrapper around the existing component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const DesignGallery = dynamic(() => import("@/features/trainingDesignReview/DesignGallery.jsx"), { ssr: false });

export default function Page() {
  return <DesignGallery />;
}
