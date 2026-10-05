// Shared Blog UI tokens, matching the existing Explore pages (GroupsPage).
export const BLOG_TEAL = "#0A9396";
export const BLOG_TEAL_DARK = "#077B7E";
export const BLOG_NAVY = "var(--imaa-dm-text, #1B2A4A)";
export const BLOG_BORDER = "var(--imaa-dm-border, #e2e8f0)";
export const BLOG_PAGE_BG = "var(--imaa-dm-page, #FAF9F7)";
export const BLOG_MUTED = "var(--imaa-dm-text-meta, #6b7280)";

export const blogPrimaryButtonSx = {
  textTransform: "none",
  fontWeight: 700,
  bgcolor: BLOG_TEAL,
  "&:hover": { bgcolor: BLOG_TEAL_DARK },
  borderRadius: "10px",
};
