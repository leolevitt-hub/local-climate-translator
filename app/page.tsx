"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

// -------------------- Types --------------------
type UserProfile = {
  zip: string;
  state: string;
  housing_status: string;
  property_type: string;
  can_make_upgrades: string;
  utility_fuels: string;
  has_car: string;
  next_vehicle_timeline: string;
  job_sector: string;
  household_income: string;
  household_size: string;
  commute_distance: string;
  home_age: string;
  current_heating: string;
  interested_in_solar: string;
  own_business: string;
};

type Bill = {
  id: string;
  identifier: string;
  title: string;
  summary: string;
  personalScore: number;
  personalLabel: string;
  personalDirection: string;
  personalReasons: string[];
  climateScore: number;
  climateLabel: string;
  climateDirection: string;
  climateReasons: string[];
  jurisdictionCode?: string;
  jurisdictionName: string;
  status: string;
  dateIntroduced: string | null;
  tags: string[];
  sources?: Array<{ url: string; name: string | null }>;
};

type ComprehensiveAnalysis = {
  overview: {
    plain_english_summary: string;
    what_this_means_for_you: string;
    key_provisions: string[];
    timeline_and_status: {
      current_status: string;
      when_it_takes_effect: string;
      key_deadlines: string[];
      what_needs_to_happen_next: string;
    };
  };
  your_specific_situation?: {
    relevance_to_you: string;
    provisions_that_apply_to_you: string[];
    provisions_that_dont_apply: string[];
    your_best_opportunities: string[];
    your_biggest_barriers: string[];
  };
  personalized_financial_analysis: {
    direct_benefits: string[];
    eligibility_factors: string[];
    estimated_value: string;
    access_pathway: string[];
    barriers: string[];
  };
  financial_impact_for_you?: {
    bottom_line: string;
    breakdown_by_provision?: string[];
  };
  personalized_climate_analysis: {
    environmental_benefits: string[];
    local_impact: string[];
    personal_contribution: string[];
    scale_and_scope: string;
  };
  environmental_impact_explained?: { state_and_regional_context?: string[] };
  detailed_bill_provisions?: {
    provision_by_provision_analysis: string[];
    which_parts_matter_most_to_you: string[];
    implementation_mechanisms: string[];
    funding_sources: string[];
  };
  detailed_requirements: {
    who_qualifies: string[];
    documentation_needed: string[];
    income_limits: string;
    other_restrictions: string[];
  };
  eligibility_and_requirements?: {
    your_eligibility_assessment?: string[];
    special_considerations?: string[];
  };
  certainties_and_uncertainties: {
    what_is_certain: string[];
    what_depends_on_implementation: string[];
    missing_information: string[];
    risks_and_caveats: string[];
  };
  what_we_know_and_dont_know?: { what_to_watch_for?: string[] };
  action_plan: {
    immediate_steps: string[];
    medium_term_steps: string[];
    long_term_considerations: string[];
    questions_to_ask: string[];
  };
  your_action_plan?: { decision_framework?: string[] };
  local_context: {
    local_programs: string[];
    local_considerations: string[];
    community_resources: string[];
  };
  local_and_regional_impact?: {
    cities_and_regions_affected: string[];
    your_area_specifically: string[];
    urban_vs_rural: string;
    local_economic_impact: string[];
    community_benefits: string[];
  };
  common_questions_answered: {
    is_this_a_tax_increase: string;
    do_i_have_to_do_anything: string;
    what_if_i_rent: string;
    what_if_im_low_income: string;
    what_if_i_own_a_business?: string;
    how_long_does_this_take: string;
    is_the_paperwork_complicated: string;
    what_about_maintenance?: string;
    can_i_combine_with_other_programs?: string;
    other_important_questions: string[];
  };
};

const STATE_NAMES: Record<string, string> = {
  CT: "Connecticut",
  CA: "California",
};

// -------------------- Utilities --------------------
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatStatus(s: string) {
  return (s || "").trim().toUpperCase();
}

function describePersonalFinancial(score: number) {
  if (score <= 0.1) return "No financial benefit";
  if (score < 3) return "Low financial benefit";
  if (score < 6) return "Moderate financial benefit";
  if (score < 8) return "Strong financial benefit";
  return "Very strong financial benefit";
}

function describeClimate(score: number, direction: string) {
  if (direction === "neutral") return "Climate neutral";
  const intensity = score < 3 ? "Low" : score < 6 ? "Moderate" : score < 8 ? "Strong" : "Very strong";
  return direction === "negative" ? `${intensity} climate harm` : `${intensity} climate benefit`;
}

function timeAgoIso(iso: string | null) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const now = Date.now();
  const d = Math.max(0, now - t);
  const days = Math.floor(d / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

// -------------------- Hooks --------------------
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(!!mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

function useMouseTilt(strength = 14) {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  useEffect(() => {
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setParallax({ x: nx * strength, y: ny * (strength * 0.75) }));
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, [strength]);
  return parallax;
}

function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrollTop = h.scrollTop || document.body.scrollTop || 0;
      const max = (h.scrollHeight || 1) - h.clientHeight;
      setP(max > 0 ? clamp((scrollTop / max) * 100, 0, 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return p;
}

// -------------------- Background Art System --------------------
function NoiseOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='.6'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/50" />
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 140px rgba(0,0,0,0.75)" }} />
    </div>
  );
}

function ContourLines({ parallaxX, parallaxY }: { parallaxX: number; parallaxY: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.04]">
      <div
        className="absolute inset-0"
        style={{
          transform: `translate3d(${parallaxX * 0.2}px, ${parallaxY * 0.2}px, 0)`,
          transition: "transform 120ms ease-out",
          backgroundImage:
            "repeating-radial-gradient(circle at 20% 25%, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 1px, transparent 1px, transparent 12px)," +
            "repeating-radial-gradient(circle at 82% 70%, rgba(16,185,129,0.18) 0px, rgba(16,185,129,0.18) 1px, transparent 1px, transparent 14px)",
          filter: "blur(0.3px)",
          maskImage: "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
        }}
      />
    </div>
  );
}

function AmbientOrbs({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[720px] h-[720px] orb orb-a blur-3xl rounded-full" />
      <div className="absolute top-12 right-[-220px] w-[680px] h-[680px] orb orb-b blur-3xl rounded-full" />
      <div className="absolute -bottom-56 left-[20%] w-[780px] h-[780px] orb orb-c blur-3xl rounded-full" />
      <div className="absolute bottom-24 right-[10%] w-[420px] h-[420px] orb orb-d blur-3xl rounded-full opacity-60" />
      <div className="absolute top-[40%] left-[50%] w-[550px] h-[550px] orb orb-e blur-3xl rounded-full opacity-40" />
      <style jsx>{`
        .orb-a {
          background: radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.12), transparent 60%);
        }
        .orb-b {
          background: radial-gradient(circle at 35% 35%, rgba(20, 184, 166, 0.10), transparent 62%);
        }
        .orb-c {
          background: radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.08), transparent 62%);
        }
        .orb-d {
          background: radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.06), transparent 62%);
        }
        .orb-e {
          background: radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.05), transparent 62%);
        }
        ${!reducedMotion
          ? `
        .orb { animation: floaty 18s ease-in-out infinite; }
        .orb-b { animation-duration: 22s; animation-direction: reverse; }
        .orb-c { animation-duration: 26s; }
        .orb-d { animation-duration: 16s; animation-direction: reverse; }
        .orb-e { animation-duration: 20s; }
        @keyframes floaty {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(0,-32px,0) scale(1.03); }
        }`
          : ""}
      `}</style>
    </div>
  );
}

function StarDust({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.08]">
      <div className={`absolute inset-0 stardust ${reducedMotion ? "" : "stardust-anim"}`} />
      <style jsx>{`
        .stardust {
          background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px),
            radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            radial-gradient(rgba(16, 185, 129, 0.10) 1px, transparent 1px),
            radial-gradient(rgba(20, 184, 166, 0.06) 1px, transparent 1px);
          background-size: 160px 160px, 240px 240px, 320px 320px, 400px 400px;
          background-position: 0 0, 60px 90px, 120px 60px, 180px 120px;
          filter: blur(0.25px);
          mask-image: radial-gradient(circle at 50% 30%, black 0%, black 55%, transparent 80%);
        }
        .stardust-anim {
          animation: drift 42s linear infinite;
        }
        @keyframes drift {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-180px, 120px, 0); }
        }
      `}</style>
    </div>
  );
}

function TechGrid({ parallaxX, parallaxY }: { parallaxX: number; parallaxY: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(16,185,129,0.20) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.20) 1px, transparent 1px)",
          backgroundSize: "76px 76px",
          transform: `translate3d(${parallaxX * 0.12}px, ${parallaxY * 0.12}px, 0)`,
          transition: "transform 120ms ease-out",
          maskImage: "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
        }}
      />
    </div>
  );
}

function MicroDiagonal() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.02]">
      <div className="absolute inset-0 micro-diagonal" />
      <style jsx>{`
        .micro-diagonal {
          background-image: repeating-linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.18) 0px,
            rgba(255, 255, 255, 0.18) 1px,
            transparent 1px,
            transparent 10px
          );
          mix-blend-mode: overlay;
          mask-image: radial-gradient(circle at 50% 25%, black 0%, black 55%, transparent 78%);
        }
      `}</style>
    </div>
  );
}

function HexagonPattern({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]">
      <div className={`absolute inset-0 hexagon-pattern ${reducedMotion ? "" : "hexagon-anim"}`} />
      <style jsx>{`
        .hexagon-pattern {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.3'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          background-size: 56px 98px;
        }
        .hexagon-anim {
          animation: hexdrift 60s linear infinite;
        }
        @keyframes hexdrift {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(56px, 98px, 0); }
        }
      `}</style>
    </div>
  );
}

