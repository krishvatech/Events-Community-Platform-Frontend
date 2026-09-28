// src/pages/SignUpPage.jsx
// Renders the landing-page background with the signup modal open.
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import AuthModal from "../components/AuthModal.jsx";

export default function SignUpPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 50%, #f8fafc 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AuthModal open={open} onClose={handleClose} initialMode="signup" />
    </Box>
  );
}
