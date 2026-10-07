import React from "react";
import { Container, Box, Alert, Skeleton } from "@mui/material";
import { apiClient } from "../utils/api";
import { EmptyState } from "../components/page";
import heroFallbackImage from "../assets/cities.png";

// Public-page ink: the same heading colour as Home and the public footer, readable in dark mode.
const INK = "var(--imaa-dm-text, #243E75)";
const BODY = "var(--imaa-ink-body)";
const BORDER = "var(--imaa-border)";
const COOL = "var(--imaa-bg-cool)";
// Dark-mode aware white grounds (light values unchanged; brand.css "Dark-mode override tokens").
const PAGE_BG = "var(--imaa-dm-page, #FFFFFF)";
const CARD_BG = "var(--imaa-dm-surface, #FFFFFF)";
// Hero photo scrim: white in light mode, the dark page colour in dark mode (same stops as Home).
const heroScrim = (alpha) => `rgb(var(--imaa-dm-page-rgb, 255 255 255) / ${alpha})`;

const headingSx = {
  m: 0,
  fontFamily: "var(--imaa-font-serif)",
  color: INK,
  fontWeight: 700,
  letterSpacing: "-.02em",
  overflowWrap: "anywhere",
};

const SectionTitle = ({ children, align = "left" }) => (
  <Box
    component="h2"
    sx={{
      ...headingSx,
      fontSize: { xs: 32, md: 44 },
      lineHeight: 1.15,
      textAlign: align,
      textWrap: "balance",
    }}
  >
    {children}
  </Box>
);

const cmsHtmlSx = {
  color: BODY,
  fontSize: { xs: 16, md: 18 },
  lineHeight: 1.75,
  overflowWrap: "anywhere",
  "& p": { mt: 2, mb: 0 },
  "& p:first-of-type": { mt: 0 },
  "& h2": { ...headingSx, mt: 4, mb: 0, fontSize: { xs: 26, md: 32 }, lineHeight: 1.25 },
  "& h3": { ...headingSx, mt: 3, mb: 0, fontSize: { xs: 21, md: 24 }, lineHeight: 1.3 },
  "& ul, & ol": { mt: 2.5, mb: 0, pl: { xs: 3, md: 3.5 } },
  "& li": { mb: 1, pl: 0.5 },
  "& li::marker": { color: "var(--imaa-teal)" },
  "& a": { color: "var(--imaa-link)", textDecoration: "underline", textUnderlineOffset: "3px" },
  "& a:focus-visible": { outline: "2px solid var(--imaa-teal)", outlineOffset: 3, borderRadius: 1 },
  "& strong": { color: INK, fontWeight: 700 },
};

const FeaturedCard = ({ image, title, desc }) => (
  <Box
    component="article"
    sx={{
      bgcolor: CARD_BG,
      border: `1px solid ${BORDER}`,
      borderRadius: "var(--imaa-radius-card)",
      overflow: "hidden",
      boxShadow: "0 4px 16px rgba(27,42,74,.05)",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      transition: "transform .2s ease, box-shadow .2s ease, border-color .2s ease",
      "&:hover": {
        transform: "translateY(-2px)",
        borderColor: "var(--imaa-dm-border-strong, rgba(27,42,74,.18))",
        boxShadow: "0 8px 22px rgba(27,42,74,.08)",
      },
      "@media (prefers-reduced-motion: reduce)": {
        transition: "none",
        "&:hover": { transform: "none" },
      },
    }}
  >
    <Box sx={{ width: "100%", aspectRatio: "16 / 9", overflow: "hidden", bgcolor: COOL }}>
      <img
        src={image}
        alt={title}
        loading="lazy"
        style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", objectPosition: "center" }}
      />
    </Box>

    <Box sx={{ p: { xs: 2.5, md: 3 }, flex: 1, display: "flex", flexDirection: "column" }}>
      <Box component="h3" sx={{ ...headingSx, fontSize: 20, lineHeight: 1.3 }}>
        {title}
      </Box>
      <Box component="p" sx={{ mt: 1.25, mb: 0, color: BODY, fontSize: 15, lineHeight: 1.7 }}>
        {desc}
      </Box>
    </Box>
  </Box>
);