function WaveLines({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.035]">
      <svg className="absolute w-full h-full" preserveAspectRatio="none" viewBox="0 0 1440 800">
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path className={reducedMotion ? "" : "wave-path-1"} d="M0,200 C320,100 420,300 720,200 C1020,100 1120,300 1440,200 L1440,800 L0,800 Z" fill="url(#waveGrad1)" opacity="0.3" />
        <path className={reducedMotion ? "" : "wave-path-2"} d="M0,400 C320,300 420,500 720,400 C1020,300 1120,500 1440,400 L1440,800 L0,800 Z" fill="url(#waveGrad1)" opacity="0.2" />
        <path className={reducedMotion ? "" : "wave-path-3"} d="M0,600 C320,500 420,700 720,600 C1020,500 1120,700 1440,600 L1440,800 L0,800 Z" fill="url(#waveGrad1)" opacity="0.15" />
      </svg>
      <style jsx>{`
        .wave-path-1 { animation: waveMove 20s ease-in-out infinite; }
        .wave-path-2 { animation: waveMove 25s ease-in-out infinite reverse; }
        .wave-path-3 { animation: waveMove 30s ease-in-out infinite; }
        @keyframes waveMove {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-50px); }
        }
      `}</style>
    </div>
  );
}

function MeshGradient({ parallaxX, parallaxY, reducedMotion }: { parallaxX: number; parallaxY: number; reducedMotion: boolean }) {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(1200px 720px at 10% 10%, rgba(16,185,129,0.12), transparent 55%)," +
            "radial-gradient(900px 640px at 80% 18%, rgba(20,184,166,0.10), transparent 60%)," +
            "radial-gradient(1100px 760px at 62% 92%, rgba(34,211,238,0.08), transparent 55%)," +
            "radial-gradient(980px 640px at 20% 85%, rgba(59,130,246,0.06), transparent 62%)," +
            "radial-gradient(800px 500px at 50% 50%, rgba(139,92,246,0.04), transparent 58%)," +
            "linear-gradient(to bottom, rgba(0,0,0,0.0), rgba(0,0,0,0.45))",
          transform: `translate3d(${parallaxX * 0.55}px, ${parallaxY * 0.55}px, 0)`,
          transition: "transform 120ms ease-out",
        }}
      />
      <div className={`absolute -top-44 left-1/2 -translate-x-1/2 w-[1300px] h-[560px] blur-3xl rounded-full ribbon-1 ${reducedMotion ? "" : "ribbon-anim-1"}`} style={{ transform: `translate3d(calc(-50% + ${parallaxX * 0.85}px), ${parallaxY * 0.7}px, 0)` }} />
      <div className={`absolute top-20 left-[6%] w-[960px] h-[460px] blur-3xl rounded-full ribbon-2 ${reducedMotion ? "" : "ribbon-anim-2"}`} style={{ transform: `translate3d(${parallaxX * 0.65}px, ${parallaxY * 0.6}px, 0)` }} />
      <div className={`absolute -bottom-56 right-[2%] w-[1200px] h-[560px] blur-3xl rounded-full ribbon-3 ${reducedMotion ? "" : "ribbon-anim-3"}`} style={{ transform: `translate3d(${parallaxX * 0.5}px, ${parallaxY * 0.8}px, 0)` }} />
      <div className={`absolute top-[60%] left-[30%] w-[700px] h-[400px] blur-3xl rounded-full ribbon-4 ${reducedMotion ? "" : "ribbon-anim-4"}`} style={{ transform: `translate3d(${parallaxX * 0.4}px, ${parallaxY * 0.5}px, 0)` }} />
      <div className="absolute inset-0 opacity-[0.05]">
        <div className={`absolute top-20 left-[16%] w-96 h-96 border-2 border-emerald-400/40 rounded-3xl rotate-45 ${reducedMotion ? "" : "geom-float-a"}`} />
        <div className={`absolute bottom-14 right-[16%] w-72 h-72 border-2 border-teal-400/40 rounded-2xl -rotate-12 ${reducedMotion ? "" : "geom-float-b"}`} />
        <div className={`absolute top-[24%] right-[8%] w-52 h-52 border-2 border-cyan-400/40 rounded-2xl rotate-[18deg] ${reducedMotion ? "" : "geom-float-c"}`} />
        <div className={`absolute top-[58%] left-[8%] w-44 h-44 border border-white/15 rounded-full ${reducedMotion ? "" : "geom-float-d"}`} />
        <div className={`absolute top-[35%] right-[25%] w-32 h-32 border border-emerald-300/20 rounded-xl rotate-[30deg] ${reducedMotion ? "" : "geom-float-e"}`} />
        <div className={`absolute bottom-[30%] left-[35%] w-24 h-24 border-2 border-teal-300/15 rounded-full ${reducedMotion ? "" : "geom-float-f"}`} />
      </div>
      <style jsx>{`
        .ribbon-1 { background: conic-gradient(from 180deg at 50% 50%, rgba(16, 185, 129, 0.0), rgba(16, 185, 129, 0.14), rgba(20, 184, 166, 0.10), rgba(34, 211, 238, 0.06), rgba(16, 185, 129, 0.0)); }
        .ribbon-2 { background: conic-gradient(from 220deg at 50% 50%, rgba(20, 184, 166, 0.0), rgba(20, 184, 166, 0.10), rgba(34, 211, 238, 0.08), rgba(59, 130, 246, 0.05), rgba(20, 184, 166, 0.0)); }
        .ribbon-3 { background: conic-gradient(from 140deg at 50% 50%, rgba(34, 211, 238, 0.0), rgba(34, 211, 238, 0.08), rgba(16, 185, 129, 0.10), rgba(20, 184, 166, 0.07), rgba(34, 211, 238, 0.0)); }
        .ribbon-4 { background: conic-gradient(from 90deg at 50% 50%, rgba(139, 92, 246, 0.0), rgba(139, 92, 246, 0.05), rgba(59, 130, 246, 0.06), rgba(34, 211, 238, 0.04), rgba(139, 92, 246, 0.0)); }
        .ribbon-anim-1 { animation: auroraFloat 18s ease-in-out infinite; }
        .ribbon-anim-2 { animation: auroraFloat 22s ease-in-out infinite reverse; }
        .ribbon-anim-3 { animation: auroraFloat 26s ease-in-out infinite; }
        .ribbon-anim-4 { animation: auroraFloat 30s ease-in-out infinite reverse; }
        @keyframes auroraFloat {
          0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
          50% { transform: translateX(8px) translateY(-22px) rotate(12deg); }
        }
        .geom-float-a { animation: geomFloat 22s ease-in-out infinite; }
        .geom-float-b { animation: geomFloat 26s ease-in-out infinite reverse; }
        .geom-float-c { animation: geomFloat 18s ease-in-out infinite; }
        .geom-float-d { animation: geomFloat 20s ease-in-out infinite reverse; }
        .geom-float-e { animation: geomFloat 24s ease-in-out infinite; }
        .geom-float-f { animation: geomFloat 28s ease-in-out infinite reverse; }
        @keyframes geomFloat {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-26px) translateX(14px); }
        }
      `}</style>
    </div>
  );
}

function CursorSpotlight({ x, y }: { x: number; y: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div className="absolute inset-0 opacity-[0.45]" style={{ background: `radial-gradient(560px 420px at ${x}px ${y}px, rgba(16,185,129,0.08), transparent 70%), radial-gradient(720px 520px at ${x}px ${y}px, rgba(34,211,238,0.05), transparent 75%)` }} />
    </div>
  );
}

