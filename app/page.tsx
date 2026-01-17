"use client";

import React, { useState, useEffect, useRef } from "react";

// Types
type UserProfile = {
  zip: string; state: string; housing_status: string; property_type: string;
  can_make_upgrades: string; utility_fuels: string; has_car: string;
  next_vehicle_timeline: string; job_sector: string; household_income: string;
  household_size: string; commute_distance: string; home_age: string;
  current_heating: string; interested_in_solar: string; own_business: string;
};

type Bill = {
  id: string; identifier: string; title: string; summary: string;
  personalScore: number; personalLabel: string; personalDirection: string;
  personalReasons: string[]; climateScore: number; climateLabel: string;
  climateDirection: string; climateReasons: string[]; jurisdictionCode?: string;
  jurisdictionName: string; status: string; dateIntroduced: string | null;
  tags: string[]; sources?: Array<{ url: string; name: string | null }>;
};

type ComprehensiveAnalysis = {
  overview: { plain_english_summary: string; what_this_means_for_you: string; key_provisions: string[]; timeline_and_status: { current_status: string; when_it_takes_effect: string; key_deadlines: string[]; what_needs_to_happen_next: string; }; };
  your_specific_situation?: { relevance_to_you: string; provisions_that_apply_to_you: string[]; provisions_that_dont_apply: string[]; your_best_opportunities: string[]; your_biggest_barriers: string[]; };
  personalized_financial_analysis: { direct_benefits: string[]; eligibility_factors: string[]; estimated_value: string; access_pathway: string[]; barriers: string[]; };
  financial_impact_for_you?: { bottom_line: string; breakdown_by_provision?: string[]; };
  personalized_climate_analysis: { environmental_benefits: string[]; local_impact: string[]; personal_contribution: string[]; scale_and_scope: string; };
  environmental_impact_explained?: { state_and_regional_context?: string[]; };
  detailed_bill_provisions?: { provision_by_provision_analysis: string[]; which_parts_matter_most_to_you: string[]; implementation_mechanisms: string[]; funding_sources: string[]; };
  detailed_requirements: { who_qualifies: string[]; documentation_needed: string[]; income_limits: string; other_restrictions: string[]; };
  eligibility_and_requirements?: { your_eligibility_assessment?: string[]; special_considerations?: string[]; };
  certainties_and_uncertainties: { what_is_certain: string[]; what_depends_on_implementation: string[]; missing_information: string[]; risks_and_caveats: string[]; };
  what_we_know_and_dont_know?: { what_to_watch_for?: string[]; };
  action_plan: { immediate_steps: string[]; medium_term_steps: string[]; long_term_considerations: string[]; questions_to_ask: string[]; };
  your_action_plan?: { decision_framework?: string[]; };
  local_context: { local_programs: string[]; local_considerations: string[]; community_resources: string[]; };
  local_and_regional_impact?: { cities_and_regions_affected: string[]; your_area_specifically: string[]; urban_vs_rural: string; local_economic_impact: string[]; community_benefits: string[]; };
  common_questions_answered: { is_this_a_tax_increase: string; do_i_have_to_do_anything: string; what_if_i_rent: string; what_if_im_low_income: string; what_if_i_own_a_business?: string; how_long_does_this_take: string; is_the_paperwork_complicated: string; what_about_maintenance?: string; can_i_combine_with_other_programs?: string; other_important_questions: string[]; };
};

const STATE_NAMES: Record<string, string> = { CT: "Connecticut", CA: "California", NY: "New York", MA: "Massachusetts", NJ: "New Jersey" };

