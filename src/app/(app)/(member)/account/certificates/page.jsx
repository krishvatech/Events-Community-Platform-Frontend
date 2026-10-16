// Certificates are not currently available as a standalone member workflow.
// Keep direct visits and the sidebar shortcut in the application dashboard.
import { redirect } from "next/navigation";

export default function CertificatesPage() {
  redirect("/community?view=home");
}
