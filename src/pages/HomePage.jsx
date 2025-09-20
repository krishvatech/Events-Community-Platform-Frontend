// src/pages/HomePage.jsx
import React, { useEffect, useRef, useState } from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { FaPlay } from "react-icons/fa";
import {
  FaCalendarAlt,
  FaComments,
  FaHandshake,
  FaRegNewspaper,
  FaAddressBook,
  FaChartLine,
} from "react-icons/fa";

/* ===== CountUp: 0 -> target (StrictMode safe) ===== */
const CountUp = ({ to = 0, duration = 1200 }) => {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let rafId;
    const start = performance.now();

    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round(p * to));
      if (p < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId); // StrictMode runs effect twice => safe
  }, [to, duration]);

  return <>{new Intl.NumberFormat().format(val)}</>;
};

/* ===== Stat uses CountUp ===== */
const Stat = ({ value, label, suffix = "" }) => (
  <div className="text-center">
    <div className="text-4xl md:text-5xl font-semibold text-gray-800">
      <CountUp to={value} />
      {suffix}
    </div>
    <div className="text-base md:text-lg text-gray-500">{label}</div>
  </div>
);


// Feature card (color comes from parent)
const Feature = ({ Icon, title, desc, color = "text-indigo-600" }) => (
  <div className="bg-white border rounded-2xl p-7 shadow-sm">
    <Icon className={`${color} text-3xl`} />
    <h4 className="mt-4 text-lg md:text-xl font-semibold text-gray-900">{title}</h4>
    <p className="mt-2 text-base text-gray-600">{desc}</p>
    <a href="#" className="mt-4 inline-block text-base font-medium text-indigo-600 hover:text-indigo-700">
      Learn more →
    </a>
  </div>
);




/* ===== Highlight stacked item ===== */
const HighlightItem = ({ Icon, color, title, subtitle }) => (
  <div className="flex items-start gap-3">
    <Icon className={`${color} text-2xl shrink-0`} />
    <div>
      <div className="text-lg md:text-xl font-semibold text-gray-900 leading-snug">
        {title}
      </div>
      {subtitle && (
        <div className="text-sm md:text-base text-gray-500">{subtitle}</div>
      )}
    </div>
  </div>
);

const HomePage = () => {
  return (
    <>
      <Header />

      {/* HERO */}
      <section id="hero" className="bg-white scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
            Build Your Professional{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-500 to-orange-400 bg-clip-text text-transparent">
              Community
            </span>
          </h1>
          <p className="mt-5 text-xl md:text-2xl text-gray-600 max-w-3xl">
            Connect, learn, and grow with IMAA’s comprehensive platform for events,
            mentoring, and professional development.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#cta"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 text-base md:text-lg font-semibold"
            >
              Get Started Free
            </a>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-gray-300 hover:bg-gray-50 text-base md:text-lg"
            >
              <span>Watch Demo</span>
              <FaPlay className="text-sm" />
            </a>
          </div>

          {/* Stats row */}
          <div className="mt-12 grid grid-cols-3 gap-8 max-w-2xl">
            <Stat value={2500} suffix="+" label="Active Members" />
            <Stat value={150} suffix="+" label="Events Hosted" />
            <Stat value={95} suffix="%" label="Satisfaction Rate" />
          </div>

          {/* Highlight card */}
          <div className="mt-10 rounded-3xl bg-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] border p-6 md:p-7">
            <div className="space-y-6">
              <HighlightItem
                Icon={FaCalendarAlt}
                color="text-indigo-600"
                title="Upcoming: Tech Leadership Summit"
                subtitle="245 registered"
              />
              <HighlightItem
                Icon={FaComments}
                color="text-orange-500"
                title="Active Discussions: 89"
                subtitle="Join the conversation"
              />
              <HighlightItem
                Icon={FaHandshake}
                color="text-indigo-600"
                title="156 Mentoring Pairs"
                subtitle="Growing together"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-slate-50 py-14 lg:py-20 scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 text-center">
            Everything You Need in One Platform
            </h2>
            <p className="mt-4 text-lg md:text-xl text-gray-600 max-w-3xl mx-auto text-center">
            Streamline your professional community with our comprehensive suite of tools
            designed for modern networking and learning.
            </p>

            {/** define once, then map */}
            {(() => {
            const FEATURES = [
                { Icon: FaCalendarAlt,   title: "Event Management",   desc: "Create and host virtual or in-person events with powerful tools." },
                { Icon: FaComments,      title: "Community Forums",   desc: "Foster discussions with organized forums, categories, and posts." },
                { Icon: FaHandshake,     title: "Mentoring System",   desc: "Match mentors and mentees with structured program management." },
                { Icon: FaRegNewspaper,  title: "Content Publishing", desc: "Share knowledge through an integrated blog & article system." },
                { Icon: FaAddressBook,   title: "Member Directory",   desc: "Discover and connect with advanced search & filtering." },
                { Icon: FaChartLine,     title: "Analytics Dashboard",desc: "Track engagement and growth with actionable insights." },
            ];
            return (
                <div id="events" className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f, i) => (
                    <Feature
                    key={f.title}
                    Icon={f.Icon}
                    title={f.title}
                    desc={f.desc}
                    color={i % 2 === 0 ? "text-indigo-600" : "text-orange-500"}
                    />
                ))}
                </div>
            );
            })()}
        </div>
        </section>

      {/* CTA */}
      <section id="cta" className="py-14 lg:py-20 scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl p-10 md:p-12 text-white bg-gradient-to-r from-indigo-600 via-purple-500 to-orange-400 text-center">
            <h3 className="text-4xl md:text-5xl font-bold">Ready to Build Your Professional Community?</h3>
            <p className="mt-3 text-lg md:text-xl text-white/90 max-w-3xl mx-auto">
              Join thousands of professionals who are already growing their networks,
              sharing knowledge, and advancing their careers with IMAA Platform.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-4">
              <a href="#" className="inline-flex items-center px-6 py-3.5 rounded-2xl bg-white text-blue-700 hover:bg-gray-100 text-base md:text-lg font-semibold">
                Start Free Trial
              </a>
              <a id="demo" href="#" className="inline-flex items-center px-6 py-3.5 rounded-2xl bg-white/10 ring-1 ring-white/30 hover:bg-white/20 text-base md:text-lg font-semibold">
                Schedule Demo
              </a>
            </div>
            {/* Benefits row (perfectly centered as a group) */}
            <div className="mt-8 w-fit mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-white/90">
            {["No setup fees", "Cancel anytime", "24/7 support"].map((text) => (
                <div key={text} className="flex items-center gap-3">
                <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8 12l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-lg md:text-xl whitespace-nowrap">{text}</span>
                </div>
            ))}
            </div>
          </div>
        </div>
      </section>

      {/* anchors for header */}
      <div id="community" className="scroll-mt-24" />
      <div id="mentoring" className="scroll-mt-24" />
      <div id="blog" className="scroll-mt-24" />
      <div id="members" className="scroll-mt-24" />

      <Footer />
    </>
  );
};

export default HomePage;