function GeometricPattern() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" style={{ animation: "float 25s ease-in-out infinite" }} />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl" style={{ animation: "float 30s ease-in-out infinite reverse" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" style={{ animation: "float 35s ease-in-out infinite" }} />
      <div className="opacity-[0.03]">
        <div className="absolute top-20 left-1/4 w-80 h-80 border-2 border-emerald-400 rounded-3xl rotate-45" style={{ animation: "float 20s ease-in-out infinite" }} />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 border-2 border-teal-400 rounded-2xl -rotate-12" style={{ animation: "float 15s ease-in-out infinite", animationDelay: "5s" }} />
      </div>
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
      `}</style>
    </div>
  );
}

function SkeletonPulse({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-zinc-800/50 rounded ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent shimmer" />
      <style jsx>{`
        .shimmer { animation: shimmer 2s infinite; background-size: 200% 100%; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>
    </div>
  );
}

function BillCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div className="w-full p-8 border-2 border-zinc-800/50 rounded-2xl bg-zinc-900/20 backdrop-blur-sm fade-in" style={{ animationDelay: `${index * 0.15}s` }}>
      <style jsx>{`
        .fade-in { opacity: 0; animation: fadeInUp 0.6s ease-out forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
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
            {[0, 1].map(i => (
              <div key={i} className="space-y-3">
                <SkeletonPulse className="w-28 h-5 rounded" />
                <SkeletonPulse className="w-full h-4 rounded" />
                <SkeletonPulse className="w-5/6 h-4 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0 space-y-6">
          {[0, 1].map(i => (
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
          {[0, 1, 2].map(i => <SkeletonPulse key={i} className="w-20 h-7 rounded-lg" />)}
        </div>
        <SkeletonPulse className="w-32 h-6 rounded-lg" />
      </div>
    </div>
  );
}

function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: "w-5 h-5 border-2", md: "w-8 h-8 border-[3px]", lg: "w-12 h-12 border-4" }[size];
  return <div className={`${s} border-zinc-700/50 border-t-emerald-400 border-r-teal-400 rounded-full animate-spin`} />;
}

function DotsLoader() {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-2.5 h-2.5 bg-emerald-400 rounded-full bounce-dot" style={{ animationDelay: `${i * 0.16}s` }} />
      ))}
      <style jsx>{`
        .bounce-dot { animation: bounce-dot 1.4s ease-in-out infinite; }
        @keyframes bounce-dot { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
      `}</style>
    </div>
  );
}

function MissionStatement() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const cards = [
    { color: "emerald", title: "EVIDENCE-BASED", desc: "Every score derived from transparent AI analysis of actual bill text from the OpenStates policy database. No assumptions, no hallucinations." },
    { color: "teal", title: "PERSONALIZED", desc: "Analysis tailored to YOUR specific situation: location, housing, income, and energy decisions." },
    { color: "cyan", title: "ACTIONABLE", desc: "Not just information! Click on any of the bills in the list to view concrete next steps, eligibility criteria, and financial pathways." }
  ];

  return (
    <div ref={ref} className="mb-12 relative">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-400 to-cyan-400 rounded-full origin-top" style={{ opacity: visible ? 1 : 0, transform: visible ? "scaleY(1)" : "scaleY(0)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }} />
      <div className="pl-8 space-y-4">
        <div className="space-y-3" style={{ opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(-20px)", transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s" }}>
          <h2 className="text-2xl font-black text-white tracking-tight leading-tight">OUR MISSION</h2>
          <p className="text-lg text-white/90 leading-relaxed max-w-4xl">
            Climate action requires both <span className="font-black text-emerald-400">urgency</span> and{" "}
            <span className="font-black text-teal-400">precision</span>. This tool hopes to bridge the gap between
            complex climate policy and actionable decisions by quantifying what matters most: the{" "}
            <span className="font-black text-emerald-400">financial impact on your life</span> and the{" "}
            <span className="font-black text-teal-400">measurable environmental benefit</span> to our planet.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {cards.map((c, i) => (
            <div key={c.title} className={`group p-5 bg-zinc-900/50 border-2 border-${c.color}-500/20 rounded-xl hover:border-${c.color}-500/40 transition-all duration-500 hover:scale-[1.02] cursor-default`} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)", transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.3 + i * 0.1}s` }}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-2 h-2 bg-${c.color}-400 rounded-full animate-pulse`} style={{ animationDelay: `${i * 150}ms` }} />
                <h3 className={`text-sm font-black text-${c.color}-400 tracking-wide`}>{c.title}</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">{c.desc}</p>
            </div>
          ))}
        </div>
        <div className="pt-4 border-t-2 border-zinc-800 flex items-center justify-end" style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 0.6s" }}>
          <span className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs font-bold text-zinc-400 hover:border-zinc-600 transition-all">OPEN-SOURCE</span>
        </div>
      </div>
    </div>
  );
}

function UserProfileForm({ onSubmit, loading }: { onSubmit: (profile: UserProfile) => void; loading: boolean }) {
  const [formData, setFormData] = useState<UserProfile>({
    zip: "", state: "CT", housing_status: "Renter", property_type: "Apartment",
    can_make_upgrades: "Not sure", has_car: "Yes", next_vehicle_timeline: "1-3 years",
    utility_fuels: "No preference", job_sector: "", household_income: "Prefer not to say",
    household_size: "1-2 people", commute_distance: "Less than 10 miles", home_age: "Not sure",
    current_heating: "Not sure", interested_in_solar: "Maybe", own_business: "No",
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
      cyan: "border-cyan-400 shadow-cyan-500/20"
    };
    const focused = focusedField === key;
    return `w-full px-5 py-4 bg-zinc-900/50 border-2 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none transition-all duration-300 font-medium backdrop-blur-sm ${focused ? `${colors[color]} bg-zinc-900 shadow-lg scale-[1.02]` : "border-zinc-700/50 hover:border-zinc-600"}`;
  };

  const sections = ["location", "housing", "transport", "household"];

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      {/* Intro Banner */}
      <div className="relative p-8 bg-gradient-to-br from-emerald-500/[0.15] via-teal-500/[0.12] to-transparent border-l-4 border-emerald-400 rounded-r-2xl hover:border-emerald-300 transition-all duration-500 overflow-hidden group">
        <div className="absolute -left-1 top-8 bottom-8 w-1 bg-gradient-to-b from-emerald-400 to-teal-500 transition-all duration-500 group-hover:w-1.5" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative flex items-start gap-6">
          <div className="shrink-0 w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center transform -rotate-3 group-hover:rotate-0 group-hover:scale-110 transition-all duration-500 shadow-lg shadow-emerald-500/25">
            <svg className="w-8 h-8 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Evidence-Based Policy Analysis</h3>
            <p className="text-base text-white/85 leading-relaxed">Complete this profile to receive <span className="font-bold text-emerald-300">dual-impact scores</span> showing both your <span className="font-bold text-emerald-300">personal financial benefit</span> and the <span className="font-bold text-teal-300">climate impact</span> of each policy.</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-3 py-4">
        {sections.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all duration-500 ${completedSections.has(s) ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-zinc-950 scale-110 shadow-lg shadow-emerald-500/30" : "bg-zinc-800 text-zinc-500"}`}>
              {completedSections.has(s) ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : i + 1}
            </div>
            {i < 3 && <div className={`w-12 h-1 rounded-full transition-all duration-500 ${completedSections.has(s) ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-zinc-800"}`} />}
          </div>
        ))}
      </div>

      {/* Location */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-black text-white mb-6 flex items-center gap-3">
          <span className="w-1.5 h-8 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full" />Location
          {completedSections.has("location") && <span className="text-emerald-400">✓</span>}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="block space-y-2.5">
            <span className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              ZIP CODE
              <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-[10px] font-black rounded border border-red-500/30">REQUIRED</span>
            </span>
            <input type="text" value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} onFocus={() => setFocusedField("zip")} onBlur={() => setFocusedField(null)} placeholder="06511" className={getInputClass("zip")} required />
            <p className={`text-xs transition-colors ${focusedField === "zip" ? "text-emerald-400" : "text-zinc-500"}`}>Matches you to local policies</p>
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
            <p className={`text-xs transition-colors ${focusedField === "state" ? "text-teal-400" : "text-zinc-500"}`}>Bills are filtered by your state</p>
          </label>
        </div>
      </fieldset>

      {/* Housing */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-black text-white mb-6 flex items-center gap-3">
          <span className="w-1.5 h-8 bg-gradient-to-b from-teal-400 to-cyan-500 rounded-full" />Housing & Property
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
              <select value={formData[field.key as keyof UserProfile]} onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })} onFocus={() => setFocusedField(field.key)} onBlur={() => setFocusedField(null)} className={`${getInputClass(field.key, "teal")} appearance-none cursor-pointer`}>
                {field.options.map((opt) => <option key={opt} value={opt} className="bg-zinc-900">{opt}</option>)}
              </select>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Transportation */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-black text-white mb-6 flex items-center gap-3">
          <span className="w-1.5 h-8 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full" />Transportation
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
              <select value={formData[field.key as keyof UserProfile]} onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })} onFocus={() => setFocusedField(field.key)} onBlur={() => setFocusedField(null)} className={`${getInputClass(field.key, "cyan")} appearance-none cursor-pointer`}>
                {field.options.map((opt) => <option key={opt} value={opt} className="bg-zinc-900">{opt}</option>)}
              </select>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Household */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-black text-white mb-6 flex items-center gap-3">
          <span className="w-1.5 h-8 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full" />Household Details
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
              <select value={formData[field.key as keyof UserProfile]} onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })} onFocus={() => setFocusedField(field.key)} onBlur={() => setFocusedField(null)} className={`${getInputClass(field.key)} appearance-none cursor-pointer`}>
                {field.options.map((opt) => <option key={opt} value={opt} className="bg-zinc-900">{opt}</option>)}
              </select>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Job */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-black text-white mb-6 flex items-center gap-3">
          <span className="w-1.5 h-8 bg-gradient-to-b from-teal-400 to-cyan-500 rounded-full" />Career (Optional)
        </legend>
        <label className="block space-y-2.5">
          <span className="text-sm font-bold text-white tracking-wide">JOB / ROLE</span>
          <input type="text" value={formData.job_sector} onChange={(e) => setFormData({ ...formData, job_sector: e.target.value })} onFocus={() => setFocusedField("job_sector")} onBlur={() => setFocusedField(null)} placeholder="e.g., Student, Healthcare, Construction, Teacher" className={getInputClass("job_sector", "teal")} />
          <p className={`text-xs transition-colors ${focusedField === "job_sector" ? "text-teal-400" : "text-zinc-500"}`}>Some policies offer sector-specific benefits</p>
        </label>
      </fieldset>

      {/* Submit */}
      <button type="submit" disabled={loading} className="group relative w-full px-8 py-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-zinc-950 font-black text-lg rounded-2xl hover:shadow-2xl hover:shadow-emerald-500/30 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-20"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,white,transparent_70%)]" /></div>
        <div className="relative flex items-center justify-center gap-4">
          {loading ? <><DotsLoader /><span>ANALYZING POLICIES...(MAY TAKE 2-3 MINUTES)</span></> : <>
            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <span>FIND YOUR CLIMATE POLICIES</span>
            <svg className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </>}
        </div>
      </button>
      <p className="text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        Data processed locally • Never stored • Fully transparent methodology
      </p>
    </form>
  );
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

