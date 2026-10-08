// Layout for the server-rendered public website routes (Phase P1: CMS StandardPages).
//
// Deliberately NOT inside src/app/(app): that tree's layout loads the application runtime
// with `ssr: false`, which would swallow server-rendered content. This group renders the
// public shell (header, footer, colour-mode rule) around real server HTML. Everything else
// (authenticated layouts, guards, providers, Home/About) is untouched.
import PublicSiteShell from "@/components/public/PublicSiteShell.jsx";

export default function PublicSiteLayout({ children }) {
  return <PublicSiteShell>{children}</PublicSiteShell>;
}
