import React from "react";
import { Container, Box, Paper, Alert, Skeleton } from "@mui/material";
import { apiClient } from "../utils/api";

// Same Title Style Like HomePage
const SectionTitle = ({ children }) => (
  <h2 className="text-2xl md:text-3xl font-bold text-neutral-900">{children}</h2>
);

// Same Card Style Like HomePage FeaturedCard
const FeaturedCard = ({ image, title, desc }) => (
  <Box
    component="article"
    className="bg-white rounded-2xl overflow-hidden shadow-sm card-hover-effect h-full flex flex-col"
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
      <div className="font-semibold text-neutral-900">{title}</div>
      <p className="mt-2 text-sm text-neutral-600">{desc}</p>
    </Box>
  </Box>
);

const AboutPageSkeleton = () => {
  return (
    <>
      {/* HERO Skeleton */}
      <section className="relative h-[50vh] min-h-[380px] md:h-[60vh] flex items-center justify-center text-center bg-cover bg-center">
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
                className="bg-white rounded-2xl overflow-hidden shadow-sm h-full flex flex-col"
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
          <Paper elevation={0} className="bg-white rounded-2xl p-6 md:p-10 neumorphic-shadow">
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
    </>
  );
};


export default function AboutPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [page, setPage] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await apiClient.get("/cms/pages/about/");
        if (!mounted) return;
        setPage(res.data);
        setError("");
      } catch (e) {
        if (!mounted) return;
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
    <>
      {/* HERO Like HomePage */}
      <section
        className="relative h-[50vh] min-h-[380px] md:h-[60vh] flex items-center justify-center text-center text-white bg-cover bg-center hero-image-overlay"
        style={{
          backgroundImage: `linear-gradient(rgba(17,33,32,0.55), rgba(17,33,32,0.75)), url("${heroBg}")`,
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <Container maxWidth="lg" disableGutters className="px-4 md:px-6 z-10">
          <h1 className="text-3xl md:text-6xl font-semibold leading-tight">
            {page?.hero_title || page?.title || "About"}
          </h1>

          {!!page?.hero_subtitle && (
            <p className="mt-3 md:mt-4 text-base md:text-xl max-w-3xl mx-auto text-white/90">
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
            className="
              prose prose-neutral prose-lg md:prose-xl
              max-w-4xl mx-auto mt-6 md:mt-8
              text-center
              prose-ul:text-left prose-ol:text-left prose-li:text-left
            "
            dangerouslySetInnerHTML={{
              __html: page?.intro_html || page?.body_html || "",
            }}
          />
        </Container>
      </section>

      {/* Feature Cards Section */}
      {features.length > 0 && (
        <section className="py-12 md:py-20">
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
            <Paper elevation={0} className="bg-white rounded-2xl p-6 md:p-10 neumorphic-shadow">
              <div className="text-center">
                <SectionTitle>{page?.mission_title || "Our Mission"}</SectionTitle>
              </div>
              <div
                className="
                  prose prose-neutral prose-lg md:prose-xl
                  max-w-4xl mx-auto mt-6
                  text-center
                  prose-ul:text-left prose-ol:text-left prose-li:text-left
                "
                dangerouslySetInnerHTML={{ __html: page?.mission_html || "" }}
              />
            </Paper>
          </Container>
        </section>
      )}
    </>
  );
}
