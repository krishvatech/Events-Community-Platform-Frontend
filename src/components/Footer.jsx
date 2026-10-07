// src/components/Footer.jsx
import React from "react";
import { Container, Box, Link as MLink, IconButton } from "@mui/material";
import { colors, focus, layout } from "../styles/designTokens";

// Brand navy footer with white text. The ground uses the navy CSS token (same #1B2A4A in light
// mode) so dark mode gets the lifted navy from brand.css instead of vanishing into the page.
const NAVY_BG = "var(--imaa-navy)";

const footerLinkSx = {
  color: "rgba(255,255,255,.78)",
  fontSize: 14,
  fontWeight: 500,
  textDecoration: "none",
  borderRadius: "2px",
  transition: "color .15s ease",
  "&:hover": { color: colors.white },
  "&:focus-visible": {
    color: colors.white,
    outline: `${focus.width}px solid ${focus.color}`,
    outlineOffset: focus.offset,
  },
};

const socialButtonSx = {
  width: 44,
  height: 44,
  color: "rgba(255,255,255,.82)",
  border: "1px solid rgba(255,255,255,.28)",
  "&:hover": {
    color: colors.white,
    bgcolor: "rgba(255,255,255,.08)",
    borderColor: "rgba(255,255,255,.62)",
  },
  "&:focus-visible": {
    outline: `${focus.width}px solid ${colors.white}`,
    outlineOffset: focus.offset,
  },
};

const Footer = () => (
  <Box component="footer" sx={{ bgcolor: NAVY_BG, color: colors.white, borderTop: "1px solid rgba(255,255,255,.12)" }}>
    <Container maxWidth={false} disableGutters>
      <Box sx={{ mx: "auto", maxWidth: layout.contentMax, px: { xs: 3, sm: 4 }, py: { xs: 4.5, md: 5.5 } }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: { md: "center" }, justifyContent: "space-between", gap: { xs: 3, md: 5 }, pb: 4, borderBottom: "1px solid rgba(255,255,255,.16)" }}>
          <Box component="nav" aria-label="Footer navigation" sx={{ display: "flex", flexWrap: "wrap", columnGap: { xs: 3, sm: 5 }, rowGap: 2 }}>
            <MLink href="/#about" underline="none" sx={footerLinkSx}>About Us</MLink>
            <MLink href="#" underline="none" sx={footerLinkSx}>Contact</MLink>
            <MLink href="#" underline="none" sx={footerLinkSx}>Privacy Policy</MLink>
            <MLink href="#" underline="none" sx={footerLinkSx}>Terms of Service</MLink>
          </Box>

          <Box role="group" aria-label="Social media" sx={{ display: "flex", gap: 1 }}>
            <IconButton aria-label="Twitter" sx={socialButtonSx}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M23.953 4.569a10.09 10.09 0 0 1-2.825.775 4.93 4.93 0 0 0 2.163-2.723 9.86 9.86 0 0 1-3.127 1.184 4.92 4.92 0 0 0-8.39 4.482A13.978 13.978 0 0 1 1.671 3.149a4.92 4.92 0 0 0 1.523 6.573 4.9 4.9 0 0 1-2.23-.616v.062a4.93 4.93 0 0 0 3.95 4.827 4.96 4.96 0 0 1-2.224.085 4.93 4.93 0 0 0 4.604 3.417A9.9 9.9 0 0 1 0 19.539a13.945 13.945 0 0 0 7.548 2.213c9.057 0 14.01-7.496 14.01-13.986 0-.214-.005-.425-.016-.636a10.005 10.005 0 0 0 2.411-2.561z"/>
              </svg>
            </IconButton>
            <IconButton aria-label="LinkedIn" sx={socialButtonSx}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0 8h5v16H0V8zm7 0h4.7v2.2h.1c.6-1.1 2.1-2.2 4.3-2.2 4.6 0 5.4 3 5.4 6.9V24h-5V15.7c0-2 0-4.6-2.8-4.6s-3.2 2.2-3.2 4.4V24H7V8z"/>
              </svg>
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ pt: 3, textAlign: { xs: "left", sm: "center" }, color: "rgba(255,255,255,.58)", fontSize: 13, lineHeight: 1.6 }}>
          © {new Date().getFullYear()} IMAA Connect. All rights reserved.
        </Box>
      </Box>
    </Container>
  </Box>
);

export default Footer;
