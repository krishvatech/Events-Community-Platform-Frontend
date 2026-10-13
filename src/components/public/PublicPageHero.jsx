// src/components/public/PublicPageHero.jsx
// Server Component: the flat navy page header of the public website pages (About, Our Team,
// Testimonials, Contact Us, In The News, M&A Publications), as in the IMAA design pack (hero C).
export default function PublicPageHero({ title, intro, eyebrow, children }) {
  return (
    <header className="bg-imaa-navy">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-14 md:py-[60px]">
        {eyebrow ? <p className="m-0 mb-3 font-sans text-sm font-semibold uppercase tracking-[.12em] text-white/75">{eyebrow}</p> : null}
        <h1 className="m-0 max-w-3xl break-words font-serif text-4xl font-bold leading-[1.1] tracking-[-0.02em] text-white md:text-5xl">{title}</h1>
        {intro ? <p className="mb-0 mt-5 max-w-2xl whitespace-pre-line text-base leading-relaxed text-white/85 md:text-lg">{intro}</p> : null}
        {children}
      </div>
    </header>
  );
}
