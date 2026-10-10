// src/components/public/about/aboutStyles.js
// Shared Tailwind class strings for the About page sections (design pack: section blocks with a
// 1200px container, 700px prose, serif section headings, white / cool-grey grounds).

export const PROSE_CLASS = [
  "break-words text-base leading-[1.75] text-imaa-body md:text-lg",
  "[&_p]:mt-4 [&_p:first-child]:mt-0",
  "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1.5 [&_li::marker]:text-imaa-teal",
  "[&_a]:text-imaa-link [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-imaa-teal-dark",
  "[&_strong]:font-semibold [&_strong]:text-imaa-ink [&_b]:font-semibold [&_b]:text-imaa-ink",
].join(" ");

// Smaller rich text inside cards, accordions and bands.
export const SMALL_PROSE_CLASS = [
  "break-words text-[15px] leading-relaxed text-imaa-body",
  "[&_p]:mt-3 [&_p:first-child]:mt-0",
  "[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_li::marker]:text-imaa-teal",
  "[&_a]:text-imaa-link [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-imaa-teal-dark",
  "[&_strong]:font-semibold [&_strong]:text-imaa-ink [&_b]:font-semibold [&_b]:text-imaa-ink",
].join(" ");

export const GROUNDS = ["bg-white", "bg-imaa-cool"];
export const SECTION_INNER = "mx-auto w-full max-w-[1200px] px-6 py-14 md:py-[60px]";
export const HEADING_CLASS = "m-0 font-serif text-[26px] font-bold leading-tight tracking-[-0.01em] text-imaa-ink md:text-[32px]";
export const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-imaa-teal";
// Teal-dark, as the FAQ's contact button: white text on the brand coral is only about 3.6:1.
export const PRIMARY_BUTTON = `inline-flex min-h-[44px] items-center justify-center rounded-full bg-imaa-teal-dark px-6 py-2.5 font-sans text-sm font-bold text-white no-underline transition-colors hover:bg-imaa-navy ${FOCUS_RING}`;
// border-current follows the (dark-aware) ink colour, so the outline stays visible in dark mode.
export const SECONDARY_BUTTON = `inline-flex min-h-[44px] items-center justify-center rounded-full border border-current px-6 py-2.5 font-sans text-sm font-bold text-imaa-ink no-underline transition-colors hover:bg-imaa-navy hover:text-white ${FOCUS_RING}`;
export const TEXT_LINK = `inline-flex min-h-[44px] items-center gap-1 font-sans text-sm font-semibold text-imaa-link no-underline hover:text-imaa-teal-dark hover:underline ${FOCUS_RING} rounded`;

// External destinations (still on imaa-institute.org until migrated) open in the same tab, like
// every other public link; they are marked for screen readers and with a small arrow.
export const isExternal = (url) => /^https?:\/\//i.test(url || "");
