import React from "react";
import { useNavigate } from "#navigation";
import { Button, Container } from "@mui/material";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { PageHeader, EmptyState } from "../components/page";

// Settings is still a placeholder. Same shell as the other member pages (A3 PageHeader + EmptyState).
export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <PageHeader title="Settings" sx={{ mb: 3 }} />

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
              borderColor: "var(--imaa-navy)",
              color: "var(--imaa-navy)",
              // Darker teal on hover keeps the label at AA contrast
              "&:hover": { borderColor: "var(--imaa-teal)", color: "var(--imaa-teal-hover)" },
            }}
          >
            Go Back
          </Button>
        }
      />
    </Container>
  );
}
