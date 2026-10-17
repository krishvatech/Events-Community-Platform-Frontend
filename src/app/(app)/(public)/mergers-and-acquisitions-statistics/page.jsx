"use client"; import dynamic from "next/dynamic"; const PageBody=dynamic(()=>import("@/legacy-pages/MergerStatisticsPage.jsx"),{ssr:false}); export default function Page(){return <PageBody/>;}
