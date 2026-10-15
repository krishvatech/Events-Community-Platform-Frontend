// Reuse the profile's existing Certifications & Licenses experience for direct
// Next.js visits (including refreshes), rather than resolving through the 404
// catch-all or introducing a second certificate workflow.
import { redirect } from "next/navigation";

export default function CertificatesPage() {
  redirect("/account/profile#certifications");
}
