"use client";
import dynamic from "next/dynamic";
const PageBody = dynamic(() => import("@/legacy-pages/MergerStatisticsChildPage.jsx"), { ssr: false });
export default function Page() { return <PageBody />; }
