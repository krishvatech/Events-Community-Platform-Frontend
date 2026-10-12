// src/components/public/team/TeamCards.jsx
// Faculty and staff cards for the Our Team page. Plain components (no hooks), so they render on the
// server and inside the client-side faculty filter. Every value comes from the CMS (TeamMember).
import { FOCUS_RING, TEXT_LINK, isExternal } from "../about/aboutStyles.js";

// Portraits are shown in a circle: about a third of the WordPress photos are already circles on a
// white or grey square, and their corners stood out on the cards (dark mode especially). The crop
// is presentation only; the originals are unchanged.
function Photo({ photo, eager = false }) {
  return (
    <div className="px-6 pt-6">
      <div className="mx-auto aspect-square w-full max-w-[176px] overflow-hidden rounded-full bg-imaa-cool ring-1 ring-imaa-border">
        {photo ? (
          <img
            src={photo.url}
            alt={photo.alt || ""}
            width={photo.width || undefined}
            height={photo.height || undefined}
            sizes="176px"
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            className="block h-full w-full object-cover"
          />
        ) : null}
      </div>
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

export function FacultyCard({ member, programmeCodes, eager = false }) {
  const codes = member.programmes.map((slug) => programmeCodes[slug]).filter(Boolean);
  return (
    <article className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-imaa-border bg-white text-center">
      <Photo photo={member.photo} eager={eager} />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="m-0 font-sans text-lg font-semibold leading-snug text-imaa-ink">{member.name}</h3>
        {member.position ? <p className="m-0 mt-1 text-sm font-medium text-imaa-teal-dark">{member.position}</p> : null}
        {member.summary ? <p className="m-0 mt-3 text-[15px] leading-relaxed text-imaa-body">{member.summary}</p> : null}
        {codes.length ? (
          <ul aria-label="Programmes" className="m-0 mt-4 flex list-none flex-wrap justify-center gap-1.5 p-0">
            {codes.map((code) => (
              <li key={code} className="rounded-full bg-imaa-cool px-2.5 py-0.5 text-xs font-semibold text-imaa-ink">
                {code}
              </li>
            ))}
          </ul>
        ) : null}
        {member.profile_url || member.linkedin_url ? (
          <div className="mt-auto flex items-center justify-center gap-4 pt-4">
            {member.profile_url ? (
              <a href={member.profile_url} className={TEXT_LINK}>
                Bio<span className="sr-only">: {member.name}{isExternal(member.profile_url) ? " (imaa-institute.org)" : ""}</span>
                {isExternal(member.profile_url) ? <span aria-hidden="true">↗</span> : null}
              </a>
            ) : null}
            {member.linkedin_url ? (
              <a
                href={member.linkedin_url}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-imaa-link hover:text-imaa-teal-dark ${FOCUS_RING}`}
              >
                <LinkedInIcon />
                <span className="sr-only">{member.name} on LinkedIn</span>
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function StaffCard({ member }) {
  return (
    <article className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-imaa-border bg-white text-center">
      <Photo photo={member.photo} />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="m-0 font-sans text-lg font-semibold leading-snug text-imaa-ink">{member.name}</h3>
        {member.position ? <p className="m-0 mt-1 text-sm leading-snug text-imaa-body">{member.position}</p> : null}
        {member.location ? (
          <p className="m-0 mt-auto flex items-center justify-center gap-1.5 pt-3 text-sm font-medium text-imaa-meta">
            <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="currentColor" className="shrink-0 text-imaa-teal">
              <path d="M10 1.5a6.2 6.2 0 0 0-6.2 6.2c0 4.6 6.2 10.8 6.2 10.8s6.2-6.2 6.2-10.8A6.2 6.2 0 0 0 10 1.5Zm0 8.6a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8Z" />
            </svg>
            <span className="sr-only">Location: </span>
            {member.location}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export const CARD_GRID = "m-0 grid list-none gap-5 p-0 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