function ScoreMeter({ score, label, color, direction, descriptor }: { score: number; label: string; color: string; direction: string; descriptor?: string }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  useEffect(() => {
    let start: number, frame: number;
    const duration = 1200;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setAnimatedScore(eased * score);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    const timer = setTimeout(() => { frame = requestAnimationFrame(animate); }, 100);
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [score]);

  const percentage = (animatedScore / 10) * 100;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorKey = color === "climate" ? `climate-${direction}` : "personal";
  const colorMap: Record<string, { stroke: string; text: string; glow: string }> = {
    personal: { stroke: "#10b981", text: "text-emerald-400", glow: "rgba(16,185,129,0.5)" },
    "climate-positive": { stroke: "#14b8a6", text: "text-teal-400", glow: "rgba(20,184,166,0.5)" },
    "climate-negative": { stroke: "#f87171", text: "text-red-400", glow: "rgba(248,113,113,0.5)" },
    "climate-neutral": { stroke: "#a1a1aa", text: "text-zinc-400", glow: "rgba(161,161,170,0.3)" },
  };
  const colors = colorMap[colorKey] || colorMap.personal;

  return (
    <div className="flex items-center gap-4 group">
      <div className="relative w-24 h-24 transition-transform duration-300 group-hover:scale-105" style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }}>
        <svg className="w-24 h-24 transform -rotate-90">
          <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-zinc-800/50" />
          <circle cx="48" cy="48" r="40" fill="none" stroke={colors.stroke} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
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

function BillCard({ bill, onClick, index }: { bill: Bill; onClick: () => void; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  const statusStyles: Record<string, string> = {
    passed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
    enacted: "bg-blue-500/20 text-blue-300 border-blue-500/50",
    proposed: "bg-amber-500/20 text-amber-300 border-amber-500/50",
    vetoed: "bg-red-500/20 text-red-300 border-red-500/50",
  };

  const getCardBorder = () => {
    if (bill.personalScore >= 7 && bill.climateScore >= 7) return "border-emerald-400/60 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 shadow-emerald-500/10";
    if (bill.climateDirection === "negative") return "border-red-500/50 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 shadow-red-500/10";
    if (bill.personalScore >= 6) return "border-emerald-500/40 bg-emerald-500/5";
    return "border-zinc-700/50 bg-zinc-900/30";
  };

  return (
    <button onClick={onClick} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className={`group w-full text-left p-8 border-2 rounded-2xl hover:border-emerald-400/70 hover:shadow-xl transition-all duration-500 overflow-hidden backdrop-blur-sm ${getCardBorder()} card-fade-in`} style={{ animationDelay: `${index * 0.1}s` }}>
      <style jsx>{`
        .card-fade-in { opacity: 0; animation: fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative flex items-start justify-between gap-8 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="px-3 py-1.5 bg-zinc-800/80 text-white font-mono font-bold text-sm rounded-lg border border-zinc-700 group-hover:border-zinc-600 transition-colors">{bill.identifier}</span>
            <span className={`px-3 py-1.5 text-xs font-black rounded-lg border ${statusStyles[bill.status] || statusStyles.proposed} transition-all group-hover:scale-105`}>{bill.status.toUpperCase()}</span>
            {bill.personalScore >= 7 && bill.climateScore >= 7 && (
              <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 text-xs font-black rounded-lg border border-emerald-500/50 flex items-center gap-1.5" style={{ animation: "pulse-glow 2s ease-in-out infinite" }}>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                DUAL HIGH IMPACT
              </span>
            )}
          </div>
          <h3 className={`text-2xl font-black mb-4 leading-tight transition-colors duration-300 ${isHovered ? "text-emerald-400" : "text-white"}`}>{bill.title}</h3>
          <p className="text-sm text-zinc-400 line-clamp-2 mb-6 leading-relaxed group-hover:text-zinc-300 transition-colors">{bill.summary}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {bill.personalReasons.length > 0 && (
              <div className="space-y-2">
                <div className="font-black text-emerald-400 text-sm mb-3 tracking-wide flex items-center gap-2">💰 FOR YOU</div>
                {bill.personalReasons.map((reason, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-zinc-300 transition-all duration-300 group-hover:translate-x-1" style={{ transitionDelay: `${i * 50}ms` }}>
                    <span className="text-emerald-400 font-bold mt-0.5">→</span><span>{reason}</span>
                  </div>
                ))}
              </div>
            )}
            {bill.climateReasons.length > 0 && (
              <div className="space-y-2">
                <div className={`font-black text-sm mb-3 tracking-wide flex items-center gap-2 ${bill.climateDirection === "positive" ? "text-teal-400" : bill.climateDirection === "negative" ? "text-red-400" : "text-zinc-400"}`}>🌍 FOR CLIMATE</div>
                {bill.climateReasons.map((reason, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-zinc-300 transition-all duration-300 group-hover:translate-x-1" style={{ transitionDelay: `${i * 50}ms` }}>
                    <span className={`font-bold mt-0.5 ${bill.climateDirection === "positive" ? "text-teal-400" : bill.climateDirection === "negative" ? "text-red-400" : "text-zinc-400"}`}>→</span><span>{reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 space-y-6">
          <ScoreMeter score={bill.personalScore} label="Personal Financial" color="personal" direction={bill.personalDirection} descriptor={describePersonalFinancial(bill.personalScore)} />
          <ScoreMeter score={bill.climateScore} label="Climate" color="climate" direction={bill.climateDirection} descriptor={describeClimate(bill.climateScore, bill.climateDirection)} />
        </div>
      </div>
      <div className="relative flex items-center justify-between pt-4 border-t-2 border-zinc-800/50 group-hover:border-zinc-700/50 transition-colors">
        <div className="flex flex-wrap gap-2">
          {bill.tags.slice(0, 4).map((tag, i) => (
            <span key={tag} className="px-3 py-1 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-400 text-xs font-bold hover:border-zinc-600 hover:text-zinc-300 transition-all" style={{ transitionDelay: `${i * 30}ms` }}>{tag}</span>
          ))}
        </div>
        <span className="text-sm font-black text-zinc-500 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
          VIEW ANALYSIS
          <svg className={`w-5 h-5 transition-transform duration-300 ${isHovered ? "translate-x-1" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
        </span>
      </div>
      <style jsx>{`
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(16,185,129,0.2); } 50% { box-shadow: 0 0 40px rgba(16,185,129,0.4); } }
      `}</style>
    </button>
  );
}

function BillDetailModal({ bill, onClose, userProfile }: { bill: Bill; onClose: () => void; userProfile: UserProfile }) {
  const [analysis, setAnalysis] = useState<ComprehensiveAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "financial" | "climate" | "action">("overview");
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchData = async () => {
      setLoading(true); setError(null); setLoadingProgress(0);
      interval = setInterval(() => setLoadingProgress(p => Math.min(p + Math.random() * 15, 90)), 500);
      try {
        const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...userProfile, mode: "analyze_bill", billId: bill.id }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || data.details || "Failed to analyze bill");
        setLoadingProgress(100);
        setTimeout(() => { setAnalysis(data.analysis); setLoading(false); }, 300);
      } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to analyze bill"); setLoading(false); }
      finally { clearInterval(interval); }
    };
    fetchData();
    return () => clearInterval(interval);
  }, [bill.id, userProfile]);

  useEffect(() => { const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [onClose]);
  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = "unset"; }; }, []);

  const tabs = [{ id: "overview", label: "Overview", icon: "📋" }, { id: "financial", label: "Financial", icon: "💰" }, { id: "climate", label: "Climate", icon: "🌍" }, { id: "action", label: "Action Plan", icon: "⚡" }];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md modal-backdrop" onClick={onClose}>
      <style jsx>{`
        .modal-backdrop { animation: fadeIn 0.3s ease-out; }
        .modal-content { animation: modalSlideIn 0.4s cubic-bezier(0.16,1,0.3,1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideIn { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
      <div className="relative w-full max-w-6xl max-h-[92vh] overflow-hidden bg-zinc-950 border-2 border-zinc-800 rounded-3xl shadow-2xl modal-content" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-20 p-8 border-b-2 border-zinc-800 bg-zinc-950/98 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1.5 bg-zinc-800 text-white font-mono font-bold text-sm rounded-lg border border-zinc-700">{bill.identifier}</span>
                <span className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-xs font-black rounded-lg border border-zinc-700">{bill.status.toUpperCase()}</span>
              </div>
              <h2 className="text-3xl font-black text-white leading-tight mb-2">{bill.title}</h2>
              <p className="text-sm font-bold text-zinc-500">{bill.jurisdictionName}</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-zinc-800 rounded-xl transition-all hover:rotate-90 group" aria-label="Close">
              <svg className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex gap-8 p-6 bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl">
            <ScoreMeter score={bill.personalScore} label="Personal Financial" color="personal" direction={bill.personalDirection} descriptor={describePersonalFinancial(bill.personalScore)} />
            <ScoreMeter score={bill.climateScore} label="Climate" color="climate" direction={bill.climateDirection} descriptor={describeClimate(bill.climateScore, bill.climateDirection)} />
          </div>
          {!loading && !error && analysis && (
            <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`px-6 py-3 rounded-xl font-black text-sm whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 shadow-lg shadow-emerald-500/30 scale-105" : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white hover:scale-[1.02]"}`}>
                  <span className="mr-2">{tab.icon}</span>{tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(92vh-300px)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative w-32 h-32 mb-8">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-800" />
                  <circle cx="64" cy="64" r="56" fill="none" stroke="url(#loading-gradient)" strokeWidth="8" strokeLinecap="round" strokeDasharray={351.86} strokeDashoffset={351.86 - (loadingProgress / 100) * 351.86} className="transition-all duration-500" />
                  <defs><linearGradient id="loading-gradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#14b8a6" /></linearGradient></defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl font-black text-emerald-400">{Math.round(loadingProgress)}%</span></div>
              </div>
              <p className="text-white font-black text-xl mb-2">ANALYZING POLICY</p>
              <p className="text-zinc-500 text-sm mb-8">Comprehensive AI analysis in progress</p>
              <div className="space-y-3 w-full max-w-md">
                {[{ l: "Reading bill text", t: 20 }, { l: "Analyzing provisions", t: 40 }, { l: "Calculating personal impact", t: 60 }, { l: "Evaluating climate effects", t: 80 }, { l: "Generating recommendations", t: 95 }].map((step) => (
                  <div key={step.l} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${loadingProgress >= step.t ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-zinc-900/30 border border-zinc-800"}`} style={{ opacity: loadingProgress >= step.t - 15 ? 1 : 0.3, transform: loadingProgress >= step.t - 15 ? "translateX(0)" : "translateX(-10px)", transition: "all 0.3s" }}>
                    {loadingProgress >= step.t ? <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : loadingProgress >= step.t - 15 ? <LoadingSpinner size="sm" /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
                    <span className={`text-sm font-bold ${loadingProgress >= step.t ? "text-emerald-400" : "text-zinc-500"}`}>{step.l}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="inline-flex p-5 bg-red-500/20 rounded-full mb-6"><svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
              <p className="text-red-400 font-bold text-lg mb-2">Analysis Failed</p>
              <p className="text-zinc-500 text-sm mb-6">{error}</p>
              <button onClick={onClose} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all font-bold hover:scale-105">CLOSE</button>
            </div>
          ) : analysis ? (
            <div className="space-y-8">
              {activeTab === "overview" && <>
                <section className="p-6 bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all">
                  <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3"><span className="w-1 h-6 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full" />OVERVIEW</h3>
                  <p className="text-white/90 leading-relaxed mb-6">{analysis.overview.plain_english_summary}</p>
                  {analysis.overview.what_this_means_for_you && <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl mb-6 hover:bg-emerald-500/15 transition-colors"><div className="text-xs font-black text-emerald-400 mb-2">FOR YOU SPECIFICALLY</div><p className="text-sm text-white/90">{analysis.overview.what_this_means_for_you}</p></div>}
                  {analysis.overview.key_provisions.length > 0 && <><h4 className="text-sm font-black text-zinc-400 tracking-wide mb-3">KEY PROVISIONS</h4>{analysis.overview.key_provisions.map((item, i) => <div key={i} className="flex gap-3 text-sm text-zinc-300 p-3 bg-zinc-900/30 rounded-lg hover:bg-zinc-900/50 transition-all hover:translate-x-1 mb-2"><span className="text-emerald-400 font-bold shrink-0">{i + 1}.</span><span>{item}</span></div>)}</>}
                </section>
                {analysis.your_specific_situation && <section className="p-6 bg-blue-500/5 border-2 border-blue-500/20 rounded-2xl hover:border-blue-500/30 transition-all">
                  <h3 className="text-xl font-black text-blue-400 mb-6">🎯 YOUR SPECIFIC SITUATION</h3>
                  <p className="text-white/90 leading-relaxed mb-6">{analysis.your_specific_situation.relevance_to_you}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {analysis.your_specific_situation.provisions_that_apply_to_you.length > 0 && <div><h4 className="text-sm font-black text-emerald-400 mb-3">✓ APPLIES TO YOU</h4>{analysis.your_specific_situation.provisions_that_apply_to_you.map((item, i) => <div key={i} className="flex gap-2 text-sm text-white p-2 bg-emerald-500/5 rounded-lg hover:bg-emerald-500/10 transition-colors mb-1"><span className="text-emerald-400 font-bold shrink-0">✓</span><span>{item}</span></div>)}</div>}
                    {analysis.your_specific_situation.provisions_that_dont_apply.length > 0 && <div><h4 className="text-sm font-black text-zinc-400 mb-3">✗ DOESN&apos;T APPLY</h4>{analysis.your_specific_situation.provisions_that_dont_apply.map((item, i) => <div key={i} className="flex gap-2 text-sm text-zinc-400 p-2 bg-zinc-900/30 rounded-lg mb-1"><span className="font-bold shrink-0">✗</span><span>{item}</span></div>)}</div>}
                  </div>
                </section>}
              </>}
              {activeTab === "financial" && <>
                <section className="p-6 bg-emerald-500/5 border-2 border-emerald-500/20 rounded-2xl hover:border-emerald-500/30 transition-all">
                  <h3 className="text-xl font-black text-emerald-400 mb-6">💰 FINANCIAL IMPACT</h3>
                  {analysis.financial_impact_for_you?.bottom_line && <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl mb-6"><div className="text-xs font-black text-emerald-400 mb-1">BOTTOM LINE</div><p className="text-sm text-white">{analysis.financial_impact_for_you.bottom_line}</p></div>}
                  {analysis.personalized_financial_analysis.direct_benefits.length > 0 && <><h4 className="text-sm font-black text-emerald-400 mb-3">DIRECT BENEFITS</h4><div className="space-y-2 mb-6">{analysis.personalized_financial_analysis.direct_benefits.map((item, i) => <div key={i} className="flex gap-2 text-sm text-white p-3 bg-emerald-500/5 rounded-lg hover:bg-emerald-500/10 transition-all hover:translate-x-1"><span className="text-emerald-400 font-bold shrink-0">→</span><span>{item}</span></div>)}</div></>}
                  {analysis.personalized_financial_analysis.estimated_value && <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl"><div className="text-xs font-black text-emerald-400 mb-1">ESTIMATED VALUE</div><div className="text-sm text-white">{analysis.personalized_financial_analysis.estimated_value}</div></div>}
                </section>
                {analysis.eligibility_and_requirements?.your_eligibility_assessment && <section className="p-6 bg-purple-500/5 border-2 border-purple-500/20 rounded-2xl"><h3 className="text-xl font-black text-purple-400 mb-6">✓ ELIGIBILITY</h3><h4 className="text-sm font-black text-purple-400 mb-3">YOUR ELIGIBILITY</h4><div className="space-y-2">{analysis.eligibility_and_requirements.your_eligibility_assessment.map((item, i) => <div key={i} className="flex gap-2 text-sm text-white p-3 bg-purple-500/5 rounded-lg hover:bg-purple-500/10 transition-all hover:translate-x-1"><span className="text-purple-400 font-bold shrink-0">→</span><span>{item}</span></div>)}</div></section>}
              </>}
              {activeTab === "climate" && <>
                <section className="p-6 bg-teal-500/5 border-2 border-teal-500/20 rounded-2xl hover:border-teal-500/30 transition-all">
                  <h3 className="text-xl font-black text-teal-400 mb-6">🌍 CLIMATE IMPACT</h3>
                  {analysis.personalized_climate_analysis.environmental_benefits.length > 0 && <><h4 className="text-sm font-black text-teal-400 mb-3">ENVIRONMENTAL BENEFITS</h4><div className="space-y-2 mb-6">{analysis.personalized_climate_analysis.environmental_benefits.map((item, i) => <div key={i} className="flex gap-2 text-sm text-white p-3 bg-teal-500/5 rounded-lg hover:bg-teal-500/10 transition-all hover:translate-x-1"><span className="text-teal-400 font-bold shrink-0">→</span><span>{item}</span></div>)}</div></>}
                  {analysis.personalized_climate_analysis.scale_and_scope && <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl"><div className="text-xs font-black text-teal-400 mb-1">SCALE & SCOPE</div><div className="text-sm text-white">{analysis.personalized_climate_analysis.scale_and_scope}</div></div>}
                </section>
                {analysis.local_and_regional_impact?.your_area_specifically && analysis.local_and_regional_impact.your_area_specifically.length > 0 && <section className="p-6 bg-cyan-500/5 border-2 border-cyan-500/20 rounded-2xl"><h3 className="text-xl font-black text-cyan-400 mb-6">📍 LOCAL IMPACT</h3><h4 className="text-sm font-black text-cyan-400 mb-3">IN YOUR AREA</h4><div className="space-y-2">{analysis.local_and_regional_impact.your_area_specifically.map((item, i) => <div key={i} className="flex gap-2 text-sm text-white p-3 bg-cyan-500/5 rounded-lg hover:bg-cyan-500/10 transition-all hover:translate-x-1"><span className="text-cyan-400 font-bold shrink-0">→</span><span>{item}</span></div>)}</div></section>}
              </>}
              {activeTab === "action" && <>
                <section className="p-6 bg-blue-500/5 border-2 border-blue-500/20 rounded-2xl">
                  <h3 className="text-xl font-black text-blue-400 mb-6">⚡ ACTION PLAN</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {analysis.action_plan.immediate_steps.length > 0 && <div><h4 className="text-sm font-black text-blue-400 mb-3">DO NOW</h4>{analysis.action_plan.immediate_steps.map((step, i) => <div key={i} className="flex gap-2 text-sm text-white p-3 bg-blue-500/5 rounded-lg mb-2 hover:bg-blue-500/10 transition-all hover:translate-x-1"><span className="text-blue-400 font-black shrink-0">{i + 1}.</span><span>{step}</span></div>)}</div>}
                    {analysis.action_plan.medium_term_steps.length > 0 && <div><h4 className="text-sm font-black text-cyan-400 mb-3">DO SOON</h4>{analysis.action_plan.medium_term_steps.map((step, i) => <div key={i} className="flex gap-2 text-sm text-white p-3 bg-cyan-500/5 rounded-lg mb-2 hover:bg-cyan-500/10 transition-all hover:translate-x-1"><span className="text-cyan-400 font-black shrink-0">{i + 1}.</span><span>{step}</span></div>)}</div>}
                    {analysis.action_plan.long_term_considerations.length > 0 && <div><h4 className="text-sm font-black text-teal-400 mb-3">PLAN AHEAD</h4>{analysis.action_plan.long_term_considerations.map((item, i) => <div key={i} className="flex gap-2 text-sm text-white p-3 bg-teal-500/5 rounded-lg mb-2 hover:bg-teal-500/10 transition-all hover:translate-x-1"><span className="text-teal-400 font-bold shrink-0">→</span><span>{item}</span></div>)}</div>}
                  </div>
                </section>
                {analysis.common_questions_answered && <section className="p-6 bg-amber-500/5 border-2 border-amber-500/20 rounded-2xl">
                  <h3 className="text-xl font-black text-amber-400 mb-6">❓ COMMON QUESTIONS</h3>
                  <div className="space-y-4">
                    {Object.entries(analysis.common_questions_answered).filter(([key, value]) => key !== "other_important_questions" && typeof value === "string" && value !== "Not specified").map(([key, value]) => (
                      <div key={key} className="p-4 bg-amber-500/5 rounded-lg hover:bg-amber-500/10 transition-colors">
                        <h4 className="text-sm font-black text-amber-400 mb-2">{key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}?</h4>
                        <p className="text-sm text-white/90">{value as string}</p>
                      </div>
                    ))}
                  </div>
                </section>}
              </>}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [step, setStep] = useState<"form" | "results">("form");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [userState, setUserState] = useState<string>("");
  const [sortBy, setSortBy] = useState<"rank" | "personal" | "climate">("rank");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  async function handleSubmit(profile: UserProfile) {
    setLoading(true);
    setUserProfile(profile);
    setUserState(profile.state);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, mode: "find_bills" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch bills");
      }

      setBills(data.bills || []);
      setStep("results");
    } catch (error: unknown) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  const sortedBills = [...bills].sort((a, b) => {
    if (sortBy === "personal") return b.personalScore - a.personalScore;
    if (sortBy === "climate") return b.climateScore - a.climateScore;
    return 0;
  });

  const filteredBills = filterStatus === "all" ? sortedBills : sortedBills.filter(bill => bill.status === filterStatus);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <GeometricPattern />
      {step === "form" ? (
        <div className="relative min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-5xl">
            <div className="mb-12 text-center">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-blue-500/10 border-2 border-blue-400/30 rounded-full mb-8 hover:bg-blue-500/15 transition-all duration-300 hover:scale-105">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                <span className="text-sm font-black text-blue-300 tracking-wide">CURRENTLY FOR CONNECTICUT AND CALIFORNIA RESIDENTS ONLY</span>
              </div>
              <h1 className="text-7xl font-black mb-6 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent leading-none tracking-tighter title-gradient">
                CLIMATE<br />IMPACT<br />COMPASS
              </h1>
              <style jsx>{`
                .title-gradient { animation: gradient-x 3s ease infinite; background-size: 200% 200%; }
                @keyframes gradient-x { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
              `}</style>
              <p className="text-zinc-400 text-lg mb-3 font-bold">Evidence-based policy analysis tool by <span className="text-emerald-400">Leo Levitt</span></p>
            </div>
            <MissionStatement />
            <div className="p-10 bg-zinc-900/50 border-2 border-zinc-800 rounded-3xl backdrop-blur-xl hover:border-zinc-700 transition-all duration-300 shadow-2xl">
              <UserProfileForm onSubmit={handleSubmit} loading={loading} />
            </div>
            <div className="mt-8 p-6 bg-zinc-900/30 border-2 border-zinc-800 rounded-2xl">
              <p className="text-sm text-zinc-500 text-center"><span className="font-black text-white">METHODOLOGY:</span> Dual-impact scoring measures both personal financial benefit and climate impact (including indirect effects like barrier removal and market acceleration). All analysis uses transparent AI frameworks with strict no-hallucination safeguards.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative p-6 md:p-10">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10">
              <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                  <h1 className="text-5xl font-black text-white mb-3 tracking-tight">YOUR {STATE_NAMES[userState] || userState} POLICIES</h1>
                  <p className="text-zinc-500 text-lg font-bold">{filteredBills.length} {filteredBills.length === 1 ? "policy" : "policies"} • Sorted by {sortBy === "rank" ? "relevance" : sortBy === "personal" ? "personal benefit" : "climate impact"} • Filtered to {STATE_NAMES[userState] || userState} only</p>
                </div>
                <button onClick={() => { setStep("form"); setSelectedBill(null); }} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all duration-300 font-black border-2 border-zinc-700 hover:border-zinc-600 hover:scale-105 active:scale-95">← CHANGE PROFILE</button>
              </div>
              <div className="flex gap-4 items-center mb-6 flex-wrap">
                <div className="flex gap-2">
                  {(["rank", "personal", "climate"] as const).map(s => (
                    <button key={s} onClick={() => setSortBy(s)} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 ${sortBy === s ? (s === "climate" ? "bg-teal-500 text-zinc-950" : "bg-emerald-500 text-zinc-950") : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                      {s === "rank" ? "RELEVANCE" : s === "personal" ? "💰 PERSONAL" : "🌍 CLIMATE"}
                    </button>
                  ))}
                </div>
                <div className="h-8 w-px bg-zinc-700" />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg font-bold text-sm text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer">
                  <option value="all">ALL STATUS</option>
                  <option value="passed">PASSED</option>
                  <option value="enacted">ENACTED</option>
                  <option value="proposed">PROPOSED</option>
                  <option value="vetoed">VETOED</option>
                </select>
              </div>
              <div className="p-6 bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl">
                <p className="text-sm text-zinc-400"><span className="font-black text-white">SCORING:</span> Personal Financial Benefit measures YOUR potential savings and rebates. Climate Impact recognizes both direct emissions reductions and indirect benefits (barrier removal, market acceleration, workforce development).</p>
              </div>
            </div>
            {loading ? (
              <div className="space-y-6">{[0, 1, 2].map(i => <BillCardSkeleton key={i} index={i} />)}</div>
            ) : filteredBills.length > 0 ? (
              <div className="space-y-6">{filteredBills.map((bill, index) => <BillCard key={bill.id} bill={bill} onClick={() => setSelectedBill(bill)} index={index} />)}</div>
            ) : (
              <div className="text-center py-20">
                <div className="inline-flex p-4 bg-amber-500/20 rounded-full mb-4"><svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
                <p className="text-zinc-400 text-lg font-bold mb-2">No policies found for {STATE_NAMES[userState] || userState}</p>
                <p className="text-zinc-500 text-sm">This state may not have climate policies in our database yet, or no policies match your profile.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {selectedBill && userProfile && <BillDetailModal bill={selectedBill} onClose={() => setSelectedBill(null)} userProfile={userProfile} />}
    </div>
  );
}