function GlowingOrbs({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className={`absolute top-[10%] left-[5%] w-3 h-3 bg-emerald-400/20 rounded-full blur-sm ${reducedMotion ? "" : "glow-pulse-a"}`} />
      <div className={`absolute top-[25%] right-[12%] w-2 h-2 bg-teal-400/20 rounded-full blur-sm ${reducedMotion ? "" : "glow-pulse-b"}`} />
      <div className={`absolute top-[65%] left-[18%] w-1.5 h-1.5 bg-cyan-400/20 rounded-full blur-sm ${reducedMotion ? "" : "glow-pulse-c"}`} />
      <div className={`absolute top-[45%] right-[25%] w-2 h-2 bg-emerald-300/20 rounded-full blur-sm ${reducedMotion ? "" : "glow-pulse-d"}`} />
      <div className={`absolute bottom-[20%] left-[40%] w-1.5 h-1.5 bg-teal-300/20 rounded-full blur-sm ${reducedMotion ? "" : "glow-pulse-e"}`} />
      <div className={`absolute top-[80%] right-[8%] w-3 h-3 bg-cyan-300/20 rounded-full blur-sm ${reducedMotion ? "" : "glow-pulse-f"}`} />
      <style jsx>{`
        .glow-pulse-a { animation: glowPulse 4s ease-in-out infinite; }
        .glow-pulse-b { animation: glowPulse 5s ease-in-out infinite; animation-delay: 0.5s; }
        .glow-pulse-c { animation: glowPulse 6s ease-in-out infinite; animation-delay: 1s; }
        .glow-pulse-d { animation: glowPulse 4.5s ease-in-out infinite; animation-delay: 1.5s; }
        .glow-pulse-e { animation: glowPulse 5.5s ease-in-out infinite; animation-delay: 2s; }
        .glow-pulse-f { animation: glowPulse 4s ease-in-out infinite; animation-delay: 2.5s; }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

// -------------------- ENHANCED LOADING SPINNERS --------------------

// Main form submission loader
function PolicyAnalysisLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8">
      <div className="relative w-32 h-32">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 rounded-full border-4 border-zinc-800/50" />
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 128 128">
          <defs>
            <linearGradient id="loaderGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <circle cx="64" cy="64" r="56" fill="none" stroke="url(#loaderGradient1)" strokeWidth="8" strokeLinecap="round" strokeDasharray="260 100" className="animate-[spin_2s_linear_infinite]" style={{ transformOrigin: 'center' }} />
        </svg>
        
        {/* Middle counter-rotating ring */}
        <svg className="absolute inset-3 w-[calc(100%-24px)] h-[calc(100%-24px)] rotate-90" viewBox="0 0 104 104">
          <defs>
            <linearGradient id="loaderGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <circle cx="52" cy="52" r="44" fill="none" stroke="url(#loaderGradient2)" strokeWidth="6" strokeLinecap="round" strokeDasharray="180 100" className="animate-[spin_3s_linear_infinite_reverse]" style={{ transformOrigin: 'center' }} />
        </svg>
        
        {/* Inner pulsing core */}
        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-cyan-500/20 animate-pulse" />
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <svg className="w-10 h-10 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
            </svg>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
          </div>
        </div>
        
        {/* Orbiting particles */}
        <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50" />
        </div>
        <div className="absolute inset-0 animate-[spin_4s_linear_infinite]" style={{ animationDelay: '-1.33s' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-teal-400 rounded-full shadow-lg shadow-teal-400/50" />
        </div>
        <div className="absolute inset-0 animate-[spin_4s_linear_infinite]" style={{ animationDelay: '-2.66s' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50" />
        </div>
      </div>
      
      <div className="text-center space-y-2">
        <div className="text-xl font-black text-white tracking-wide">Analyzing Climate Policies</div>
        <div className="text-sm text-zinc-400 font-medium">Finding personalized matches for your profile...(may take 2-4 minutes)</div>
      </div>
      
      {/* Animated dots */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// Bill detail analysis loader
function BillAnalysisLoader({ billTitle }: { billTitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12 min-h-[400px]">
      {/* Document with scanning effect */}
      <div className="relative">
        {/* Glow backdrop */}
        <div className="absolute -inset-8 bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-cyan-500/20 rounded-3xl blur-2xl animate-pulse" />
        
        {/* Document container */}
        <div className="relative w-28 h-36 bg-zinc-900/90 border-2 border-zinc-700/80 rounded-xl overflow-hidden shadow-2xl">
          {/* Document header bar */}
          <div className="h-7 bg-gradient-to-r from-emerald-500/40 via-teal-500/30 to-cyan-500/40 border-b border-zinc-700/50 flex items-center px-2 gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
            <div className="w-2 h-2 rounded-full bg-teal-400/60" />
            <div className="w-2 h-2 rounded-full bg-cyan-400/60" />
          </div>
          
          {/* Scanning line effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 right-0 h-12 bg-gradient-to-b from-transparent via-emerald-400/25 to-transparent animate-[scanDown_2s_ease-in-out_infinite]" />
          </div>
          
          {/* Document content lines */}
          <div className="p-3 space-y-2">
            <div className="h-2 bg-zinc-700/60 rounded-full w-full animate-pulse" />
            <div className="h-2 bg-zinc-700/60 rounded-full w-4/5 animate-pulse" style={{ animationDelay: '100ms' }} />
            <div className="h-2 bg-zinc-700/60 rounded-full w-full animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="h-2 bg-zinc-700/60 rounded-full w-3/5 animate-pulse" style={{ animationDelay: '300ms' }} />
            <div className="h-2 bg-zinc-700/60 rounded-full w-4/5 animate-pulse" style={{ animationDelay: '400ms' }} />
          </div>
          
          {/* Corner fold */}
          <div className="absolute top-0 right-0 w-0 h-0 border-l-[16px] border-l-transparent border-t-[16px] border-t-zinc-700" />
        </div>
        
        {/* Orbiting analysis icons */}
        <div className="absolute inset-0 animate-[spin_5s_linear_infinite]">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-zinc-900 border-2 border-emerald-400/60 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <span className="text-sm">💰</span>
          </div>
        </div>
        <div className="absolute inset-0 animate-[spin_5s_linear_infinite]" style={{ animationDelay: '-1.66s' }}>
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-zinc-900 border-2 border-teal-400/60 flex items-center justify-center shadow-lg shadow-teal-500/30">
            <span className="text-sm">🌍</span>
          </div>
        </div>
        <div className="absolute inset-0 animate-[spin_5s_linear_infinite]" style={{ animationDelay: '-3.33s' }}>
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-zinc-900 border-2 border-cyan-400/60 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <span className="text-sm">⚡</span>
          </div>
        </div>
      </div>
      
      {/* Text content */}
      <div className="text-center space-y-3 max-w-md px-4">
        <div className="text-xl font-black text-white tracking-wide">Generating Deep Analysis</div>
        {billTitle && (
          <div className="text-sm text-emerald-400 font-bold line-clamp-2 px-4">"{billTitle}"</div>
        )}
        <div className="text-sm text-zinc-400 font-medium">Calculating personalized impact scores...</div>
      </div>
      
      {/* Progress indicators */}
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-zinc-500 font-bold">Financial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" style={{ animationDelay: '300ms' }} />
          <span className="text-xs text-zinc-500 font-bold">Climate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '600ms' }} />
          <span className="text-xs text-zinc-500 font-bold">Action Plan</span>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes scanDown {
          0%, 100% { top: -3rem; }
          50% { top: calc(100% + 1rem); }
        }
      `}</style>
    </div>
  );
}

// -------------------- Skeletons / Loaders --------------------
function SkeletonPulse({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-zinc-800/55 rounded ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700/55 to-transparent shimmer" />
      <style jsx>{`
        .shimmer {
          animation: shimmer 1.8s infinite;
          background-size: 200% 100%;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" | "xl" }) {
  const s = { sm: "w-5 h-5 border-2", md: "w-8 h-8 border-[3px]", lg: "w-12 h-12 border-4", xl: "w-16 h-16 border-4" }[size];
  return <div className={`${s} border-zinc-700/50 border-t-emerald-400 border-r-teal-400 rounded-full animate-spin`} />;
}

function BillCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div className="w-full p-8 border-2 border-zinc-800/50 rounded-2xl bg-zinc-900/25 backdrop-blur-sm fade-in" style={{ animationDelay: `${index * 0.12}s` }}>
      <style jsx>{`
        .fade-in {
          opacity: 0;
          animation: fadeInUp 0.55s ease-out forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="flex items-start justify-between gap-8 mb-6">
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center gap-3">
            <SkeletonPulse className="w-24 h-9 rounded-lg" />
            <SkeletonPulse className="w-20 h-9 rounded-lg" />
            <SkeletonPulse className="w-36 h-9 rounded-lg" />
          </div>
          <SkeletonPulse className="w-4/5 h-10 rounded-lg" />
          <SkeletonPulse className="w-full h-16 rounded-lg" />
          <div className="grid grid-cols-2 gap-5 pt-4">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-3">
                <SkeletonPulse className="w-28 h-5 rounded" />
                <SkeletonPulse className="w-full h-4 rounded" />
                <SkeletonPulse className="w-5/6 h-4 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0 space-y-6">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <SkeletonPulse className="w-24 h-24 rounded-full" />
              <div className="space-y-2">
                <SkeletonPulse className="w-32 h-4 rounded" />
                <SkeletonPulse className="w-24 h-3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-4 border-t-2 border-zinc-800/50">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <SkeletonPulse key={i} className="w-20 h-7 rounded-lg" />
          ))}
        </div>
        <SkeletonPulse className="w-32 h-6 rounded-lg" />
      </div>
    </div>
  );
}

// -------------------- Tiny UI Primitives --------------------
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-3 py-1.5 bg-zinc-900/55 border border-zinc-800 rounded-full text-xs font-black text-zinc-300 backdrop-blur">
      {children}
    </span>
  );
}

function IconButton({ title, onClick, children, className = "" }: { title: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button title={title} onClick={onClick} className={`p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all active:scale-[0.98] ${className}`}>
      {children}
    </button>
  );
}

function DividerGlow() {
  return (
    <div className="relative">
      <div className="h-px w-full bg-zinc-800/70" />
      <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-emerald-400/25 to-transparent" />
    </div>
  );
}

// -------------------- Mission (text preserved) --------------------
function MissionStatement() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const cards = [
    { color: "emerald" as const, title: "EVIDENCE-BASED", desc: "Every score derived from transparent AI analysis of actual bill text from the OpenStates policy database. No assumptions, no hallucinations." },
    { color: "teal" as const, title: "PERSONALIZED", desc: "Analysis tailored to YOUR specific situation: location, housing, income, and energy decisions." },
    { color: "cyan" as const, title: "ACTIONABLE", desc: "Not just information! Click on any of the bills in the list to view concrete next steps, eligibility criteria, and financial pathways." },
  ];

  const styleMap: Record<string, { border: string; hoverBorder: string; dot: string; title: string; bg: string; glow: string }> = {
    emerald: { border: "border-emerald-500/20", hoverBorder: "hover:border-emerald-500/45", dot: "bg-emerald-400", title: "text-emerald-400", bg: "bg-emerald-500/[0.06]", glow: "hover:shadow-[0_0_0_1px_rgba(16,185,129,0.10),0_30px_80px_-40px_rgba(16,185,129,0.25)]" },
    teal: { border: "border-teal-500/20", hoverBorder: "hover:border-teal-500/45", dot: "bg-teal-400", title: "text-teal-400", bg: "bg-teal-500/[0.06]", glow: "hover:shadow-[0_0_0_1px_rgba(20,184,166,0.10),0_30px_80px_-40px_rgba(20,184,166,0.25)]" },
    cyan: { border: "border-cyan-500/20", hoverBorder: "hover:border-cyan-500/45", dot: "bg-cyan-400", title: "text-cyan-400", bg: "bg-cyan-500/[0.06]", glow: "hover:shadow-[0_0_0_1px_rgba(34,211,238,0.10),0_30px_80px_-40px_rgba(34,211,238,0.22)]" },
  };

  return (
    <div ref={ref} className="mb-12 relative">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-400 to-cyan-400 rounded-full origin-top" style={{ opacity: visible ? 1 : 0, transform: visible ? "scaleY(1)" : "scaleY(0)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }} />
      <div className="pl-8 space-y-4">
        <div className="space-y-3" style={{ opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(-20px)", transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s" }}>
          <h2 className="text-2xl font-black text-white tracking-tight leading-tight">MISSION</h2>
          <p className="text-lg text-white/90 leading-relaxed max-w-4xl">
            Climate action requires both <span className="font-black text-emerald-400">urgency</span> and <span className="font-black text-teal-400">precision</span>. This tool hopes to bridge the gap between complex climate policy and actionable decisions by quantifying what matters most: the <span className="font-black text-emerald-400">financial impact on your life</span> and the <span className="font-black text-teal-400">measurable environmental benefit</span> to our planet.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {cards.map((c, i) => {
            const s = styleMap[c.color];
            return (
              <div key={c.title} className={`group p-5 ${s.bg} border-2 ${s.border} rounded-xl ${s.hoverBorder} transition-all duration-500 hover:scale-[1.02] cursor-default backdrop-blur-md ${s.glow}`} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)", transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.3 + i * 0.1}s` }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-2 h-2 ${s.dot} rounded-full animate-pulse`} style={{ animationDelay: `${i * 150}ms` }} />
                  <h3 className={`text-sm font-black ${s.title} tracking-wide`}>{c.title}</h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">{c.desc}</p>
              </div>
            );
          })}
        </div>
        <div className="pt-4 border-t-2 border-zinc-800 flex items-center justify-between gap-4" style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 0.6s" }}>
          <span className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs font-bold text-zinc-400 hover:border-zinc-600 transition-all">OPEN-SOURCE</span>
        </div>
      </div>
    </div>
  );
}// -------------------- Form --------------------
function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] text-zinc-500 font-bold flex items-center gap-2">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-700" />
      {children}
    </div>
  );
}

