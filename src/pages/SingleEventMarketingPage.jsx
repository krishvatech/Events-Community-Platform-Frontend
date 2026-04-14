import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import speakerImage from "../assets/prof-dr-aswath-damodaran-12b35a4e.png";

const C = {
  deepBlue: "#284D61", midBlue: "#37738D", brightBlue: "#159AC9", lightBlue: "#B9CED7",
  bgBlue1: "#D7E3E8", bgBlue2: "#E6EDF0",
  cool10: "#F0F4F5", cool20: "#D9DFE1", cool30: "#C7CDD0", cool50: "#93A6B0",
  cool60: "#5E7A88", cool80: "#3A4853", cool90: "#292F39", cool100: "#21262E",
  coral: "#F05843", green: "#76B82A", yellow: "#FED746", white: "#FFFFFF",
};
const F = { body: "'Roboto', Arial, sans-serif", display: "'Roboto Slab', Georgia, serif", mono: "'Roboto Mono', monospace" };

// Mobile detection hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

function useInView(ref, th = 0.12) { const [v, sV] = useState(false); useEffect(() => { if (!ref.current) return; const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) sV(true); }, { threshold: th }); o.observe(ref.current); return () => o.disconnect(); }, [ref, th]); return v; }
function FadeIn({ children, delay = 0 }) { const r = useRef(null); const v = useInView(r); return <div ref={r} style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(24px)", transition: `all 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s` }}>{children}</div>; }
function Section({ children, bg = C.white, id, style: s = {} }) { const isMobile = useIsMobile(); return <section id={id} style={{ background: bg, padding: isMobile ? "48px 0" : "80px 0", ...s }}><div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "0 20px" : "0 40px" }}>{children}</div></section>; }


