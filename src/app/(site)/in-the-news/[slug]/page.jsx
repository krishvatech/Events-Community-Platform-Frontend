// One public article of the "news" section (/in-the-news/<slug>). An unknown, draft or members-only
// article is a real 404; see src/components/public/articles/articleRoutes.jsx.
import { articleDetailRoute } from "@/components/public/articles/articleRoutes.jsx";

// Always render per request; the backend must not be contacted at build time.
export const dynamic = "force-dynamic";

const route = articleDetailRoute("news");
export const generateMetadata = route.generateMetadata;
export default route.ArticlePage;
