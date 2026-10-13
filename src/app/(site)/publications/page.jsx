// Public archive of the "publications" article section (/publications): published Blog posts imported from the
// WordPress category, newest first, with topic/year filters and pagination. See
// src/components/public/articles/articleRoutes.jsx for the 404, error and SEO rules.
import { articleArchiveRoute } from "@/components/public/articles/articleRoutes.jsx";

// Always render per request; the backend must not be contacted at build time.
export const dynamic = "force-dynamic";

const route = articleArchiveRoute("publications");
export const generateMetadata = route.generateMetadata;
export default route.ArchivePage;
