// src/lib/publicPageDefaults.server.js
// Approved text-only defaults for the public CMS pages. Server Components only.
// References is CMS-only: its 258 logos live in Wagtail media storage (S3),
// not in the Next.js public directory or frontend server bundle.
//
// The files in src/content/public-pages/ are byte-identical copies of
// ecp-backend/cms/public_page_content/*.json (the backend's setup_public_pages command uses
// the same content for the pages it creates). See src/content/public-pages/README.md.
// When defaults are used is decided in ./publicCmsResponse.js.
import faq from "../content/public-pages/frequently-asked-questions.json";
import termsAndConditions from "../content/public-pages/terms-and-conditions.json";
import privacyPolicy from "../content/public-pages/privacy-policy.json";
import imprint from "../content/public-pages/imprint.json";
import { toDefaultPage } from "./publicCmsResponse";

const DEFAULT_PAGES = Object.freeze(
  Object.fromEntries(
    [faq, termsAndConditions, privacyPolicy, imprint].map((file) => [file.slug, toDefaultPage(file)])
  )
);

/** The renderable default for `slug`, or null (unknown slug, or content not migrated). */
export function getPublicPageDefault(slug) {
  return Object.prototype.hasOwnProperty.call(DEFAULT_PAGES, slug) ? DEFAULT_PAGES[slug] : null;
}
