import React from "react";
import { Container, Typography, Box, CircularProgress, Alert } from "@mui/material";
import { apiClient } from "../utils/api";

export default function AboutPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await apiClient.get("/cms/pages/about/");
        if (!mounted) return;
        setData(res.data);
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
    return (
      <Container sx={{ py: 6 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 6 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {data?.title || "About"}
      </Typography>

      {data?.intro_html && (
        <Box sx={{ mb: 3 }} dangerouslySetInnerHTML={{ __html: data.intro_html }} />
      )}

      {data?.body_html && (
        <Box dangerouslySetInnerHTML={{ __html: data.body_html }} />
      )}
    </Container>
  );
}
