import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import { API_BASE, getToken } from "../../utils/api";

const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

const toAbsoluteUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API_ORIGIN}${path}`;
};

export default function PublicGroupLandingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_BASE}/groups/public/${encodeURIComponent(slug)}/`,
          { headers: { Accept: "application/json" } }
        );
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "This group does not have a public landing page."
              : data?.detail || "Unable to load this group."
          );
        }

        if (active) setGroup(data);
      } catch (err) {
        if (active) setError(err?.message || "Unable to load this group.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <Box sx={{ minHeight: "65vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!group) {
    return (
      <Container maxWidth="sm" sx={{ py: 10 }}>
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            {error || "This group is not publicly available."}
          </Alert>
          <Button variant="contained" onClick={() => navigate("/")} sx={{ textTransform: "none" }}>
            Back to home
          </Button>
        </Paper>
      </Container>
    );
  }

  const logoUrl = toAbsoluteUrl(group.logo);
  const coverUrl = toAbsoluteUrl(group.cover_image);
  const signedIn = Boolean(getToken());
  const memberLabel = `${Number(group.member_count || 0).toLocaleString()} ${
    Number(group.member_count || 0) === 1 ? "member" : "members"
  }`;
  const groupPath = `/community/groups/${group.id}`;
  const encodedNext = encodeURIComponent(groupPath);

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", pb: 8 }}>
      <Box
        sx={{
          minHeight: { xs: 240, md: 360 },
          position: "relative",
          overflow: "hidden",
          bgcolor: "#0f2942",
          backgroundImage: coverUrl
            ? `linear-gradient(180deg, rgba(15,41,66,.16), rgba(15,41,66,.74)), url(${coverUrl})`
            : "linear-gradient(135deg, #0f2942 0%, #155e75 55%, #0f766e 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: coverUrl
              ? "linear-gradient(90deg, rgba(15,41,66,.76) 0%, rgba(15,41,66,.28) 62%, transparent 100%)"
              : "none",
          }}
        />
      </Box>

      <Container maxWidth="lg" sx={{ mt: { xs: -8, md: -12 }, position: "relative", zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            border: "1px solid #dbe4ea",
            boxShadow: "0 20px 50px rgba(15, 41, 66, 0.12)",
            overflow: "hidden",
          }}
        >
          <Box sx={{ p: { xs: 3, md: 5 } }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={3}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={2.5} alignItems="center">
                <Avatar
                  src={logoUrl || undefined}
                  alt={group.name}
                  sx={{
                    width: { xs: 76, md: 96 },
                    height: { xs: 76, md: 96 },
                    bgcolor: "#0f2942",
                    border: "4px solid white",
                    boxShadow: "0 8px 24px rgba(15, 41, 66, .16)",
                    fontSize: 32,
                    fontWeight: 800,
                  }}
                >
                  {String(group.name || "G").charAt(0).toUpperCase()}
                </Avatar>

                <Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    <Chip size="small" label="Public group" sx={{ bgcolor: "#e6fffb", color: "#0f766e", fontWeight: 700 }} />
                    <Chip
                      size="small"
                      icon={<GroupsRoundedIcon />}
                      label={memberLabel}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>
                  <Typography
                    component="h1"
                    sx={{
                      color: "#102a43",
                      fontSize: { xs: 30, md: 44 },
                      lineHeight: 1.1,
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {group.name}
                  </Typography>
                </Box>
              </Stack>

              {signedIn ? (
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardRoundedIcon />}
                  onClick={() => navigate(groupPath)}
                  sx={{
                    textTransform: "none",
                    borderRadius: 2,
                    px: 3,
                    py: 1.2,
                    bgcolor: "#0db7a5",
                    "&:hover": { bgcolor: "#0b9f91" },
                  }}
                >
                  Open Group
                </Button>
              ) : (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ width: { xs: "100%", md: "auto" } }}>
                  <Button
                    variant="contained"
                    startIcon={<PersonAddAlt1RoundedIcon />}
                    onClick={() => navigate(`/signup?next=${encodedNext}`)}
                    sx={{
                      textTransform: "none",
                      borderRadius: 2,
                      px: 3,
                      py: 1.2,
                      bgcolor: "#0db7a5",
                      "&:hover": { bgcolor: "#0b9f91" },
                    }}
                  >
                    Register
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<LoginRoundedIcon />}
                    onClick={() => navigate(`/signin?next=${encodedNext}`)}
                    sx={{ textTransform: "none", borderRadius: 2, px: 3, py: 1.2 }}
                  >
                    Sign In
                  </Button>
                </Stack>
              )}
            </Stack>

            <Box sx={{ mt: { xs: 4, md: 5 }, pt: { xs: 3, md: 4 }, borderTop: "1px solid #e2e8f0" }}>
              <Typography variant="h5" sx={{ color: "#102a43", fontWeight: 800, mb: 1.5 }}>
                About this group
              </Typography>
              <Typography
                sx={{
                  color: "#486581",
                  lineHeight: 1.8,
                  fontSize: { xs: 16, md: 17 },
                  maxWidth: 900,
                  whiteSpace: "pre-line",
                }}
              >
                {group.description || "This group has not added a public description yet."}
              </Typography>
            </Box>
          </Box>

          {!signedIn && (
            <Box sx={{ bgcolor: "#eef8f7", borderTop: "1px solid #d9efec", px: { xs: 3, md: 5 }, py: 3 }}>
              <Typography sx={{ color: "#334e68", fontWeight: 600 }}>
                Join the Events & Community Platform to access group members, posts, relations and chat.
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