const AboutPageSkeleton = () => {
  return (
    <Box sx={{ bgcolor: PAGE_BG }}>
      {/* HERO Skeleton */}
      <Box component="section" sx={{ minHeight: { xs: 390, md: 470 }, display: "flex", alignItems: "center", bgcolor: COOL }}>
        <Container maxWidth="lg">
          <Skeleton variant="text" width="55%" height={70} />
          <Skeleton variant="text" sx={{ mt: 2 }} width="68%" height={28} />
          <Skeleton variant="text" width="58%" height={28} />
        </Container>
      </Box>

      {/* Intro Skeleton */}
      <Box component="section" sx={{ py: { xs: 7, md: 9 } }}>
        <Container maxWidth="md">
          <Skeleton variant="text" width="34%" height={48} />
          <Box sx={{ mt: 3 }}>
            <Skeleton variant="text" height={28} />
            <Skeleton variant="text" height={28} />
            <Skeleton variant="text" height={28} width="85%" />
            <Skeleton variant="text" height={28} width="75%" />
          </Box>
        </Container>
      </Box>

      {/* Feature Cards Skeleton */}
      <Box component="section" sx={{ py: { xs: 7, md: 9 }, bgcolor: COOL }}>
        <Container maxWidth="lg">
          <Skeleton variant="text" width="46%" height={48} />
          <Box sx={{ mt: { xs: 4, md: 5 }, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, gap: { xs: 2.5, md: 3 } }}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{ bgcolor: CARD_BG, borderRadius: "var(--imaa-radius-card)", border: `1px solid ${BORDER}`, overflow: "hidden" }}
              >
                <Skeleton variant="rectangular" sx={{ aspectRatio: "16 / 9" }} />
                <Box sx={{ p: 3 }}>
                  <Skeleton variant="text" height={28} width="70%" />
                  <Skeleton variant="text" height={22} />
                  <Skeleton variant="text" height={22} width="85%" />
                </Box>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Mission Skeleton */}
      <Box component="section" sx={{ py: { xs: 7, md: 9 } }}>
        <Container maxWidth="lg">
          <Box sx={{ bgcolor: COOL, borderRadius: "var(--imaa-radius-card)", p: { xs: 3.5, md: 6 } }}>
            <Skeleton variant="text" width="30%" height={48} />
            <Box sx={{ mt: 3 }}>
              <Skeleton variant="text" height={26} />
              <Skeleton variant="text" height={26} />
              <Skeleton variant="text" height={26} width="80%" />
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
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

  // Local photographic fallback, the same as the Home hero (no third-party hotlink).
  const heroBg = page?.hero_image_url || heroFallbackImage;

  const features = Array.isArray(page?.features) ? page.features : [];

  return (
    <Box sx={{ bgcolor: PAGE_BG, color: INK, overflowX: "hidden" }}>
      {/* HERO: CMS photography under the same light scrim and typography as the Home hero */}
      <Box
        component="section"
        sx={{
          position: "relative",
          minHeight: { xs: 390, sm: 430, md: 470 },
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          backgroundImage: `linear-gradient(90deg, ${heroScrim(".97")} 0%, ${heroScrim(".88")} 45%, ${heroScrim(".3")} 100%), url("${heroBg}")`,
          backgroundSize: "cover",
          backgroundPosition: { xs: "62% center", md: "center" },
        }}
      >
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, py: { xs: 6, md: 8 } }}>
          <Box sx={{ maxWidth: { xs: 610, md: 700 } }}>
            <Box
              component="h1"
              sx={{
                ...headingSx,
                fontSize: { xs: 40, sm: 50, md: 60 },
                lineHeight: 1.08,
                fontWeight: 700,
                textWrap: "balance",
              }}
            >
              {page?.hero_title || page?.title || "About"}
            </Box>

            {!!page?.hero_subtitle && (
              <Box
                component="p"
                sx={{
                  mt: { xs: 2, md: 2.5 },
                  mb: 0,
                  maxWidth: 620,
                  color: BODY,
                  fontSize: { xs: 16, md: 19 },
                  lineHeight: 1.7,
                  overflowWrap: "anywhere",
                }}
              >
                {page.hero_subtitle}
              </Box>
            )}
          </Box>
        </Container>
      </Box>

      {/* Intro Section */}
      <Box component="section" sx={{ py: { xs: 7, md: 9 }, bgcolor: PAGE_BG }}>
        <Container maxWidth="md">
          <SectionTitle>{page?.title || "About"}</SectionTitle>

          <Box
            sx={{ ...cmsHtmlSx, mt: { xs: 3, md: 3.5 } }}
            dangerouslySetInnerHTML={{
              __html: page?.intro_html || page?.body_html || "",
            }}
          />
        </Container>
      </Box>

      {/* Feature Cards Section */}
      {features.length > 0 && (
        <Box component="section" sx={{ py: { xs: 7, md: 9 }, bgcolor: COOL }}>
          <Container maxWidth="lg">
            <SectionTitle>{page?.features_title || "What You Can Do"}</SectionTitle>

            <Box
              sx={{
                mt: { xs: 4, md: 5 },
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(3, minmax(0, 1fr))",
                },
                gap: { xs: 2.5, md: 3 },
                alignItems: "stretch",
              }}
            >
              {features.map((f, idx) => (
                <Box key={idx} sx={{ minWidth: 0, height: "100%" }}>
                  <FeaturedCard
                    image={f.image_url || heroBg}
                    title={f.title || ""}
                    desc={f.desc || ""}
                  />
                </Box>
              ))}
            </Box>
          </Container>
        </Box>
      )}

      {/* Mission Section */}
      {(page?.mission_title || page?.mission_html) && (
        <Box component="section" sx={{ py: { xs: 7, md: 9 }, bgcolor: PAGE_BG }}>
          <Container maxWidth="lg">
            <Box
              sx={{
                bgcolor: COOL,
                borderRadius: "var(--imaa-radius-card)",
                borderLeft: "3px solid var(--imaa-teal)",
                px: { xs: 3, sm: 4, md: 6 },
                py: { xs: 3.5, md: 5 },
              }}
            >
              <Box sx={{ maxWidth: 850 }}>
                <SectionTitle>{page?.mission_title || "Our Mission"}</SectionTitle>
              </Box>
              <Box
                sx={{ ...cmsHtmlSx, mt: { xs: 2.5, md: 3 }, maxWidth: 850 }}
                dangerouslySetInnerHTML={{ __html: page?.mission_html || "" }}
              />
            </Box>
          </Container>
        </Box>
      )}
    </Box>
  );
}
