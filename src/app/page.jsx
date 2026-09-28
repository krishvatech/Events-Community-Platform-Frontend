// Temporary Next.js migration verification page (Server Component).
// Not the IMAA Connect Home page; it only proves App Router, providers,
// MUI/Emotion, Tailwind, global CSS and the env module work together.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import env from "../lib/env";

const configured = (value) => (value ? "set" : "not set");

export default function MigrationVerificationPage() {
  return (
    <Box component="main" sx={{ maxWidth: 640, mx: "auto", px: 2, py: 6 }}>
      <Paper variant="outlined" sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          IMAA Connect — Next.js Migration
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          App Router foundation is running.
        </Typography>

        <p className="mt-4 text-sm" style={{ color: "var(--imaa-navy)" }}>
          NEXT_PUBLIC_API_BASE_URL: {configured(env.API_BASE_URL)} · NEXT_PUBLIC_AUTH_PROVIDER:{" "}
          {configured(env.AUTH_PROVIDER)}
        </p>

        <Button variant="contained" sx={{ mt: 3 }}>
          MUI theme check
        </Button>
      </Paper>
    </Box>
  );
}
