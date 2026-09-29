"use client";

// src/next/MarketingHubRoutes.jsx
// Renders the Marketing Hub page for the current /admin/newsletter/* URL.
// Rendered by src/app/(app)/(member)/admin/newsletter/layout.jsx, which Next.js
// keeps mounted across all child navigations. That preserves the React Router
// behaviour of App.jsx: the nine paths served by AdminNewsletterPage share ONE
// component instance, so its state survives in-hub navigation (e.g. after
// "Save Draft" on /new it navigates to /:campaignId and keeps its
// "saved/synced" notice or "Draft saved in ECP, but Mautic sync failed" error).
//
// The page.jsx files under admin/newsletter only declare the routes (and their
// dynamic params for useParams); this table decides what renders. Keep it in
// sync with the `newsletter` children in src/App.jsx.

import { usePathname } from "next/navigation";
import { Navigate } from "#navigation";
import AdminNewsletterDashboardPage from "../legacy-pages/AdminNewsletterDashboardPage.jsx";
import AdminNewsletterPage from "../legacy-pages/AdminNewsletterPage.jsx";
import AdminNewsletterAnalyticsPage from "../legacy-pages/AdminNewsletterAnalyticsPage.jsx";
import AdminNewsletterContactsPage from "../legacy-pages/AdminNewsletterContactsPage.jsx";
import AdminNewsletterContactDetailPage from "../legacy-pages/AdminNewsletterContactDetailPage.jsx";
import AdminNewsletterCompaniesPage from "../legacy-pages/AdminNewsletterCompaniesPage.jsx";
import AdminNewsletterCompanyDetailPage from "../legacy-pages/AdminNewsletterCompanyDetailPage.jsx";
import AdminNewsletterStagesPage from "../legacy-pages/AdminNewsletterStagesPage.jsx";
import AdminNewsletterPointsPage from "../legacy-pages/AdminNewsletterPointsPage.jsx";
import AdminNewsletterListManagePage from "../legacy-pages/AdminNewsletterListManagePage.jsx";

const BASE = "/admin/newsletter";
const CAMPAIGN_PAGE = new Set(["campaigns", "broadcasts", "templates", "lists", "segments", "settings", "new", "builder"]);

// Mirrors App.jsx (React Router ranks static segments before :params).
function resolve(rest) {
  const [first = "", second, ...more] = rest;
  if (more.length > 0 && first !== "audiences") return null;
  if (first === "") return <AdminNewsletterDashboardPage />;
  if (first === "audiences") return <Navigate to={BASE} replace />;
  if (second === undefined) {
    if (CAMPAIGN_PAGE.has(first)) return <AdminNewsletterPage />;
    if (first === "analytics") return <AdminNewsletterAnalyticsPage />;
    if (first === "contacts") return <AdminNewsletterContactsPage />;
    if (first === "companies") return <AdminNewsletterCompaniesPage />;
    if (first === "stages") return <AdminNewsletterStagesPage />;
    if (first === "points") return <AdminNewsletterPointsPage />;
    return <AdminNewsletterPage />; // :campaignId
  }
  if (first === "contacts") return <AdminNewsletterContactDetailPage />; // contacts/:mauticContactId
  if (first === "companies") return <AdminNewsletterCompanyDetailPage />; // companies/:companyId
  if (first === "builder") return <AdminNewsletterPage />; // builder/:campaignId
  if (first === "lists") return <AdminNewsletterListManagePage />; // lists/:slug
  return null;
}

export default function MarketingHubRoutes() {
  const pathname = (usePathname() || BASE).replace(/\/+$/, "");
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length).split("/").filter(Boolean) : [];
  return resolve(rest);
}
