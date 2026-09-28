// Next.js route entry for /reset-password.
// App.jsx: <Route path="/reset-password" element={<Navigate to="/forgot-password" replace />} />
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/forgot-password");
}