function UserProfileForm({ onSubmit, loading }: { onSubmit: (profile: UserProfile) => void; loading: boolean }) {
  const [formData, setFormData] = useState<UserProfile>({
    zip: "",
    state: "CT",
    housing_status: "Renter",
    property_type: "Apartment",
    can_make_upgrades: "Not sure",
    has_car: "Yes",
    next_vehicle_timeline: "1-3 years",
    utility_fuels: "No preference",
    job_sector: "",
    household_income: "Prefer not to say",
    household_size: "1-2 people",
    commute_distance: "Less than 10 miles",
    home_age: "Not sure",
    current_heating: "Not sure",
    interested_in_solar: "Maybe",
    own_business: "No",
  });

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const completedSections = React.useMemo(() => {
    const s = new Set<string>();
    if (formData.zip && formData.state) s.add("location");
    if (formData.housing_status && formData.property_type) s.add("housing");
    if (formData.has_car) s.add("transport");
    if (formData.household_income) s.add("household");
    return s;
  }, [formData.zip, formData.state, formData.housing_status, formData.property_type, formData.has_car, formData.household_income]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getInputClass = (key: string, color: string = "emerald") => {
    const colors: Record<string, string> = {
      emerald: "border-emerald-400 shadow-emerald-500/20",
      teal: "border-teal-400 shadow-teal-500/20",
      cyan: "border-cyan-400 shadow-cyan-500/20",
    };
    const focused = focusedField === key;
    return `w-full px-5 py-4 bg-zinc-900/55 border-2 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none transition-all duration-300 font-medium backdrop-blur-sm ${focused ? `${colors[color]} bg-zinc-900 shadow-lg scale-[1.02]` : "border-zinc-700/50 hover:border-zinc-600"}`;
  };

  const sections = ["location", "housing", "transport", "household"];
  const completion = Math.round((completedSections.size / sections.length) * 100);

  return (
    <form onSubmit={handleSubmit} className="space-y-12 relative">
      {/* Enhanced Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 rounded-3xl">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-3xl" />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <PolicyAnalysisLoader />
          </div>
        </div>
      )}

      {/* Intro Banner */}
      <div className="relative p-8 bg-gradient-to-br from-emerald-500/[0.15] via-teal-500/[0.12] to-transparent border-l-4 border-emerald-400 rounded-r-2xl hover:border-emerald-300 transition-all duration-500 overflow-hidden group">
        <div className="absolute -left-1 top-8 bottom-8 w-1 bg-gradient-to-b from-emerald-400 to-teal-500 transition-all duration-500 group-hover:w-1.5" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/15 transition-colors" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
        <div className="relative flex items-start gap-6">
          <div className="shrink-0 w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center transform -rotate-3 group-hover:rotate-0 group-hover:scale-110 transition-all duration-500 shadow-lg shadow-emerald-500/25">
            <svg className="w-8 h-8 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Evidence-Based Policy Analysis</h3>
            <p className="text-base text-white/85 leading-relaxed">
              Complete this profile to receive <span className="font-bold text-emerald-300">dual-impact scores</span> showing both your <span className="font-bold text-emerald-300">personal financial benefit</span> and the <span className="font-bold text-teal-300">climate impact</span> of each policy.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Pill>Profile completeness: {completion}%</Pill>
              <Pill>Private by design</Pill>
              <Pill>State-specific bills</Pill>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-3 py-4">
        {sections.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all duration-500 ${completedSections.has(s) ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-zinc-950 scale-110 shadow-lg shadow-emerald-500/30" : "bg-zinc-800 text-zinc-500"}`}>
              {completedSections.has(s) ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {i < 3 && <div className={`w-12 h-1 rounded-full transition-all duration-500 ${completedSections.has(s) ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-zinc-800"}`} />}
          </div>
        ))}
      </div>

      {/* Location */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-black text-white mb-6 flex items-center gap-3">
          <span className="w-1.5 h-8 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full" />
          Location
          {completedSections.has("location") && <span className="text-emerald-400">✓</span>}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="block space-y-2.5">
            <span className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              ZIP CODE
              <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-[10px] font-black rounded border border-red-500/30">REQUIRED</span>
            </span>
            <input type="text" value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} onFocus={() => setFocusedField("zip")} onBlur={() => setFocusedField(null)} placeholder="06511" className={getInputClass("zip")} required />
            <FieldHint>Matches you to local policies</FieldHint>
          </label>
          <label className="block space-y-2.5">
            <span className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              STATE
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-black rounded border border-amber-500/30">IMPORTANT</span>
            </span>
            <select value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} onFocus={() => setFocusedField("state")} onBlur={() => setFocusedField(null)} className={`${getInputClass("state", "teal")} appearance-none cursor-pointer`}>
              <option value="CT" className="bg-zinc-900">Connecticut</option>
              <option value="CA" className="bg-zinc-900">California</option>
            </select>
            <FieldHint>Bills are filtered by your state</FieldHint>
          </label>
        </div>
      </fieldset>

      {/* Housing */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-black text-white mb-6 flex items-center gap-3">
          <span className="w-1.5 h-8 bg-gradient-to-b from-teal-400 to-cyan-500 rounded-full" />
          Housing & Property
          {completedSections.has("housing") && <span className="text-teal-400">✓</span>}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { key: "housing_status", label: "HOUSING STATUS", options: ["Renter", "Owner", "Other"] },
            { key: "property_type", label: "PROPERTY TYPE", options: ["Apartment", "Single-family home", "Multi-family home", "Condo", "Other"] },
            { key: "can_make_upgrades", label: "CAN MAKE UPGRADES?", options: ["Yes", "No", "Not sure"] },
            { key: "home_age", label: "HOME AGE", options: ["Not sure", "Less than 10 years", "10-30 years", "30-50 years", "More than 50 years"] },
            { key: "current_heating", label: "CURRENT HEATING", options: ["Not sure", "Natural gas", "Oil", "Electric resistance", "Heat pump (already efficient!)", "Propane"] },
            { key: "interested_in_solar", label: "SOLAR INTEREST", options: ["Maybe", "Yes, very interested", "No, not feasible", "Already have solar"] },
          ].map((field) => (
            <label key={field.key} className="block space-y-2.5">
              <span className="text-sm font-bold text-white tracking-wide">{field.label}</span>
              <select value={formData[field.key as keyof UserProfile]} onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value } as UserProfile)} onFocus={() => setFocusedField(field.key)} onBlur={() => setFocusedField(null)} className={`${getInputClass(field.key, "teal")} appearance-none cursor-pointer`}>
                {field.options.map((opt) => (
                  <option key={opt} value={opt} className="bg-zinc-900">{opt}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Transportation */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-black text-white mb-6 flex items-center gap-3">
          <span className="w-1.5 h-8 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full" />
          Transportation
          {completedSections.has("transport") && <span className="text-cyan-400">✓</span>}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { key: "has_car", label: "HAVE A CAR?", options: ["Yes", "No"] },
            { key: "next_vehicle_timeline", label: "NEXT VEHICLE DECISION", options: ["0-12 months", "1-3 years", "3-10 years", "10+ years"] },
            { key: "utility_fuels", label: "VEHICLE PREFERENCE", options: ["No preference", "Electric only", "Hybrid", "Gas"] },
            { key: "commute_distance", label: "COMMUTE DISTANCE", options: ["Less than 10 miles", "10-25 miles", "25-50 miles", "More than 50 miles", "Work from home"] },
          ].map((field) => (
            <label key={field.key} className="block space-y-2.5">
              <span className="text-sm font-bold text-white tracking-wide">{field.label}</span>
              <select value={formData[field.key as keyof UserProfile]} onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value } as UserProfile)} onFocus={() => setFocusedField(field.key)} onBlur={() => setFocusedField(null)} className={`${getInputClass(field.key, "cyan")} appearance-none cursor-pointer`}>
                {field.options.map((opt) => (
                  <option key={opt} value={opt} className="bg-zinc-900">{opt}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Household */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-black text-white mb-6 flex items-center gap-3">
          <span className="w-1.5 h-8 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full" />
          Household Details
          {completedSections.has("household") && <span className="text-emerald-400">✓</span>}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { key: "household_income", label: "HOUSEHOLD INCOME", options: ["Prefer not to say", "Under $50,000", "$50,000 - $100,000", "$100,000 - $150,000", "Over $150,000"] },
            { key: "household_size", label: "HOUSEHOLD SIZE", options: ["1-2 people", "3-4 people", "5+ people"] },
            { key: "own_business", label: "OWN BUSINESS?", options: ["No", "Yes"] },
          ].map((field) => (
            <label key={field.key} className="block space-y-2.5">
              <span className="text-sm font-bold text-white tracking-wide">{field.label}</span>
              <select value={formData[field.key as keyof UserProfile]} onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value } as UserProfile)} onFocus={() => setFocusedField(field.key)} onBlur={() => setFocusedField(null)} className={`${getInputClass(field.key)} appearance-none cursor-pointer`}>
                {field.options.map((opt) => (
                  <option key={opt} value={opt} className="bg-zinc-900">{opt}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Job */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-black text-white mb-6 flex items-center gap-3">
          <span className="w-1.5 h-8 bg-gradient-to-b from-teal-400 to-cyan-500 rounded-full" />
          Career (Optional)
        </legend>
        <label className="block space-y-2.5">
          <span className="text-sm font-bold text-white tracking-wide">JOB / ROLE</span>
          <input type="text" value={formData.job_sector} onChange={(e) => setFormData({ ...formData, job_sector: e.target.value })} onFocus={() => setFocusedField("job_sector")} onBlur={() => setFocusedField(null)} placeholder="e.g., Student, Healthcare, Construction, Teacher" className={getInputClass("job_sector", "teal")} />
          <FieldHint>Some policies offer sector-specific benefits</FieldHint>
        </label>
      </fieldset>

      <DividerGlow />

      {/* Submit */}
      <button type="submit" disabled={loading} className="group relative w-full px-8 py-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-zinc-950 font-black text-lg rounded-2xl hover:shadow-2xl hover:shadow-emerald-500/30 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,white,transparent_70%)]" />
        </div>
        <div className="relative flex items-center justify-center gap-4">
          {loading ? (
            <>
              <LoadingSpinner size="sm" />
              <span>ANALYZING POLICIES...</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>FIND YOUR CLIMATE POLICIES</span>
              <svg className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </div>
      </button>

      <p className="text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Data processed locally • Never stored • Fully transparent methodology
      </p>
    </form>
  );
}

// -------------------- Score Meter --------------------
function ScoreMeter({ score, label, color, direction, descriptor }: { score: number; label: string; color: string; direction: string; descriptor?: string }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let start: number | undefined;
    let frame: number | undefined;
    const duration = 900;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setAnimatedScore(eased * score);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    const timer = setTimeout(() => {
      frame = requestAnimationFrame(animate);
    }, 50);
    return () => {
      clearTimeout(timer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [score]);

  const percentage = (animatedScore / 10) * 100;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorKey = color === "climate" ? `climate-${direction}` : "personal";
  const colorMap: Record<string, { stroke: string; text: string }> = {
    personal: { stroke: "#10b981", text: "text-emerald-400" },
    "climate-positive": { stroke: "#14b8a6", text: "text-teal-400" },
    "climate-negative": { stroke: "#f87171", text: "text-red-400" },
    "climate-neutral": { stroke: "#a1a1aa", text: "text-zinc-400" },
  };
  const colors = colorMap[colorKey] || colorMap.personal;

  return (
    <div className="flex items-center gap-4 group">
      <div className="relative w-24 h-24 transition-transform duration-300 group-hover:scale-105">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-zinc-800/55" />
          <circle cx="48" cy="48" r="40" fill="none" stroke={colors.stroke} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-900 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-black ${colors.text} tabular-nums`}>{animatedScore.toFixed(1)}</span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-sm font-black text-white tracking-wide">{label.toUpperCase()}</div>
        {descriptor && <div className={`text-xs ${colors.text} font-bold tracking-wide`}>{descriptor}</div>}
        <div className="text-[10px] text-zinc-600 font-bold tracking-widest">0-10 SCALE</div>
      </div>
    </div>
  );
}

// -------------------- Floating Particles --------------------
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div key={i} className="absolute w-1 h-1 bg-emerald-400/30 rounded-full particle" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${8 + Math.random() * 12}s` }} />
      ))}
      <style jsx>{`
        .particle { animation: floatUp linear infinite; }
        @keyframes floatUp {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// -------------------- Gradient Border Card --------------------
function GradientBorderCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative p-[2px] rounded-2xl bg-gradient-to-br from-emerald-500/50 via-teal-500/30 to-cyan-500/50 ${className}`}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-transparent to-cyan-500/20 blur-xl" />
      <div className="relative bg-zinc-950/95 rounded-2xl backdrop-blur-xl">{children}</div>
    </div>
  );
}

// -------------------- Bill Card --------------------
function BillCard({ bill, onClick, index, view }: { bill: Bill; onClick: () => void; index: number; view: "list" | "grid" }) {
  const [isHovered, setIsHovered] = useState(false);

  const statusStyles: Record<string, string> = {
    passed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
    enacted: "bg-blue-500/20 text-blue-300 border-blue-500/50",
    proposed: "bg-amber-500/20 text-amber-300 border-amber-500/50",
    vetoed: "bg-red-500/20 text-red-300 border-red-500/50",
  };

  const getCardBorder = () => {
    if (bill.personalScore >= 7 && bill.climateScore >= 7) return "border-emerald-400/60 bg-gradient-to-br from-emerald-500/7 via-transparent to-teal-500/7 shadow-[0_20px_60px_-40px_rgba(16,185,129,0.35)]";
    if (bill.climateDirection === "negative") return "border-red-500/50 bg-gradient-to-br from-red-500/6 via-transparent to-orange-500/6 shadow-[0_20px_60px_-40px_rgba(248,113,113,0.28)]";
    if (bill.personalScore >= 6) return "border-emerald-500/45 bg-emerald-500/6 shadow-[0_18px_55px_-42px_rgba(16,185,129,0.18)]";
    return "border-zinc-700/55 bg-zinc-900/30 hover:bg-zinc-900/38";
  };

  const wrapper = view === "grid" ? "p-7" : "p-8";

  return (
    <button onClick={onClick} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className={`group w-full text-left ${wrapper} border-2 rounded-2xl hover:border-emerald-400/70 hover:shadow-xl transition-all duration-500 overflow-hidden backdrop-blur-sm ${getCardBorder()} card-fade-in`} style={{ animationDelay: `${index * 0.06}s` }}>
      <style jsx>{`
        .card-fade-in { opacity: 0; animation: fadeInUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .sparkle { animation: sparkle 0.7s ease-out forwards; }
        @keyframes sparkle { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(3); opacity: 0; } }
      `}</style>

      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/7 via-transparent to-teal-500/7 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {isHovered && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 bg-emerald-300 rounded-full sparkle" style={{ left: `${20 + Math.random() * 60}%`, top: `${20 + Math.random() * 60}%`, animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      )}

      <div className="relative flex items-start justify-between gap-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="px-3 py-1.5 bg-zinc-800/80 text-white font-mono font-bold text-sm rounded-lg border border-zinc-700 group-hover:border-zinc-600 transition-colors">{bill.identifier}</span>
            <span className={`px-3 py-1.5 text-xs font-black rounded-lg border ${statusStyles[bill.status] || statusStyles.proposed} transition-all group-hover:scale-105`}>{formatStatus(bill.status)}</span>
            {bill.dateIntroduced && <span className="px-3 py-1.5 bg-zinc-900/40 text-zinc-300 text-xs font-black rounded-lg border border-zinc-800">INTRODUCED {timeAgoIso(bill.dateIntroduced)}</span>}
            {bill.personalScore >= 7 && bill.climateScore >= 7 && (
              <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 text-xs font-black rounded-lg border border-emerald-500/50 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                DUAL HIGH IMPACT
              </span>
            )}
          </div>

          <h3 className={`text-2xl font-black mb-3 leading-tight transition-colors duration-300 ${isHovered ? "text-emerald-400" : "text-white"}`}>{bill.title}</h3>
          <p className={`text-sm text-zinc-400 ${view === "grid" ? "line-clamp-3" : "line-clamp-2"} mb-5 leading-relaxed group-hover:text-zinc-300 transition-colors`}>{bill.summary}</p>

          <div className={`grid ${view === "grid" ? "grid-cols-1 gap-4" : "grid-cols-1 md:grid-cols-2 gap-5"}`}>
            {bill.personalReasons.length > 0 && (
              <div className="space-y-2">
                <div className="font-black text-emerald-400 text-sm mb-3 tracking-wide flex items-center gap-2">💰 FOR YOU</div>
                {bill.personalReasons.slice(0, view === "grid" ? 3 : 4).map((reason, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-zinc-300 transition-all duration-300 group-hover:translate-x-1" style={{ transitionDelay: `${i * 40}ms` }}>
                    <span className="text-emerald-400 font-bold mt-0.5">→</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}
            {bill.climateReasons.length > 0 && (
              <div className="space-y-2">
                <div className={`font-black text-sm mb-3 tracking-wide flex items-center gap-2 ${bill.climateDirection === "positive" ? "text-teal-400" : bill.climateDirection === "negative" ? "text-red-400" : "text-zinc-400"}`}>🌍 FOR CLIMATE</div>
                {bill.climateReasons.slice(0, view === "grid" ? 3 : 4).map((reason, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-zinc-300 transition-all duration-300 group-hover:translate-x-1" style={{ transitionDelay: `${i * 40}ms` }}>
                    <span className={`font-bold mt-0.5 ${bill.climateDirection === "positive" ? "text-teal-400" : bill.climateDirection === "negative" ? "text-red-400" : "text-zinc-400"}`}>→</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`shrink-0 space-y-6 ${view === "grid" ? "hidden xl:block" : ""}`}>
          <ScoreMeter score={bill.personalScore} label="Personal Financial" color="personal" direction={bill.personalDirection} descriptor={describePersonalFinancial(bill.personalScore)} />
          <ScoreMeter score={bill.climateScore} label="Climate" color="climate" direction={bill.climateDirection} descriptor={describeClimate(bill.climateScore, bill.climateDirection)} />
        </div>
      </div>

      <div className="relative flex items-center justify-between pt-4 mt-6 border-t-2 border-zinc-800/50 group-hover:border-zinc-700/55 transition-colors">
        <div className="flex flex-wrap gap-2">
          {bill.tags.slice(0, view === "grid" ? 3 : 4).map((tag, i) => (
            <span key={tag} className="px-3 py-1 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-400 text-xs font-bold hover:border-zinc-600 hover:text-zinc-300 transition-all" style={{ transitionDelay: `${i * 25}ms` }}>{tag}</span>
          ))}
        </div>
        <span className="text-sm font-black text-zinc-500 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
          VIEW ANALYSIS
          <svg className={`w-5 h-5 transition-transform duration-300 ${isHovered ? "translate-x-1" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </div>
    </button>
  );
}

function SourceLinks({ sources }: { sources?: Array<{ url: string; name: string | null }> }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-6 p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
      <div className="text-xs font-black text-zinc-400 mb-3">SOURCES</div>
      <div className="space-y-2">
        {sources.slice(0, 8).map((s, i) => (
          <a key={`${s.url}-${i}`} href={s.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-950/45 border border-zinc-800 hover:border-zinc-700 transition-all group">
            <div className="min-w-0">
              <div className="text-sm font-bold text-zinc-200 truncate">{s.name || "Source"}</div>
              <div className="text-[11px] text-zinc-500 font-bold truncate">{s.url}</div>
            </div>
            <div className="text-zinc-500 group-hover:text-emerald-300 transition-colors font-black text-xs">OPEN ↗</div>
          </a>
        ))}
      </div>
    </div>
  );
}

// -------------------- Bill Detail Modal --------------------
function BillDetailModal({ bill, onClose, userProfile }: { bill: Bill; onClose: () => void; userProfile: UserProfile }) {
  const [analysis, setAnalysis] = useState<ComprehensiveAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "financial" | "climate" | "action">("overview");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setAnalysis(null);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...userProfile, mode: "analyze_bill", billId: bill.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || data?.details || "Request failed");
        setAnalysis(data.analysis);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to analyze bill");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [bill.id, userProfile]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  const tabs = [
    { id: "overview", label: "Overview", icon: "📋" },
    { id: "financial", label: "Financial", icon: "💰" },
    { id: "climate", label: "Climate", icon: "🌍" },
    { id: "action", label: "Action Plan", icon: "⚡" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md modal-backdrop" onClick={onClose}>
      <style jsx>{`
        .modal-backdrop { animation: fadeIn 0.26s ease-out; }
        .modal-content { animation: modalSlideIn 0.34s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideIn { from { opacity: 0; transform: scale(0.97) translateY(18px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>

      <div className="relative w-full max-w-6xl max-h-[92vh] overflow-hidden bg-zinc-950 border-2 border-zinc-800 rounded-3xl shadow-2xl modal-content" onClick={(e) => e.stopPropagation()}>
        <FloatingParticles />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[240px] bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.035]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px)", backgroundSize: "56px 56px" }} />

        <div className="sticky top-0 z-20 p-8 border-b-2 border-zinc-800 bg-zinc-950/98 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="px-3 py-1.5 bg-zinc-800 text-white font-mono font-bold text-sm rounded-lg border border-zinc-700">{bill.identifier}</span>
                <span className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-xs font-black rounded-lg border border-zinc-700">{formatStatus(bill.status)}</span>
                <span className="px-3 py-1.5 bg-zinc-900/40 text-zinc-300 text-xs font-black rounded-lg border border-zinc-800">{bill.jurisdictionName}</span>
              </div>
              <h2 className="text-3xl font-black text-white leading-tight mb-2">{bill.title}</h2>
              <p className="text-sm font-bold text-zinc-500">Deep analysis is generated on demand for this bill.</p>
            </div>
            <div className="flex items-center gap-2">
              <IconButton title="Copy bill identifier" onClick={() => navigator.clipboard?.writeText?.(`${bill.identifier}`)}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h10M8 11h10M8 15h7M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" />
                </svg>
              </IconButton>
              <button onClick={onClose} className="p-3 hover:bg-zinc-800 rounded-xl transition-all hover:rotate-90 group" aria-label="Close">
                <svg className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 p-6 bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl">
            <ScoreMeter score={bill.personalScore} label="Personal Financial" color="personal" direction={bill.personalDirection} descriptor={describePersonalFinancial(bill.personalScore)} />
            <ScoreMeter score={bill.climateScore} label="Climate" color="climate" direction={bill.climateDirection} descriptor={describeClimate(bill.climateScore, bill.climateDirection)} />
            <div className="flex-1">
              <div className="text-xs font-black text-zinc-400 mb-2">AT A GLANCE</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-zinc-950/45 border border-zinc-800 rounded-2xl">
                  <div className="text-[10px] font-black text-zinc-500 mb-1">CLIMATE DIRECTION</div>
                  <div className={`text-sm font-black ${bill.climateDirection === "positive" ? "text-teal-300" : bill.climateDirection === "negative" ? "text-red-300" : "text-zinc-300"}`}>{formatStatus(bill.climateDirection)}</div>
                </div>
                <div className="p-4 bg-zinc-950/45 border border-zinc-800 rounded-2xl">
                  <div className="text-[10px] font-black text-zinc-500 mb-1">TAGS</div>
                  <div className="text-sm font-black text-zinc-200">{bill.tags?.slice(0, 3).join(" • ") || "—"}</div>
                </div>
              </div>
            </div>
          </div>

          {!loading && !error && analysis && (
            <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`px-6 py-3 rounded-xl font-black text-sm whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 shadow-lg shadow-emerald-500/30 scale-105" : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white hover:scale-[1.02]"}`}>
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(92vh-320px)]">
          {loading ? (
            <BillAnalysisLoader billTitle={bill.title} />
          ) : error ? (
            <div className="text-center py-16">
              <div className="inline-flex p-5 bg-red-500/20 rounded-full mb-6">
                <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-400 font-bold text-lg mb-2">Analysis Failed</p>
              <p className="text-zinc-500 text-sm mb-6">{error}</p>
              <button onClick={onClose} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all font-bold hover:scale-105">CLOSE</button>
            </div>
          ) : analysis ? (
            <div className="space-y-8">
              {activeTab === "overview" && (
                <section className="p-6 bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all">
                  <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                    <span className="w-1 h-6 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full" />
                    OVERVIEW
                  </h3>
                  <p className="text-white/90 leading-relaxed mb-6">{analysis.overview.plain_english_summary}</p>
                  {analysis.overview.what_this_means_for_you && (
                    <GradientBorderCard className="mb-6">
                      <div className="p-4">
                        <div className="text-xs font-black text-emerald-400 mb-2">FOR YOU SPECIFICALLY</div>
                        <p className="text-sm text-white/90">{analysis.overview.what_this_means_for_you}</p>
                      </div>
                    </GradientBorderCard>
                  )}
                  {analysis.overview.key_provisions.length > 0 && (
                    <>
                      <h4 className="text-sm font-black text-zinc-400 tracking-wide mb-3">KEY PROVISIONS</h4>
                      {analysis.overview.key_provisions.map((item, i) => (
                        <div key={i} className="flex gap-3 text-sm text-zinc-300 p-3 bg-zinc-900/30 rounded-lg hover:bg-zinc-900/50 transition-all hover:translate-x-1 mb-2">
                          <span className="text-emerald-400 font-bold shrink-0">{i + 1}.</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </>
                  )}
                  <SourceLinks sources={bill.sources} />
                </section>
              )}

              {activeTab === "financial" && (
                <section className="p-6 bg-emerald-500/5 border-2 border-emerald-500/20 rounded-2xl hover:border-emerald-500/30 transition-all">
                  <h3 className="text-xl font-black text-emerald-400 mb-6">💰 FINANCIAL IMPACT</h3>
                  {analysis.financial_impact_for_you?.bottom_line && (
                    <GradientBorderCard className="mb-6">
                      <div className="p-4">
                        <div className="text-xs font-black text-emerald-400 mb-1">BOTTOM LINE</div>
                        <p className="text-sm text-white">{analysis.financial_impact_for_you.bottom_line}</p>
                      </div>
                    </GradientBorderCard>
                  )}
                  {analysis.personalized_financial_analysis.direct_benefits.length > 0 && (
                    <>
                      <h4 className="text-sm font-black text-emerald-400 mb-3">DIRECT BENEFITS</h4>
                      <div className="space-y-2 mb-6">
                        {analysis.personalized_financial_analysis.direct_benefits.map((item, i) => (
                          <div key={i} className="flex gap-2 text-sm text-white p-3 bg-emerald-500/5 rounded-lg hover:bg-emerald-500/10 transition-all hover:translate-x-1">
                            <span className="text-emerald-400 font-bold shrink-0">→</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {analysis.personalized_financial_analysis.estimated_value && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                      <div className="text-xs font-black text-emerald-400 mb-1">ESTIMATED VALUE</div>
                      <div className="text-sm text-white">{analysis.personalized_financial_analysis.estimated_value}</div>
                    </div>
                  )}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-zinc-950/45 border border-zinc-800 rounded-2xl">
                      <div className="text-xs font-black text-zinc-400 mb-3">ELIGIBILITY FACTORS</div>
                      <div className="space-y-2">
                        {analysis.personalized_financial_analysis.eligibility_factors?.slice(0, 6).map((x, i) => (
                          <div key={i} className="text-sm text-zinc-200 flex gap-2">
                            <span className="text-emerald-400 font-black">•</span>
                            <span>{x}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-5 bg-zinc-950/45 border border-zinc-800 rounded-2xl">
                      <div className="text-xs font-black text-zinc-400 mb-3">BARRIERS</div>
                      <div className="space-y-2">
                        {analysis.personalized_financial_analysis.barriers?.slice(0, 6).map((x, i) => (
                          <div key={i} className="text-sm text-zinc-200 flex gap-2">
                            <span className="text-red-300 font-black">•</span>
                            <span>{x}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "climate" && (
                <section className="p-6 bg-teal-500/5 border-2 border-teal-500/20 rounded-2xl hover:border-teal-500/30 transition-all">
                  <h3 className="text-xl font-black text-teal-400 mb-6">🌍 CLIMATE IMPACT</h3>
                  {analysis.personalized_climate_analysis.environmental_benefits.length > 0 && (
                    <>
                      <h4 className="text-sm font-black text-teal-400 mb-3">ENVIRONMENTAL BENEFITS</h4>
                      <div className="space-y-2 mb-6">
                        {analysis.personalized_climate_analysis.environmental_benefits.map((item, i) => (
                          <div key={i} className="flex gap-2 text-sm text-white p-3 bg-teal-500/5 rounded-lg hover:bg-teal-500/10 transition-all hover:translate-x-1">
                            <span className="text-teal-400 font-bold shrink-0">→</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {analysis.personalized_climate_analysis.scale_and_scope && (
                    <GradientBorderCard className="mb-6">
                      <div className="p-4">
                        <div className="text-xs font-black text-teal-400 mb-1">SCALE & SCOPE</div>
                        <div className="text-sm text-white">{analysis.personalized_climate_analysis.scale_and_scope}</div>
                      </div>
                    </GradientBorderCard>
                  )}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-zinc-950/45 border border-zinc-800 rounded-2xl">
                      <div className="text-xs font-black text-zinc-400 mb-3">LOCAL IMPACT</div>
                      <div className="space-y-2">
                        {analysis.personalized_climate_analysis.local_impact?.slice(0, 6).map((x, i) => (
                          <div key={i} className="text-sm text-zinc-200 flex gap-2">
                            <span className="text-teal-300 font-black">•</span>
                            <span>{x}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-5 bg-zinc-950/45 border border-zinc-800 rounded-2xl">
                      <div className="text-xs font-black text-zinc-400 mb-3">PERSONAL CONTRIBUTION</div>
                      <div className="space-y-2">
                        {analysis.personalized_climate_analysis.personal_contribution?.slice(0, 6).map((x, i) => (
                          <div key={i} className="text-sm text-zinc-200 flex gap-2">
                            <span className="text-cyan-300 font-black">•</span>
                            <span>{x}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "action" && (
                <section className="p-6 bg-blue-500/5 border-2 border-blue-500/20 rounded-2xl">
                  <h3 className="text-xl font-black text-blue-400 mb-6">⚡ ACTION PLAN</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {analysis.action_plan.immediate_steps.length > 0 && (
                      <div>
                        <h4 className="text-sm font-black text-blue-400 mb-3">DO NOW</h4>
                        {analysis.action_plan.immediate_steps.map((step, i) => (
                          <div key={i} className="flex gap-2 text-sm text-white p-3 bg-blue-500/5 rounded-lg mb-2 hover:bg-blue-500/10 transition-all hover:translate-x-1">
                            <span className="text-blue-400 font-black shrink-0">{i + 1}.</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {analysis.action_plan.medium_term_steps.length > 0 && (
                      <div>
                        <h4 className="text-sm font-black text-cyan-400 mb-3">DO SOON</h4>
                        {analysis.action_plan.medium_term_steps.map((step, i) => (
                          <div key={i} className="flex gap-2 text-sm text-white p-3 bg-cyan-500/5 rounded-lg mb-2 hover:bg-cyan-500/10 transition-all hover:translate-x-1">
                            <span className="text-cyan-400 font-black shrink-0">{i + 1}.</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {analysis.action_plan.long_term_considerations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-black text-teal-400 mb-3">PLAN AHEAD</h4>
                        {analysis.action_plan.long_term_considerations.map((item, i) => (
                          <div key={i} className="flex gap-2 text-sm text-white p-3 bg-teal-500/5 rounded-lg mb-2 hover:bg-teal-500/10 transition-all hover:translate-x-1">
                            <span className="text-teal-400 font-bold shrink-0">→</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-8 p-5 bg-zinc-950/45 border border-zinc-800 rounded-2xl">
                    <div className="text-xs font-black text-zinc-400 mb-3">QUESTIONS TO ASK</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analysis.action_plan.questions_to_ask?.slice(0, 10).map((q, i) => (
                        <div key={i} className="p-3 rounded-xl bg-zinc-900/35 border border-zinc-800 text-sm text-zinc-200">
                          <span className="text-zinc-400 font-black mr-2">{i + 1}.</span>
                          {q}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// -------------------- Results helpers --------------------
function relevanceScore(b: Bill) {
  const personal = clamp(b.personalScore, 0, 10);
  const climate = clamp(b.climateScore, 0, 10);
  const climateSigned = b.climateDirection === "negative" ? -climate : b.climateDirection === "neutral" ? climate * 0.25 : climate;
  const reasonsBoost = clamp((b.personalReasons?.length || 0) + (b.climateReasons?.length || 0), 0, 8) * 0.12;
  const tagsBoost = clamp(b.tags?.length || 0, 0, 10) * 0.05;
  const base = personal * 0.62 + climateSigned * 0.48 + reasonsBoost + tagsBoost;
  const statusNudge = b.status === "enacted" ? 0.35 : b.status === "passed" ? 0.2 : 0;
  return base + statusNudge;
}

function InsightsBar({ bills, filteredBills }: { bills: Bill[]; filteredBills: Bill[] }) {
  const stats = useMemo(() => {
    const list = filteredBills.length ? filteredBills : bills;
    if (!list.length) return null;
    const avgPersonal = list.reduce((a, b) => a + (b.personalScore || 0), 0) / list.length;
    const avgClimate = list.reduce((a, b) => a + (b.climateScore || 0), 0) / list.length;
    const highDual = list.filter((b) => b.personalScore >= 7 && b.climateScore >= 7).length;
    const harmful = list.filter((b) => b.climateDirection === "negative" && b.climateScore >= 6).length;
    const top = [...list].sort((a, b) => relevanceScore(b) - relevanceScore(a)).slice(0, 3);
    return { avgPersonal, avgClimate, highDual, harmful, top };
  }, [bills, filteredBills]);

  if (!stats) return null;

  return (
    <GradientBorderCard className="mb-8">
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-[260px]">
            <div className="text-xs font-black text-zinc-400 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              INSIGHTS
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-zinc-900/35 border border-zinc-800 rounded-2xl group hover:border-emerald-500/30 transition-all">
                <div className="text-[10px] font-black text-zinc-500">AVG PERSONAL</div>
                <div className="text-2xl font-black text-emerald-300 tabular-nums">{(Math.round(stats.avgPersonal * 10) / 10).toFixed(1)}</div>
              </div>
              <div className="p-4 bg-zinc-900/35 border border-zinc-800 rounded-2xl group hover:border-teal-500/30 transition-all">
                <div className="text-[10px] font-black text-zinc-500">AVG CLIMATE</div>
                <div className="text-2xl font-black text-teal-300 tabular-nums">{(Math.round(stats.avgClimate * 10) / 10).toFixed(1)}</div>
              </div>
              <div className="p-4 bg-zinc-900/35 border border-zinc-800 rounded-2xl group hover:border-emerald-500/30 transition-all">
                <div className="text-[10px] font-black text-zinc-500">DUAL HIGH IMPACT</div>
                <div className="text-2xl font-black text-emerald-300 tabular-nums">{stats.highDual}</div>
              </div>
              <div className="p-4 bg-zinc-900/35 border border-zinc-800 rounded-2xl group hover:border-red-500/30 transition-all">
                <div className="text-[10px] font-black text-zinc-500">HIGH CLIMATE HARM</div>
                <div className="text-2xl font-black text-red-300 tabular-nums">{stats.harmful}</div>
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-[280px]">
            <div className="text-xs font-black text-zinc-400 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
              TOP MATCHES
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {stats.top.map((b, i) => (
                <div key={b.id} className="p-4 bg-gradient-to-br from-emerald-500/10 via-zinc-900/30 to-teal-500/10 border border-zinc-800 rounded-2xl hover:border-emerald-500/30 transition-all group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-zinc-500">{b.identifier}</span>
                    {i === 0 && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-black">TOP</span>}
                  </div>
                  <div className="text-sm font-black text-white line-clamp-2 group-hover:text-emerald-300 transition-colors">{b.title}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-200 font-black">P {b.personalScore.toFixed(1)}</span>
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-teal-500/15 border border-teal-500/25 text-teal-200 font-black">C {b.climateScore.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-[11px] text-zinc-500 font-bold">Tip: use the sliders to tighten the list without losing "best match" ranking.</div>
          </div>
        </div>
      </div>
    </GradientBorderCard>
  );
}

// -------------------- Page --------------------
export default function Page() {
  const reducedMotion = usePrefersReducedMotion();
  const parallax = useMouseTilt(14);
  const scrollP = useScrollProgress();

  const [cursor, setCursor] = useState({ x: 9999, y: 9999 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const [step, setStep] = useState<"form" | "results">("form");
  const [renderStep, setRenderStep] = useState(step);
  const [stepAnimating, setStepAnimating] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [userState, setUserState] = useState<string>("");

  const [sortBy, setSortBy] = useState<"rank" | "personal" | "climate">("rank");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [minPersonal, setMinPersonal] = useState(0);
  const [minClimate, setMinClimate] = useState(0);

  const [view, setView] = useState<"list" | "grid">("list");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (step === renderStep) return;
    setStepAnimating(true);
    const t = setTimeout(() => {
      setRenderStep(step);
      setTimeout(() => setStepAnimating(false), 20);
    }, 180);
    return () => clearTimeout(t);
  }, [step, renderStep]);

  const searchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selectedBill) return;
      if (renderStep === "results" && e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus?.();
      }
      if (renderStep === "results" && (e.key === "g" || e.key === "G") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setView((v) => (v === "list" ? "grid" : "list"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [renderStep, selectedBill]);

  async function handleSubmit(profile: UserProfile) {
    setLoading(true);
    setErrorBanner(null);
    setUserProfile(profile);
    setUserState(profile.state);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, mode: "find_bills" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.details || "Request failed");
      setBills(data.bills || []);
      setStep("results");
      setSortBy("rank");
      setFilterStatus("all");
      setSearch("");
      setMinPersonal(0);
      setMinClimate(0);
      setView("list");
      if (!data.bills || data.bills.length === 0) {
        setErrorBanner(data.message || "No bills found for your state (or none passed relevance filtering).");
      }
    } catch (error: unknown) {
      const msg = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  }

  const sortedBills = useMemo(() => {
    const arr = [...bills];
    arr.sort((a, b) => {
      if (sortBy === "personal") return b.personalScore - a.personalScore;
      if (sortBy === "climate") return b.climateScore - a.climateScore;
      return relevanceScore(b) - relevanceScore(a);
    });
    return arr;
  }, [bills, sortBy]);

  const filteredBills = useMemo(() => {
    const statusFiltered = filterStatus === "all" ? sortedBills : sortedBills.filter((bill) => bill.status === filterStatus);
    const q = search.trim().toLowerCase();
    return statusFiltered
      .filter((b) => (q ? `${b.identifier} ${b.title} ${b.summary} ${(b.tags || []).join(" ")}`.toLowerCase().includes(q) : true))
      .filter((b) => b.personalScore >= minPersonal)
      .filter((b) => {
        if (minClimate <= 0) return true;
        if (b.climateDirection === "negative") return false;
        return b.climateScore >= minClimate;
      });
  }, [sortedBills, filterStatus, search, minPersonal, minClimate]);

  const stateLabel = userState ? (STATE_NAMES[userState] ? `${STATE_NAMES[userState]} (${userState})` : userState) : "";

  const anyStatus = useMemo(() => {
    const set = new Set(bills.map((b) => b.status).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [bills]);

  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop((document.documentElement.scrollTop || 0) > 650);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [ambientOn, setAmbientOn] = useState(true);
  useEffect(() => {
    document.body.dataset.ambient = "on";
  }, []);
  const toggleAmbient = () => {
    setAmbientOn((v) => {
      const next = !v;
      document.body.dataset.ambient = next ? "on" : "off";
      return next;
    });
  };

  return (
    <div className="min-h-screen relative text-white">
      <MeshGradient parallaxX={parallax.x} parallaxY={parallax.y} reducedMotion={reducedMotion || !ambientOn} />
      {ambientOn && <AmbientOrbs reducedMotion={reducedMotion} />}
      {ambientOn && <StarDust reducedMotion={reducedMotion} />}
      {ambientOn && <TechGrid parallaxX={parallax.x} parallaxY={parallax.y} />}
      {ambientOn && <ContourLines parallaxX={parallax.x} parallaxY={parallax.y} />}
      {ambientOn && <HexagonPattern reducedMotion={reducedMotion} />}
      {ambientOn && <WaveLines reducedMotion={reducedMotion} />}
      {ambientOn && <GlowingOrbs reducedMotion={reducedMotion} />}
      <MicroDiagonal />
      <NoiseOverlay />
      {ambientOn && <CursorSpotlight x={cursor.x} y={cursor.y} />}

      <div className="relative z-10">
        <div className="fixed top-0 left-0 right-0 z-30 h-[3px]">
          <div className="h-full bg-zinc-800/40" />
          <div className="absolute inset-0 h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" style={{ width: `${scrollP}%` }} />
        </div>

        <div className="sticky top-0 z-20 border-b border-zinc-800/70 bg-zinc-950/55 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-emerald-500/20">
                C
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-400 animate-ping opacity-20" />
              </div>
              <div>
                <div className="text-sm font-black tracking-wide">CLIMATE IMPACT COMPASS</div>
                <div className="text-xs text-zinc-500 font-bold">Policy → Personalized scores → Action plan</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {renderStep === "results" && (
                <>
                  <div className="hidden md:flex items-center gap-2 mr-2">
                    <Pill>Press "/" to search</Pill>
                    <Pill>Press "G" for grid</Pill>
                  </div>
                  <IconButton title="Edit profile" onClick={() => { setSelectedBill(null); setStep("form"); }}>
                    <span className="text-sm font-black">←</span>
                  </IconButton>
                  <IconButton title="Reset filters" onClick={() => { setSearch(""); setMinPersonal(0); setMinClimate(0); setFilterStatus("all"); setSortBy("rank"); }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0114-7M19 5a9 9 0 00-14 7" />
                    </svg>
                  </IconButton>
                </>
              )}
              <IconButton title={ambientOn ? "Turn ambient effects off" : "Turn ambient effects on"} onClick={toggleAmbient}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M7.05 7.05 5.636 5.636" />
                </svg>
              </IconButton>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-6 py-10">
          {errorBanner && (
            <div className="mb-8 p-5 bg-red-500/10 border-2 border-red-500/25 rounded-2xl backdrop-blur-xl flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-black text-red-300 mb-1">NOTICE</div>
                <div className="text-sm text-zinc-200">{errorBanner}</div>
              </div>
              <button onClick={() => setErrorBanner(null)} className="px-3 py-2 bg-zinc-900/70 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white transition-all font-black">CLOSE</button>
            </div>
          )}

          <div className={`transition-all duration-300 ${stepAnimating ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"}`}>
            {renderStep === "form" ? (
              <>
                <div className="mb-10 relative">
                  <FloatingParticles />
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                    Find the climate policies that matter to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 animate-gradient">you</span>.
                  </h1>
                  <style jsx>{`
                    @keyframes gradient { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
                    .animate-gradient { background-size: 200% 200%; animation: gradient 3s ease infinite; }
                  `}</style>
                  <p className="mt-4 text-zinc-300 max-w-3xl leading-relaxed">Enter a quick profile. We'll surface state-specific bills and score each one on two axes: your personal financial benefit and climate impact. Created by Leo Levitt! </p>
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    <Pill>Dual-axis scoring</Pill>
                    <Pill>Transparent reasons</Pill>
                    <Pill>Fast, on-demand analysis</Pill>
                    <Pill>Designed for clarity</Pill>
                  </div>
                </div>
                <MissionStatement />
                <GradientBorderCard>
                  <div className="p-8 relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-28 -left-28 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
                    <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)", backgroundSize: "120px 120px", backgroundPosition: "10px 20px" }} />
                    <UserProfileForm onSubmit={handleSubmit} loading={loading} />
                  </div>
                </GradientBorderCard>
                <div className="mt-8 text-center">
                  <p className="text-sm text-zinc-500 font-bold">Created by <span className="text-emerald-400">Leo Levitt</span></p>
                </div>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-black tracking-tight">Your Results</h2>
                      <div className="mt-2 text-zinc-400 font-bold text-sm">
                        {stateLabel ? (<>Showing bills for <span className="text-emerald-300">{stateLabel}</span></>) : "Showing bills"}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill>{filteredBills.length} shown</Pill>
                      <Pill>{bills.length} fetched</Pill>
                      {userProfile?.zip && <Pill>ZIP {userProfile.zip}</Pill>}
                      <Pill>View: {view.toUpperCase()}</Pill>
                    </div>
                  </div>
                </div>

                <InsightsBar bills={bills} filteredBills={filteredBills} />

                <GradientBorderCard className="mb-8">
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                      <div className="lg:col-span-5">
                        <div className="text-xs font-black text-zinc-400 mb-2">SEARCH</div>
                        <input ref={searchRef as React.RefObject<HTMLInputElement>} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, identifier, tags..." className="w-full px-4 py-3 bg-zinc-900/60 border-2 border-zinc-800 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-400/70 transition-all font-bold" />
                        <div className="mt-2 text-[11px] text-zinc-500 font-bold">Shortcut: press "/" to focus this field.</div>
                      </div>
                      <div className="lg:col-span-3">
                        <div className="text-xs font-black text-zinc-400 mb-2">SORT</div>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "rank" | "personal" | "climate")} className="w-full px-4 py-3 bg-zinc-900/60 border-2 border-zinc-800 rounded-2xl text-white focus:outline-none focus:border-emerald-400/70 transition-all font-black">
                          <option value="rank" className="bg-zinc-900">Best match</option>
                          <option value="personal" className="bg-zinc-900">Highest personal benefit</option>
                          <option value="climate" className="bg-zinc-900">Highest climate impact</option>
                        </select>
                      </div>
                      <div className="lg:col-span-4">
                        <div className="text-xs font-black text-zinc-400 mb-2">STATUS</div>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-4 py-3 bg-zinc-900/60 border-2 border-zinc-800 rounded-2xl text-white focus:outline-none focus:border-emerald-400/70 transition-all font-black">
                          {anyStatus.map((s) => (<option key={s} value={s} className="bg-zinc-900">{s === "all" ? "All statuses" : formatStatus(s)}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-5 bg-zinc-900/30 border border-zinc-800 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-black text-zinc-400">MIN PERSONAL SCORE</div>
                          <div className="text-xs font-black text-emerald-300 tabular-nums">{minPersonal.toFixed(1)}</div>
                        </div>
                        <input type="range" min={0} max={10} step={0.5} value={minPersonal} onChange={(e) => setMinPersonal(Number(e.target.value))} className="w-full mt-4 accent-emerald-400" />
                        <div className="mt-2 text-[11px] text-zinc-500 font-bold">Tighten financial relevance.</div>
                      </div>
                      <div className="p-5 bg-zinc-900/30 border border-zinc-800 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-black text-zinc-400">MIN CLIMATE SCORE (POSITIVE ONLY)</div>
                          <div className="text-xs font-black text-teal-300 tabular-nums">{minClimate.toFixed(1)}</div>
                        </div>
                        <input type="range" min={0} max={10} step={0.5} value={minClimate} onChange={(e) => setMinClimate(Number(e.target.value))} className="w-full mt-4 accent-teal-400" />
                        <div className="mt-2 text-[11px] text-zinc-500 font-bold">Negative climate-direction bills are excluded when this slider is above 0.</div>
                      </div>
                    </div>
                    <DividerGlow />
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => setView("list")} className={`px-4 py-2 rounded-xl font-black text-sm transition-all border ${view === "list" ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 border-transparent" : "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"}`}>LIST</button>
                      </div>
                      <button onClick={() => { setSearch(""); setMinPersonal(0); setMinClimate(0); setFilterStatus("all"); setSortBy("rank"); }} className="px-4 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all font-black">RESET FILTERS</button>
                    </div>
                  </div>
                </GradientBorderCard>

                {loading && bills.length === 0 ? (
                  <div className="space-y-5">
                    {[0, 1, 2].map((i) => (<BillCardSkeleton key={i} index={i} />))}
                  </div>
                                ) : filteredBills.length === 0 ? (
                                  <GradientBorderCard>
                                    <div className="p-10 text-center">
                                      <div className="text-2xl font-black mb-2">No matches</div>
                                      <p className="text-zinc-400 mt-2">Try adjusting your filters or expanding your criteria.</p>
                                    </div>
                                  </GradientBorderCard>
                                ) : (
                                  <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8" : "space-y-8"}>
                                    {filteredBills.map((bill, i) => (
                                      <BillCard
                                        key={bill.id}
                                        bill={bill}
                                        onClick={() => setSelectedBill(bill)}
                                        index={i}
                                        view={view}
                                      />
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </main>
                      </div>
                      {selectedBill && userProfile && (
                        <BillDetailModal
                          bill={selectedBill}
                          onClose={() => setSelectedBill(null)}
                          userProfile={userProfile}
                        />
                      )}
                    </div>
                  );
                }