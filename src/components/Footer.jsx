// src/components/Footer.jsx
import React from "react";
import { Container, Box, Link as MLink, IconButton } from "@mui/material";

const Footer = () => (
  <Box component="footer" className="bg-neutral-50 border-t border-teal-100">
    {/* No default padding; we control the gutter */}
    <Container maxWidth={false} disableGutters>
      {/* Match header/content frame: mx-auto max-w-7xl px-6 */}
      <Box className="mx-auto max-w-7xl px-6 py-10">
        {/* Top row: NAV left, SOCIAL right */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* NAV (left-aligned, starts at same vertical line as content) */}
          <nav className="flex flex-wrap gap-x-10 gap-y-3 text-base text-neutral-700">
            <MLink href="/#about" underline="none" color="inherit" className="hover:text-teal-600">About Us</MLink>
            <MLink href="#" underline="none" color="inherit" className="hover:text-teal-600">Contact</MLink>
            <MLink href="#" underline="none" color="inherit" className="hover:text-teal-600">Privacy Policy</MLink>
            <MLink href="#" underline="none" color="inherit" className="hover:text-teal-600">Terms of Service</MLink>
          </nav>

          {/* SOCIAL (right) */}
          <div className="flex justify-start md:justify-end gap-3 text-neutral-500">
            <IconButton size="small" aria-label="Twitter" className="hover:text-teal-600">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M23.953 4.569a10.09 10.09 0 0 1-2.825.775 4.93 4.93 0 0 0 2.163-2.723 9.86 9.86 0 0 1-3.127 1.184 4.92 4.92 0 0 0-8.39 4.482A13.978 13.978 0 0 1 1.671 3.149a4.92 4.92 0 0 0 1.523 6.573 4.9 4.9 0 0 1-2.23-.616v.062a4.93 4.93 0 0 0 3.95 4.827 4.96 4.96 0 0 1-2.224.085 4.93 4.93 0 0 0 4.604 3.417A9.9 9.9 0 0 1 0 19.539a13.945 13.945 0 0 0 7.548 2.213c9.057 0 14.01-7.496 14.01-13.986 0-.214-.005-.425-.016-.636a10.005 10.005 0 0 0 2.411-2.561z"/>
              </svg>
            </IconButton>
            <IconButton size="small" aria-label="LinkedIn" className="hover:text-teal-600">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0 8h5v16H0V8zm7 0h4.7v2.2h.1c.6-1.1 2.1-2.2 4.3-2.2 4.6 0 5.4 3 5.4 6.9V24h-5V15.7c0-2 0-4.6-2.8-4.6s-3.2 2.2-3.2 4.4V24H7V8z"/>
              </svg>
            </IconButton>
          </div>
        </div>

        {/* Bottom row: copyright centered */}
        <div className="mt-6 text-center text-sm text-neutral-500">
          © {new Date().getFullYear()} IMAA Connect. All rights reserved.
        </div>
      </Box>
    </Container>
  </Box>
);

export default Footer;
