// src/components/Header.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

const Header = () => {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(
    !!localStorage.getItem("token") || !!localStorage.getItem("access_token")
  );
  const location = useLocation();

  useEffect(() => {
    const onStorage = () =>
      setAuthed(
        !!localStorage.getItem("token") || !!localStorage.getItem("access_token")
      );
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setAuthed(false);
    window.location.href = "/";
  };

  const NavA = ({ href, children }) => (
  <a
    href={href}
    className="px-1 py-2 text-base text-gray-500 hover:text-teal-400 transition-colors whitespace-nowrap"
  >
    {children}
  </a>
);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',               // ⬅️ opaque header (no see-through)
        borderBottom: '1px solid rgba(27,187,179,0.10)',
        zIndex: (t) => t.zIndex.drawer + 2,        // ⬅️ always above any Drawer
        backdropFilter: 'none',
      }}
      // className="top-0 z-50 bg-white border-b border-[#1bbbb3]/10"
    >
      <Toolbar disableGutters className="h-14 md:h-16">
        {/* 3-column flex so the nav stays truly centered */}
        <Box className="mx-auto max-w-7xl w-full px-3 sm:px-4 lg:px-6 flex items-center">
          {/* Left: Brand (flex-1) */}
          <Box component={Link} to="/" className="flex items-center gap-2 flex-1">
            <svg class="text-primary" style={{ color: "rgb(27 187 179 / var(--tw-text-opacity, 1))" }} fill="none" height="32" viewBox="0 0 48 48" width="32" xmlns="http://www.w3.org/2000/svg">
            <path d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z" fill="currentColor"></path>
            </svg>
            <span className="text-xl font-bold tracking-tight text-neutral-800">
              IMAA Connect
            </span>
          </Box>

          {/* Center: Nav (flex-1, perfectly centered) */}
          <Box
            component="nav"
            className="hidden md:flex flex-1 items-center justify-center"
          >
            <div className="flex items-center gap-6 md:gap-8">
              <NavA href="/#events">Events</NavA>
              <NavA href="/#community">Community</NavA>
              <NavA href="/#resources">Resources</NavA>
              <NavA href="/#about">About Us</NavA>
            </div>
          </Box>

          {/* Right: Actions (flex-1, right-aligned) */}
          <Box className="hidden md:flex flex-1 items-center justify-end gap-2.5">
            {authed ? (
              <Button
                onClick={signOut}
                className="btn-glow h-9 px-5 rounded-xl text-base font-semibold bg-teal-500 text-white hover:bg-teal-600 hover:-translate-y-0.5"
                disableElevation
                sx={{ textTransform: "none" }}
              >
                Sign Out
              </Button>
            ) : (
              <>
                <Button
                  component={Link}
                  to="/signin"
                  className="btn-glow h-9 px-5 rounded-xl text-base font-semibold bg-teal-100 text-teal-500 border border-teal-100 hover:bg-teal-200 hover:text-teal-700 hover:-translate-y-0.5"
                  variant="text"
                  sx={{ textTransform: "none" }}
                >
                  Login
                </Button>
                <Button
                  component={Link}
                  to="/signup"
                  className="btn-glow h-9 px-5 rounded-xl text-base font-semibold bg-teal-500 text-white hover:bg-teal-700 hover:-translate-y-0.5"
                  disableElevation
                  sx={{ textTransform: "none" }}
                >
                  Join Now
                </Button>
              </>
            )}
          </Box>

          {/* Mobile burger (push to far right) */}
          <Box className="md:hidden ml-auto">
            <IconButton
              aria-label="menu"
              onClick={() => setOpen(true)}
              className="text-neutral-700"
              size="large"
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Box>
      </Toolbar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ className: "w-72" }}
      >
        <Box className="p-4">
          <Box className="flex items-center justify-between">
            <Box className="flex items-center gap-2">
              <svg class="text-primary" style={{ color: "rgb(27 187 179 / var(--tw-text-opacity, 1))" }} fill="none" height="32" viewBox="0 0 48 48" width="32" xmlns="http://www.w3.org/2000/svg">
              <path d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z" fill="currentColor"></path>
              </svg>
              <span className="text-lg font-bold text-neutral-900">
                IMAA Connect
              </span>
            </Box>
            <IconButton onClick={() => setOpen(false)} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider className="my-4" />

          <List>
            {[
              { href: "/#events", label: "Events" },
              { href: "/#community", label: "Community" },
              { href: "/#resources", label: "Resources" },
              { href: "/#about", label: "About Us" },
            ].map((i) => (
              <ListItemButton
                key={i.href}
                component="a"
                href={i.href}
                onClick={() => setOpen(false)}
              >
                <ListItemText
                  primary={i.label}
                  primaryTypographyProps={{ className: "text-base text-gray-700" }}
                />
              </ListItemButton>
            ))}
          </List>

          {authed ? (
            <Button
              fullWidth
              onClick={signOut}
              className="mt-2 h-10 rounded-xl bg-neutral-900 text-white text-base font-semibold"
              sx={{ textTransform: "none" }}
            >
              Sign Out
            </Button>
          ) : (
            <Box className="mt-3 flex gap-2">
              <Button
                fullWidth
                component={Link}
                to="/signin"
                onClick={() => setOpen(false)}
                className="h-10 rounded-xl bg-teal-50 text-teal-500 border border-teal-100 text-base font-semibold"
                variant="outlined"
                sx={{ textTransform: "none" }}
              >
                Login
              </Button>
              <Button
                fullWidth
                component={Link}
                to="/signup"
                onClick={() => setOpen(false)}
                className="h-10 rounded-xl bg-teal-500 text-white text-base font-semibold"
                sx={{ textTransform: "none" }}
              >
                Join Now
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>
    </AppBar>
  );
};

export default Header;