// HERO – Registration above the fold
function Hero({ eventData = {} }) {
  const [ld, sLd] = useState(false);
  const [form, setForm] = useState({ first: "", last: "", email: "" });
  const [done, setDone] = useState(false);
  const valid = form.first && form.last && form.email;
  const isMobile = useIsMobile();
  useEffect(() => { setTimeout(() => sLd(true), 300); }, []);
  const a = (d) => ({ opacity: ld ? 1 : 0, transform: ld ? "translateY(0)" : "translateY(24px)", transition: `all 0.7s cubic-bezier(0.22,1,0.36,1) ${d}s` });
  const Ck = ({ children }) => <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg><span style={{ fontFamily: F.body, fontSize: isMobile ? 13 : 14, color: C.white }}>{children}</span></div>;

  return (
    <section style={{ background: C.deepBlue }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 20px" : "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: ld ? 1 : 0, transition: "opacity 0.7s ease 0.2s", borderBottom: `1px solid ${C.midBlue}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14 }}>
          <div style={{ width: isMobile ? 32 : 36, height: isMobile ? 32 : 36, borderRadius: 4, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: C.white, fontSize: isMobile ? 10 : 12, fontWeight: 800, fontFamily: F.body, letterSpacing: "0.05em" }}>IM</span>
          </div>
          <span style={{ color: C.white, fontSize: isMobile ? 12 : 14, fontWeight: 700, fontFamily: F.body, letterSpacing: "0.08em" }}>IMAA INSTITUTE</span>
        </div>
        {!isMobile && (
          <a href="#" style={{ color: C.lightBlue, fontSize: 13, fontWeight: 500, fontFamily: F.body, textDecoration: "none", padding: "8px 16px", borderRadius: 3, transition: "all 0.3s ease", display: "inline-flex", alignItems: "center", gap: 6 }}
             onMouseEnter={(e) => { e.target.style.color = C.white; e.target.style.backgroundColor = `${C.midBlue}40`; }}
             onMouseLeave={(e) => { e.target.style.color = C.lightBlue; e.target.style.backgroundColor = "transparent"; }}>
            Valuation Training →
          </a>
        )}
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "24px 20px 48px" : "40px 40px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 350px", gap: isMobile ? 24 : 48, alignItems: "start" }}>
          {/* Left: Event info + benefits */}
          <div>
            <div style={{ ...a(0.4), display: "inline-flex", gap: 12, marginBottom: 24 }}>
              {eventData.badges?.map((badge, i) => (
                <span key={i} style={{ padding: "5px 12px", borderRadius: 3, background: `${badge.color}18`, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: badge.color, fontFamily: F.body }}>{badge.label}</span>
              ))}
            </div>
            <h1 style={{ fontFamily: F.display, fontSize: isMobile ? 28 : 42, fontWeight: 700, lineHeight: 1.15, color: C.white, margin: "0 0 6px", ...a(0.5) }}>
              {eventData.title}
            </h1>
            <div style={{ fontFamily: F.display, fontSize: isMobile ? 24 : 42, fontWeight: 700, color: C.coral, margin: "0 0 20px", ...a(0.55) }}>
              {eventData.subtitle}
            </div>
            <p style={{ fontFamily: F.body, fontSize: isMobile ? 14 : 16, lineHeight: 1.7, color: C.lightBlue, margin: "0 0 24px", maxWidth: 480, ...a(0.6) }}>
              {eventData.description}
            </p>

            {/* Event benefits */}
            <div style={{ ...a(0.7), marginBottom: 24 }}>
              {eventData.benefits?.map((benefit, i) => (
                <Ck key={i}>{benefit}</Ck>
              ))}
            </div>

            {/* Time zones */}
            {eventData.timezones && eventData.timezones.length > 0 && (
              <div style={{ ...a(0.8), marginBottom: 24 }}>
                <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.cool50, marginBottom: 10 }}>{eventData.eventDate}</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 8 : 10 }}>
                  {eventData.timezones.map((t, i) => (
                    <div key={i} style={{ padding: isMobile ? "8px 10px" : "6px 12px", background: C.midBlue, borderRadius: 4 }}>
                      <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: C.white, fontFamily: F.display }}>{t.time}</div>
                      <div style={{ fontSize: isMobile ? 9 : 10, color: C.lightBlue, fontFamily: F.body }}>{t.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily: F.body, fontSize: isMobile ? 11 : 12, color: C.lightBlue, marginTop: 10 }}>Can't make it live? <span style={{ color: C.coral, fontWeight: 600 }}>Register anyway – full replay included.</span></div>
              </div>
            )}

            {/* Social proof */}
            <div style={{ ...a(0.9), display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex" }}>
                {[C.midBlue, C.brightBlue, C.coral].map((bg, i) => (
                  <div key={i} style={{ width: 22, height: 22, borderRadius: "50%", background: bg, border: `2px solid ${C.deepBlue}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: C.white, marginLeft: i > 0 ? -6 : 0 }}>A</div>
                ))}
              </div>
              <span style={{ fontFamily: F.body, fontSize: 12, color: C.cool50 }}>{eventData.registeredCount || 247} registered</span>
            </div>
          </div>

          {/* Right: Photo + Form */}
          <div style={{ ...a(0.7) }}>
            {eventData.speaker && (
              <div style={{ borderRadius: 8, background: C.midBlue, padding: "32px 28px", textAlign: "center", marginBottom: 16 }}>
                <div style={{ width: 120, height: 120, borderRadius: "50%", background: C.bgBlue2, border: `4px solid ${C.lightBlue}30`, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <img src={speakerImage} alt={eventData.speaker.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.white, letterSpacing: "0.02em" }}>{eventData.speaker.name}</div>
              </div>
            )}
            <div style={{ background: C.midBlue, borderRadius: 8, padding: isMobile ? "20px 16px" : "28px 26px", boxSizing: "border-box" }}>
              {!done ? (<>
                <div style={{ fontFamily: F.display, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.white, marginBottom: 6 }}>Register free</div>
                <div style={{ fontFamily: F.body, fontSize: isMobile ? 12 : 13, color: C.lightBlue, marginBottom: isMobile ? 14 : 18 }}>Replay will be available.</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 6 : 8, marginBottom: isMobile ? 6 : 8, width: "100%", boxSizing: "border-box" }}>
                  <input
                    value={form.first}
                    onChange={e => setForm(f => ({ ...f, first: e.target.value }))}
                    placeholder="First name"
                    style={{
                      padding: "12px 14px",
                      border: `1.5px solid ${C.cool60}`,
                      borderRadius: 4,
                      fontSize: 13,
                      fontFamily: F.body,
                      background: `${C.white}08`,
                      color: C.white,
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "all 0.3s ease",
                      width: "100%"
                    }}
                    onFocus={(e) => { e.target.style.borderColor = C.lightBlue; e.target.style.background = `${C.white}12`; }}
                    onBlur={(e) => { e.target.style.borderColor = C.cool60; e.target.style.background = `${C.white}08`; }}
                  />
                  <input
                    value={form.last}
                    onChange={e => setForm(f => ({ ...f, last: e.target.value }))}
                    placeholder="Last name"
                    style={{
                      padding: "12px 14px",
                      border: `1.5px solid ${C.cool60}`,
                      borderRadius: 4,
                      fontSize: 13,
                      fontFamily: F.body,
                      background: `${C.white}08`,
                      color: C.white,
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "all 0.3s ease",
                      width: "100%"
                    }}
                    onFocus={(e) => { e.target.style.borderColor = C.lightBlue; e.target.style.background = `${C.white}12`; }}
                    onBlur={(e) => { e.target.style.borderColor = C.cool60; e.target.style.background = `${C.white}08`; }}
                  />
                </div>
                <input
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Email"
                  type="email"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: `1.5px solid ${C.cool60}`,
                    borderRadius: 4,
                    fontSize: 13,
                    fontFamily: F.body,
                    background: `${C.white}08`,
                    color: C.white,
                    outline: "none",
                    boxSizing: "border-box",
                    marginBottom: 16,
                    transition: "all 0.3s ease"
                  }}
                  onFocus={(e) => { e.target.style.borderColor = C.lightBlue; e.target.style.background = `${C.white}12`; }}
                  onBlur={(e) => { e.target.style.borderColor = C.cool60; e.target.style.background = `${C.white}08`; }}
                />
                <button
                  onClick={() => valid && setDone(true)}
                  style={{
                    width: "100%",
                    padding: "13px",
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.white,
                    background: C.coral,
                    border: "none",
                    borderRadius: 4,
                    cursor: valid ? "pointer" : "default",
                    fontFamily: F.body,
                    opacity: valid ? 1 : 0.5,
                    transition: "all 0.3s ease",
                    letterSpacing: "0.03em"
                  }}
                  onMouseEnter={(e) => { if (valid) e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 16px rgba(240, 88, 67, 0.3)"; }}
                  onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "none"; }}
                >
                  Register for Free →
                </button>
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <a href="/login" style={{ fontFamily: F.body, fontSize: 12, color: C.cool50, textDecoration: "none" }}>
                    Already registered? <span style={{ color: C.lightBlue, fontWeight: 500 }}>Log in</span>
                  </a>
                </div>
              </>) : (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: 40, marginBottom: 12, fontWeight: 700 }}>✓</div>
                  <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.white, marginBottom: 8 }}>You're registered!</div>
                  <p style={{ fontFamily: F.body, fontSize: 13, color: C.lightBlue, margin: 0, lineHeight: 1.5 }}>Check your inbox for the confirmation. We'll send a reminder before the session.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


