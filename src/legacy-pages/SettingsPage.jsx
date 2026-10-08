import React from "react";
import { useNavigate } from "#navigation";
import { Box, Button, Container, Paper } from "@mui/material";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { PageHeader, EmptyState } from "../components/page";

// Settings is still a placeholder. Same shell as the other member pages (A3 PageHeader + EmptyState).
export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "var(--imaa-bg-member, #F7F8FA)" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 2.5, sm: 4 }, px: { xs: 2, sm: 3 } }}>
        <PageHeader eyebrow="Account" title="Settings" sx={{ mb: 3 }} />
        <Paper variant="outlined" sx={{ borderRadius: "var(--imaa-radius-card)", borderColor: "var(--imaa-border)", boxShadow: "var(--imaa-shadow-sm)" }}>
          <EmptyState
            icon={<SettingsRoundedIcon />}
            title="Coming Soon"
            description="We're working on something great. Account settings will be available here soon."
            action={
              <Button
                variant="outlined"
                onClick={() => navigate(-1)}
                sx={{
                  textTransform: "none",
                  borderColor: "var(--imaa-dm-text-2, var(--imaa-navy))",
                  color: "var(--imaa-dm-text, var(--imaa-navy))",
                  "&:hover": { borderColor: "var(--imaa-teal)", color: "var(--imaa-dm-teal-text, var(--imaa-teal-hover))" },
                }}
              >
                Go Back
              </Button>
            }
          />
        </Paper>
      </Container>
    </Box>
  );
}
