# Public page content manifests

The JSON files mirror the approved content in `ecp-backend/cms/public_page_content/`.
Change backend content first, update its content hashes, then copy its JSON here.
Do not edit the copies independently.

## Frontend fallback policy

Four **text-only** pages (FAQ, Terms, Privacy Policy, Imprint) have approved
server-rendered defaults only when the backend explicitly returns `page_absent`.
Existing unpublished/archived/restricted pages remain 404. Backend errors remain errors.

**References is CMS-only.** Its JSON remains here for source/hash testing, but it is
not imported into the Next.js default-page module. No References images are stored
under frontend `public/`. The backend command imports source images from
`ecp-backend/cms/public_page_content/media/references/` to Wagtail storage, which
must be configured to use S3 in staging/production.

Once `/references/` is published, the backend public page API expands the Wagtail
rich-text image embeds into S3/CDN URLs. The Next.js public page renderer uses
these URLs directly; its existing `loading="lazy"` and `decoding="async"` support
avoids fetching the entire 258-logo wall immediately.

**Deployment order:** configure/verify S3 media storage, deploy backend, perform
Wagtail References image import/publish, smoke-test public image URLs, then deploy
frontend with the old `public/public-pages/references/` directory removed.
If References is not published yet, the frontend returns a real 404 rather than
showing broken local images or exposing drafts.

## Tests

`src/legacy-pages/__tests__/publicSitePages.test.mjs` checks content formatting,
hashes and source-media manifests, tests that References cannot use fallback, and
checks rendering of published CMS image URLs with lazy loading. When the backend
checkout is available, it verifies the source media file hashes there.