// WHAT HE'LL COVER – Expandable content
function WhatHellCover({ eventData = {} }) {
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();
  return (
    <Section bg={C.white} style={{ padding: isMobile ? "48px 0" : "72px 0" }}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: isMobile ? 24 : 48, alignItems: "start" }}>
        <FadeIn>
          <div>
            <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.brightBlue, marginBottom: 16 }}>In his own words</div>
            <div style={{ fontSize: 56, fontWeight: 700, color: C.coral, fontFamily: "Georgia, serif", lineHeight: 0.8, marginBottom: 16 }}>{"\u201C"}</div>
            <p style={{ fontFamily: F.display, fontSize: 38, lineHeight: 1.25, color: C.deepBlue, margin: "0 0 16px", fontWeight: 700 }}>
              {eventData.coverTitle}
            </p>
            <p style={{ fontFamily: F.body, fontSize: 16, lineHeight: 1.7, color: C.cool60, margin: "0 0 4px" }}>
              {eventData.coverDescription}
            </p>

            {/* Toggle for full text */}
            {eventData.coverFull && (
              <div style={{ marginTop: 16 }}>
                <span onClick={() => setExpanded(!expanded)} style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.brightBlue, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {expanded ? "Read less" : "Read his full description"} <span style={{ transition: "transform 0.3s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", fontSize: 14 }}>▾</span>
                </span>
                <div style={{ maxHeight: expanded ? 400 : 0, overflow: "hidden", transition: "max-height 0.4s ease" }}>
                  <div style={{ paddingTop: 16, borderTop: `1px solid ${C.cool20}`, marginTop: 12 }}>
                    {eventData.coverFull.map((para, i) => (
                      <p key={i} style={{ fontFamily: F.body, fontSize: 15, lineHeight: 1.8, color: C.cool80, margin: "0 0 14px", fontStyle: "italic" }}>
                        {para}
                      </p>
                    ))}
                    <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, color: C.deepBlue }}>– {eventData.speakerName}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div style={{ background: C.cool10, border: `1px solid ${C.cool20}`, borderRadius: 6, padding: "24px 22px" }}>
            <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.deepBlue, marginBottom: 16 }}>Key takeaways</div>
            {(eventData.keyTakeaways || []).map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, color: C.coral, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ fontFamily: F.body, fontSize: 13, color: C.cool80, lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </Section>
  );
}


