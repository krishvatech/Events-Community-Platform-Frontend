"use client";

// Next.js route entry for /training-design-review/:designId (one design prototype; unknown ids
// redirect to the gallery inside the component). Thin client-only wrapper, no SSR.
import dynamic from "next/dynamic";

const DesignPreview = dynamic(() => import("@/features/trainingDesignReview/DesignPreview.jsx"), { ssr: false });

export default function Page() {
  return <DesignPreview />;
}
