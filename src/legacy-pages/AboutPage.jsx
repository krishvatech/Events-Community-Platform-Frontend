import React from "react";
import { Container, Box, Paper, Alert, Skeleton } from "@mui/material";
import { apiClient } from "../utils/api";
import { EmptyState } from "../components/page";

// Section title: serif heading in ink (design tokens)
const SectionTitle = ({ children }) => (
  <h2 className="font-serif text-2xl md:text-3xl font-bold text-imaa-ink">{children}</h2>
);

// Hero height grows with long CMS titles (was a fixed height); same minimum sizes as before
const HERO_CLASS = "relative min-h-[max(380px,50vh)] md:min-h-[60vh] py-16 flex items-center justify-center text-center";

// Readable defaults for the CMS HTML blocks. The `prose` classes used before had no effect
// (the Tailwind typography plugin isn't installed). Styling only; the HTML itself is rendered as before.
const CMS_HTML_CLASS = [
  "max-w-4xl mx-auto text-center text-base md:text-lg leading-relaxed text-imaa-body",
  "[&_p]:mt-4 [&_p:first-child]:mt-0",
  "[&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-imaa-ink",
  "[&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-imaa-ink",
  "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-left [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:text-left",
  "[&_a]:text-imaa-link [&_a]:underline [&_strong]:font-semibold [&_strong]:text-imaa-ink",
].join(" ");

// Feature card: 8px corners, token border and shadows
const FeaturedCard = ({ image, title, desc }) => (
  <Box
    component="article"
    className="bg-white rounded-lg border border-imaa-border overflow-hidden shadow-imaa-sm transition-shadow hover:shadow-imaa-md h-full flex flex-col"
  >
    <Box className="w-full overflow-hidden">
      <img
        src={image}
        alt={title}
        loading="lazy"
        className="w-full h-40 sm:h-48 md:h-56 object-cover"
      />
    </Box>

    <Box className="p-5 flex-1 flex flex-col">
      <h3 className="font-serif text-lg font-semibold text-imaa-ink">{title}</h3>
      <p className="mt-2 text-sm text-imaa-body">{desc}</p>
    </Box>
  </Box>
);

const AboutPageSkeleton = () => {
  return (
    <div className="bg-white">
      {/* HERO Skeleton */}
      <section className={`${HERO_CLASS} bg-cover bg-center`}>
        <div className="absolute inset-0 bg-black/10" />
        <Container maxWidth="lg" disableGutters className="px-4 md:px-6 z-10">
          <Skeleton variant="text" sx={{ mx: "auto" }} width="60%" height={70} />
          <Skeleton variant="text" sx={{ mx: "auto", mt: 2 }} width="75%" height={28} />
          <Skeleton variant="text" sx={{ mx: "auto" }} width="65%" height={28} />
        </Container>
      </section>

      {/* Intro Skeleton */}
      <section className="py-12 md:py-20">
        <Container maxWidth="lg" disableGutters className="px-4 md:px-6">
          <div className="text-center">
            <Skeleton variant="text" sx={{ mx: "auto" }} width="30%" height={40} />
          </div>

          <Box sx={{ mt: 4 }}>
            <Skeleton variant="text" height={28} />
            <Skeleton variant="text" height={28} />
            <Skeleton variant="text" height={28} width="85%" />
            <Skeleton variant="text" height={28} width="75%" />
          </Box>
        </Container>
      </section>

      {/* Feature Cards Skeleton */}
      <section className="py-12 md:py-20">
        <Container maxWidth="lg" disableGutters className="px-4 md:px-6">
          <div className="text-center">
            <Skeleton variant="text" sx={{ mx: "auto" }} width="40%" height={40} />
          </div>

          <div className="mt-8 md:mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 xl:gap-8">
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                className="bg-white rounded-lg border border-imaa-border overflow-hidden shadow-imaa-sm h-full flex flex-col"
              >
                <Skeleton variant="rectangular" height={220} />
                <Box className="p-5">
                  <Skeleton variant="text" height={28} width="70%" />
                  <Skeleton variant="text" height={22} />
                  <Skeleton variant="text" height={22} width="85%" />
                </Box>
              </Box>
            ))}
          </div>
        </Container>
      </section>

      {/* Mission Skeleton */}
      <section className="py-12 md:py-20">
        <Container maxWidth="lg" disableGutters className="px-4 md:px-6">
          <Paper elevation={0} className="bg-white rounded-lg border border-imaa-border shadow-imaa-sm p-6 md:p-10">
            <div className="text-center">
              <Skeleton variant="text" sx={{ mx: "auto" }} width="30%" height={40} />
            </div>
            <Box sx={{ mt: 3 }}>
              <Skeleton variant="text" height={26} />
              <Skeleton variant="text" height={26} />
              <Skeleton variant="text" height={26} width="80%" />
            </Box>
          </Paper>
        </Container>
      </section>
    </div>
  );
};