// EVENT EXPERIENCE – 3 columns
function EventExperience() {
  const isMobile = useIsMobile();
  return (
    <Section bg={C.cool10} style={{ padding: isMobile ? "48px 0" : "64px 0" }}>
      <FadeIn>
        <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.brightBlue, marginBottom: 16 }}>More than a webinar</div>
        <h2 style={{ fontFamily: F.display, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: C.deepBlue, margin: "0 0 8px" }}>It's not just a broadcast. You're part of it.</h2>
        <p style={{ fontFamily: F.body, fontSize: isMobile ? 13 : 14, color: C.cool60, margin: "0 0 32px" }}>Can't make it live? Every registrant gets the full replay.</p>
      </FadeIn>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? 12 : 16 }}>
        {[
          {
            accent: C.coral,
            title: "Live Q&A with Damodaran",
            items: [
              "Submit and vote up questions during the session",
              "Damodaran answers the most relevant ones live",
              "Unanswered questions? He may follow up after the event"
            ]
          },
          {
            accent: C.brightBlue,
            title: "Virtual social lounge",
            items: [
              "Join the lounge before the session – meet your peers",
              "Stay after to continue conversations",
              "Connect with finance professionals from around the world"
            ]
          },
          {
            accent: C.midBlue,
            title: "What you walk away with",
            items: [
              "Replay available to all registrants",
              "Earn CPD/CPE credits",
              "Certificate of attendance"
            ]
          },
        ].map((c, i) => (
          <FadeIn key={i} delay={i * 0.08}>
            <div style={{ background: C.white, border: `1px solid ${C.cool20}`, borderRadius: 4, borderTop: `3px solid ${c.accent}`, padding: "24px 22px", height: "100%", boxSizing: "border-box" }}>
              <h3 style={{ fontFamily: F.display, fontSize: 17, fontWeight: 700, color: C.deepBlue, margin: "0 0 14px" }}>{c.title}</h3>
              {c.items.map((item, j) => (
                <div key={j} style={{ display: "flex", gap: 8, padding: "4px 0", fontFamily: F.body, fontSize: 13, color: C.cool80 }}>
                  <span style={{ color: c.accent, fontWeight: 700, flexShrink: 0 }}>·</span><span>{item}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}


// ABOUT IMAA SECTION
function AboutImaa() {
  const isMobile = useIsMobile();
  return (
    <Section bg={C.white} style={{ padding: isMobile ? "48px 0" : "64px 0" }}>
      <FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 24 : 48, alignItems: "start" }}>
          <div>
            <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.brightBlue, marginBottom: 16 }}>Presented by IMAA</div>
            <h2 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.deepBlue, margin: "0 0 14px", lineHeight: 1.3 }}>The Institute for Mergers, Acquisitions & Alliances</h2>
            <p style={{ fontFamily: F.body, fontSize: 15, lineHeight: 1.7, color: C.cool60, margin: 0 }}>
              IMAA has been working with Prof. Damodaran for a decade – bringing his live valuation programs to finance professionals across the world – online but also in-person. From Vienna to Ho Chi Minh City, Sri Lanka to Sydney, IMAA was the first organisation to bring Damodaran to many countries for the first time.
            </p>
          </div>
          <div>
            <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.cool50, marginBottom: 16 }}>Track record</div>
            {[
              { num: "10", label: "Years working with Prof. Damodaran" },
              { num: "3", label: "Continents – Europe, Asia, Australia" },
              { num: "2", label: "Formats – virtual live and in person" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 16, alignItems: "baseline", marginBottom: 16, paddingBottom: 16, borderBottom: i < 2 ? `1px solid ${C.cool20}` : "none" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.deepBlue, fontFamily: F.display, minWidth: 60 }}>{s.num}</div>
                <div style={{ fontSize: 14, color: C.cool60, fontFamily: F.body, lineHeight: 1.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </Section>
  );
}


// GO DEEPER – Upsell section
function GoDeeper({ eventData = {} }) {
  const isMobile = useIsMobile();
  return (
    <section style={{ background: C.deepBlue, padding: isMobile ? "48px 0" : "72px 0" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "0 20px" : "0 40px" }}>
        <FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 400px", gap: isMobile ? 24 : 48, alignItems: "start" }}>
            <div>
              <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.coral, marginBottom: 16 }}>Want more than 60 minutes?</div>
              <h2 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.white, margin: "0 0 14px", lineHeight: 1.25 }}>12 hours of live valuation training with Damodaran.</h2>
              <p style={{ fontFamily: F.body, fontSize: 15, lineHeight: 1.7, color: C.lightBlue, margin: "0 0 24px" }}>
                If this session resonates, there's a deeper programme. 12 hours. His models, real companies, your questions. Virtual from $990, in person in Vienna and Salzburg from $1,620.
              </p>
              <a href="/events" style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: C.deepBlue, background: C.white, padding: "12px 24px", borderRadius: 3, fontFamily: F.body, textDecoration: "none" }}>View Training & Register →</a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { dates: "Jun 8–11", format: "Virtual Live", price: "From $990", accent: C.coral },
                { dates: "Sep 28–29", format: "In person, Vienna", price: "From $1,620", accent: C.brightBlue },
                { dates: "Sep 30–Oct 1", format: "In person, Salzburg", price: "From $1,620", accent: C.brightBlue },
                { dates: "Nov 16–18 & 20", format: "Virtual Live", price: "From $990", accent: C.coral },
                { dates: "Feb 2027", format: "Virtual Live", price: "From $990", accent: C.coral },
              ].map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.midBlue, borderRadius: 4, borderLeft: `3px solid ${c.accent}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.white, fontFamily: F.display }}>{c.dates}</div>
                    <div style={{ fontSize: 11, color: C.lightBlue, fontFamily: F.body }}>{c.format}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.lightBlue, fontFamily: F.body }}>{c.price}</div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}


// MORE FROM IMAA – Training formats
function MoreFromImaa() {
  const isMobile = useIsMobile();
  return (
    <Section bg={C.cool10} style={{ padding: isMobile ? "48px 0" : "64px 0" }}>
      <FadeIn>
        <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.cool50, marginBottom: 16 }}>More from IMAA</div>
        <h2 style={{ fontFamily: F.display, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.deepBlue, margin: "0 0 32px" }}>M&A training – every format, around the world.</h2>
      </FadeIn>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? 12 : 16 }}>
        {/* Onsite */}
        <FadeIn delay={0.08}>
          <div style={{ background: C.white, border: `1px solid ${C.cool20}`, borderRadius: 4, overflow: "hidden", height: "100%", boxSizing: "border-box" }}>
            <div style={{ height: 140, background: `linear-gradient(135deg, ${C.deepBlue}, ${C.midBlue})`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
                {[40, 60, 80, 50, 70, 45, 65].map((h, i) => (
                  <div key={i} style={{ width: 8, height: h, background: `rgba(255,255,255,${0.1 + i * 0.04})`, borderRadius: "2px 2px 0 0" }} />
                ))}
              </div>
              <div style={{ position: "absolute", bottom: 12, left: 16, fontFamily: F.body, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Replace with city images</div>
            </div>
            <div style={{ padding: "20px 22px" }}>
              <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.coral, marginBottom: 10 }}>In person</div>
              <h3 style={{ fontFamily: F.display, fontSize: 17, fontWeight: 700, color: C.deepBlue, margin: "0 0 12px" }}>Around the globe</h3>
              <p style={{ fontFamily: F.body, fontSize: 13, color: C.cool60, margin: "0 0 16px", lineHeight: 1.55 }}>Intensive programmes in the world's leading financial centres. Small groups, senior faculty, real cases.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {["New York", "London", "Amsterdam", "Riyadh", "Singapore"].map((city, i) => (
                  <span key={i} style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.cool80, background: C.cool10, padding: "4px 10px", borderRadius: 3 }}>{city}</span>
                ))}
              </div>
              <a href="/events" style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.brightBlue, textDecoration: "none" }}>Explore onsite programmes →</a>
            </div>
          </div>
        </FadeIn>

        {/* Virtual Live */}
        <FadeIn delay={0.12}>
          <div style={{ background: C.white, border: `1px solid ${C.cool20}`, borderRadius: 4, overflow: "hidden", height: "100%", boxSizing: "border-box" }}>
            <div style={{ height: 140, background: `linear-gradient(135deg, ${C.midBlue}, ${C.brightBlue})`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <div style={{ width: 64, height: 44, border: "2px solid rgba(255,255,255,0.3)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  {[1,2,3,4].map(i => <div key={i} style={{ width: 16, height: 12, background: "rgba(255,255,255,0.15)", borderRadius: 2 }} />)}
                </div>
              </div>
              <div style={{ position: "absolute", bottom: 12, left: 16, fontFamily: F.body, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Replace with virtual image</div>
            </div>
            <div style={{ padding: "20px 22px" }}>
              <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.brightBlue, marginBottom: 10 }}>Virtual live</div>
              <h3 style={{ fontFamily: F.display, fontSize: 17, fontWeight: 700, color: C.deepBlue, margin: "0 0 12px" }}>Live. Interactive. From anywhere.</h3>
              <p style={{ fontFamily: F.body, fontSize: 13, color: C.cool60, margin: "0 0 16px", lineHeight: 1.55 }}>Multi-session programmes with live instruction, real-time Q&A, and interaction with your cohort. Same depth as onsite – without the travel.</p>
              <a href="/events" style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.brightBlue, textDecoration: "none" }}>Explore virtual programmes →</a>
            </div>
          </div>
        </FadeIn>

        {/* Online */}
        <FadeIn delay={0.16}>
          <div style={{ background: C.white, border: `1px solid ${C.cool20}`, borderRadius: 4, overflow: "hidden", height: "100%", boxSizing: "border-box" }}>
            <div style={{ height: 140, background: `linear-gradient(135deg, ${C.cool80}, ${C.midBlue})`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: "16px solid rgba(255,255,255,0.4)", marginLeft: 4 }} />
              </div>
              <div style={{ position: "absolute", bottom: 12, left: 16, fontFamily: F.body, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Replace with online image</div>
            </div>
            <div style={{ padding: "20px 22px" }}>
              <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.midBlue, marginBottom: 10 }}>Online</div>
              <h3 style={{ fontFamily: F.display, fontSize: 17, fontWeight: 700, color: C.deepBlue, margin: "0 0 12px" }}>Learn at your own pace.</h3>
              <p style={{ fontFamily: F.body, fontSize: 13, color: C.cool60, margin: "0 0 16px", lineHeight: 1.55 }}>Recorded programmes you can start anytime. Video lessons, downloadable materials, and certification – on your schedule.</p>
              <a href="/events" style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.brightBlue, textDecoration: "none" }}>Explore online programmes →</a>
            </div>
          </div>
        </FadeIn>
      </div>
    </Section>
  );
}


// FINAL CTA – Registration again
function FinalCTA({ eventData = {} }) {
  const [form, setForm] = useState({ first: "", last: "", email: "" });
  const [done, setDone] = useState(false);
  const valid = form.first && form.last && form.email;
  const isMobile = useIsMobile();
  return (
    <section style={{ background: C.deepBlue, padding: isMobile ? "48px 0" : "80px 0" }}>
      <div style={{ maxWidth: 580, margin: "0 auto", padding: isMobile ? "0 20px" : "0 40px", textAlign: "center" }}>
        <FadeIn>
          <div style={{ fontFamily: F.display, fontSize: isMobile ? 24 : 34, fontWeight: 700, color: C.white, lineHeight: 1.18, margin: "0 0 6px" }}>{eventData.title}</div>
          <div style={{ fontFamily: F.display, fontSize: isMobile ? 22 : 34, fontWeight: 700, color: C.coral, lineHeight: 1.18, margin: "0 0 12px" }}>{eventData.subtitle}</div>
          <p style={{ fontFamily: F.body, fontSize: isMobile ? 14 : 16, color: C.lightBlue, margin: "0 0 16px" }}>{eventData.eventDate} · Replay available</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            {["Live session", "Live Q&A", "Full replay"].map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontFamily: F.body, fontSize: 13, color: C.white }}>{b}</span>
              </div>
            ))}
          </div>
          {!done ? (<>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 6, maxWidth: 440, margin: "0 auto 6px" }}>
              <input value={form.first} onChange={e => setForm(f => ({ ...f, first: e.target.value }))} placeholder="First name" style={{ padding: "11px 14px", border: `1.5px solid ${C.cool60}`, borderRadius: 4, fontSize: 13, fontFamily: F.body, background: "transparent", color: C.white, outline: "none" }} />
              <input value={form.last} onChange={e => setForm(f => ({ ...f, last: e.target.value }))} placeholder="Last name" style={{ padding: "11px 14px", border: `1.5px solid ${C.cool60}`, borderRadius: 4, fontSize: 13, fontFamily: F.body, background: "transparent", color: C.white, outline: "none" }} />
            </div>
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 6, maxWidth: 440, margin: "0 auto 12px" }}>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" type="email" style={{ flex: 1, padding: "11px 14px", border: `1.5px solid ${C.cool60}`, borderRadius: 4, fontSize: 13, fontFamily: F.body, background: "transparent", color: C.white, outline: "none" }} />
              <button onClick={() => valid && setDone(true)} style={{ padding: "11px 24px", fontSize: 14, fontWeight: 700, color: C.white, background: C.coral, border: "none", borderRadius: 4, cursor: valid ? "pointer" : "default", fontFamily: F.body, whiteSpace: "nowrap", opacity: valid ? 1 : 0.6 }}>Register →</button>
            </div>
            <div><a href="/login" style={{ fontFamily: F.body, fontSize: 11, color: C.cool50, textDecoration: "none" }}>Already registered? <span style={{ color: C.lightBlue }}>Log in</span></a></div>
          </>) : (
            <div>
              <div style={{ fontSize: 20, marginBottom: 8 }}>✓</div>
              <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.white }}>You're registered!</div>
              <p style={{ fontFamily: F.body, fontSize: 13, color: C.lightBlue, margin: "8px 0 0" }}>Check your inbox for the confirmation.</p>
            </div>
          )}
        </FadeIn>
      </div>
    </section>
  );
}


// FOOTER
function Footer() {
  return (
    <footer style={{ background: C.cool100, padding: "32px 0" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: F.body, fontSize: 12, color: C.cool50 }}>© 2026 Events Community Platform</span>
        <div style={{ display: "flex", gap: 24 }}>
          {["Terms & Conditions", "Privacy Policy", "Contact"].map(t => <a key={t} href="#" style={{ fontFamily: F.body, fontSize: 12, color: C.cool50, textDecoration: "none" }}>{t}</a>)}
        </div>
      </div>
    </footer>
  );
}


// MAIN COMPONENT
export default function SingleEventMarketingPage() {
  const { slug } = useParams();
  const [eventData, setEventData] = useState(null);

  useEffect(() => {
    // Load Google Fonts
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;0,900;1,400&family=Roboto+Mono:wght@300;400;500;600&family=Roboto+Slab:wght@300;400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    // Example event data - replace with actual API call
    const exampleEventData = {
      title: "Investing in the Age of AI",
      subtitle: "Damodaran. Live. Free.",
      description: "AI may challenge some of the core functions of investment banking, PE, and consulting. Damodaran shares what he's learned first-hand – including from bots built around his own material.",
      badges: [
        { label: "Free Live Event", color: C.coral },
        { label: "Online · June 1, 2026", color: C.brightBlue },
      ],
      eventDate: "June 1, 2026",
      timezones: [
        { time: "7:00 AM", label: "San Francisco" },
        { time: "10:00 AM", label: "New York" },
        { time: "3:00 PM", label: "London" },
        { time: "4:00 PM", label: "Zurich" },
        { time: "5:00 PM", label: "Riyadh" },
        { time: "10:00 PM", label: "Singapore" },
      ],
      speaker: {
        name: "Prof. Aswath Damodaran",
        avatar: "🎤",
      },
      registeredCount: 247,
      benefits: [
        "Live session with Prof. Damodaran",
        "Live Q&A – submit and vote up questions",
        "Can't make it live? Full replay available.",
      ],
      coverTitle: "What to do to stay ahead.",
      coverDescription: "AI is challenging some of the core mechanics of finance. Prof. Damodaran has seen it first-hand, with bots built around his own material. In this session, he'll share what that means for you – and what to do about it.",
      coverFull: [
        "In this session, I will talk about the threat that AI poses to much of the bread-and-butter mechanics of finance, whether it be in investment banking, private equity, or consulting. I will use my experiences in dealing with bots that have been built specifically around my material, starting with bots that I have approved and given access to, and moving on to darker versions that are designed for scams.",
        "I will generalize the discussion by talking about what AI will be able to do well (thus displacing humans) and what we will need to do to stay ahead of that threat, again speaking from a personal standpoint. During the process, we will talk about corporate finance and valuation.",
      ],
      speakerName: "Prof. Aswath Damodaran",
      keyTakeaways: [
        "How AI challenges valuation – or not",
        "Bots – approved and unauthorized",
        "What AI will displace – and what it can't (yet)",
        "Corporate finance and valuation in an AI world",
        "How to stay ahead",
      ],
      aboutTitle: "About This Event",
      aboutDescription: "This event brings together finance professionals to discuss the impact of AI on investment strategies and financial practices.",
      stats: [
        { num: "60", label: "Minutes of live content" },
        { num: "3", label: "Continents represented" },
        { num: "24/7", label: "Replay access" },
      ],
    };

    setEventData(exampleEventData);

    // TODO: Uncomment to fetch real data from API
    // const fetchEventData = async () => {
    //   try {
    //     const response = await fetch(`/api/events/${slug}/`);
    //     const data = await response.json();
    //     setEventData(data);
    //   } catch (error) {
    //     console.error('Failed to fetch event data:', error);
    //   }
    // };
    // fetchEventData();
  }, [slug]);

  if (!eventData) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: F.body, color: C.deepBlue }}>
        Loading event...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: F.body, WebkitFontSmoothing: "antialiased" }}>
      <Hero eventData={eventData} />
      <WhatHellCover eventData={eventData} />
      <EventExperience />
      <AboutImaa />
      <GoDeeper eventData={eventData} />
      <MoreFromImaa />
      <FinalCTA eventData={eventData} />
      <Footer />
    </div>
  );
}
