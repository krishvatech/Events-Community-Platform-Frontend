"use client";

// Next.js route entry for /m-and-a-trainings and /m-and-a-trainings/*
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const TrainingProgramsPage = dynamic(() => import("@/legacy-pages/TrainingProgramsPage.jsx"), { ssr: false });

export default function Page() {
  return <TrainingProgramsPage />;
}