export default function AboutPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  // True only when the CMS answered 404 for every candidate slug (shown as "not found", not as an error)
  const [notFound, setNotFound] = React.useState(false);
  const [page, setPage] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const candidates = ["about", "about-us", "aboutus"];
        let res = null;
        let lastErr = null;

        for (const slug of candidates) {
          try {
            res = await apiClient.get(`/cms/pages/${slug}/`);
            break;
          } catch (e) {
            lastErr = e;
            const status = e?.response?.status;
            if (status !== 404) {
              throw e;
            }
          }
        }

        if (!res) {
          throw lastErr || new Error("About page not found");
        }

        if (!mounted) return;
        setPage(res.data);
        setError("");
      } catch (e) {
        if (!mounted) return;
        setNotFound(e?.response?.status === 404);
        setError(e?.response?.data?.detail || e?.message || "Failed To Load About Page");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <AboutPageSkeleton />;
  }

  if (error && notFound) {
    return (
      <div className="bg-white">
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
          <EmptyState
            titleComponent="h1"
            title="Page not found"
            description="The About page content is not available yet."
          />
        </Container>
      </div>
    );
  }

  // Any other failure (network, server) is still shown as an error
  if (error) {
    return (
      <Container sx={{ py: 6 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const heroBg =
    page?.hero_image_url ||
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCERO0mJRa0C5b8nfoEbZ02WYWLNgo1q1K9SdRDbgkWeuFTn9uR-WFnEl4leicScEd1-Nq77ffXT3ZygGPVXuF84_Jqsjx7EjTlVasqorCu40Ue1zQ-iHrokMzCd-WPkMG1OABR1lzOYx8pOC_PXo8xQPlx2uqRHLCOyRyRMegnAWV2gkZlJ9szW7-8z-16SCxoniaJHsxJxaubkZzRyXGiFH6SEHYrSBiM71UGQ4JYW2oSy_BjFesDJoYPo5Hy-1E_I5tqqIMIeA";

  const features = Array.isArray(page?.features) ? page.features : [];

  return (
    // White surface scoped to this page (the app body is cream)
    <div className="bg-white">
      {/* HERO: CMS image under a flat navy overlay (design tokens) */}
      <section
        className={`${HERO_CLASS} text-white bg-cover bg-center`}
        style={{
          backgroundImage: `url("${heroBg}")`,
        }}
      >
        <div className="absolute inset-0 bg-imaa-navy/75" />
        <Container maxWidth="lg" disableGutters className="px-4 md:px-6 z-10">
          {/* text-white is set on the heading itself: the global h1 rule in index.css would otherwise make it navy */}
          <h1 className="font-serif text-3xl md:text-5xl font-bold leading-tight text-white break-words">
            {page?.hero_title || page?.title || "About"}
          </h1>

          {!!page?.hero_subtitle && (
            <p className="mt-3 md:mt-4 text-base md:text-xl max-w-3xl mx-auto text-white/90 break-words">
              {page.hero_subtitle}
            </p>
          )}
        </Container>
      </section>

      {/* Intro Section */}
      <section className="py-12 md:py-20">
        <Container maxWidth="lg" disableGutters className="px-4 md:px-6">
          <div className="text-center">
            <SectionTitle>{page?.title || "About"}</SectionTitle>
          </div>

          <div
            className={`${CMS_HTML_CLASS} mt-6 md:mt-8`}
            dangerouslySetInnerHTML={{
              __html: page?.intro_html || page?.body_html || "",
            }}
          />
        </Container>
      </section>

      {/* Feature Cards Section (cool-grey band between the white sections) */}
      {features.length > 0 && (
        <section className="py-12 md:py-20 bg-imaa-cool">
          <Container maxWidth="lg" disableGutters className="px-4 md:px-6">
            <div className="text-center">
              <SectionTitle>{page?.features_title || "What You Can Do"}</SectionTitle>
            </div>

            <div className="mt-8 md:mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 xl:gap-8">
              {features.map((f, idx) => (
                <div key={idx} className="h-full">
                  <FeaturedCard
                    image={f.image_url || heroBg}
                    title={f.title || ""}
                    desc={f.desc || ""}
                  />
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Mission Section */}
      {(page?.mission_title || page?.mission_html) && (
        <section className="py-12 md:py-20">
          <Container maxWidth="lg" disableGutters className="px-4 md:px-6">
            <Paper elevation={0} className="bg-white rounded-lg border border-imaa-border shadow-imaa-sm p-6 md:p-10">
              <div className="text-center">
                <SectionTitle>{page?.mission_title || "Our Mission"}</SectionTitle>
              </div>
              <div
                className={`${CMS_HTML_CLASS} mt-6`}
                dangerouslySetInnerHTML={{ __html: page?.mission_html || "" }}
              />
            </Paper>
          </Container>
        </section>
      )}
    </div>
  );
}
