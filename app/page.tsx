"use client";

import React, { useState } from 'react';

// Types matching enhanced backend
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
  jurisdictionName: string;
  status: string;
  dateIntroduced: string | null;
  tags: string[];
  sources?: Array<{ url: string; name: string | null }>;
};

type ComprehensiveAnalysis = {
  overview: {
    plain_english_summary: string;
    key_provisions: string[];
    timeline: string;
    implementation_status: string;
  };
  personalized_financial_analysis: {
    direct_benefits: string[];
    eligibility_factors: string[];
    estimated_value: string;
    access_pathway: string[];
    barriers: string[];
  };
  personalized_climate_analysis: {
    environmental_benefits: string[];
    local_impact: string[];
    personal_contribution: string[];
    scale_and_scope: string;
  };
  detailed_requirements: {
    who_qualifies: string[];
    documentation_needed: string[];
    income_limits: string;
    other_restrictions: string[];
  };
  certainties_and_uncertainties: {
    what_is_certain: string[];
    what_depends_on_implementation: string[];
    missing_information: string[];
    risks_and_caveats: string[];
  };
  action_plan: {
    immediate_steps: string[];
    medium_term_steps: string[];
    long_term_considerations: string[];
    questions_to_ask: string[];
  };
  local_context: {
    local_programs: string[];
    local_considerations: string[];
    community_resources: string[];
  };
};

// Unique geometric patterns for visual interest
function GeometricPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.015]">
      <div className="absolute top-0 left-1/4 w-96 h-96 border-2 border-emerald-400 rotate-45 rounded-3xl" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 border-2 border-teal-400 -rotate-12 rounded-2xl" />
      <div className="absolute top-1/3 right-1/3 w-64 h-64 border border-cyan-400 rotate-[60deg] rounded-3xl" />
    </div>
  );
}

// Mission Statement Component
function MissionStatement() {
  return (
    <div className="mb-12 relative">
      {/* Accent Line */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-400 to-cyan-400 rounded-full" />
      
      <div className="pl-8 space-y-4">
        {/* Main Mission */}
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
            OUR MISSION
          </h2>
          <p className="text-lg text-white/90 leading-relaxed max-w-4xl">
            Climate action requires both <span className="font-black text-emerald-400">urgency</span> and{' '}
            <span className="font-black text-teal-400">precision</span>. This tool hopes to bridge the gap between 
            complex climate policy and actionable decisions by quantifying what matters most: 
            the <span className="font-black text-emerald-400">financial impact on your life</span> and 
            the <span className="font-black text-teal-400">measurable environmental benefit</span> to our planet.
          </p>
        </div>

        {/* Key Principles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-5 bg-zinc-900/50 border-2 border-emerald-500/20 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              <h3 className="text-sm font-black text-emerald-400 tracking-wide">EVIDENCE-BASED</h3>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Every score derived from transparent AI analysis of actual bill text from the OpenStates policy database. No assumptions, no hallucinations.
            </p>
          </div>

          <div className="p-5 bg-zinc-900/50 border-2 border-teal-500/20 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-teal-400 rounded-full" />
              <h3 className="text-sm font-black text-teal-400 tracking-wide">PERSONALIZED</h3>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Analysis tailored to YOUR specific situation: location, housing, income, and energy decisions.
            </p>
          </div>

          <div className="p-5 bg-zinc-900/50 border-2 border-cyan-500/20 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full" />
              <h3 className="text-sm font-black text-cyan-400 tracking-wide">ACTIONABLE</h3>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Not just information! Click on any of the bills in the list to view concrete next steps, eligibility criteria, and financial pathways.
            </p>
          </div>
        </div>

        {/* Creator Attribution */}
        <div className="pt-4 border-t-2 border-zinc-800 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
          </p>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs font-bold text-zinc-400">
              OPEN-SOURCE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Components
function UserProfileForm({ onSubmit, loading }: { onSubmit: (profile: UserProfile) => void; loading: boolean }) {
  const [formData, setFormData] = useState<UserProfile>({
    zip: '',
    state: 'CT',
    housing_status: 'Renter',
    property_type: 'Apartment',
    can_make_upgrades: 'Not sure',
    has_car: 'Yes',
    next_vehicle_timeline: '1-3 years',
    utility_fuels: 'No preference',
    job_sector: '',
    household_income: 'Prefer not to say',
    household_size: '1-2 people',
    commute_distance: 'Less than 10 miles',
    home_age: 'Not sure',
    current_heating: 'Not sure',
    interested_in_solar: 'Maybe',
    own_business: 'No',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      {/* Intro Banner */}
      <div className="relative p-8 bg-gradient-to-br from-emerald-500/[0.15] via-teal-500/[0.12] to-transparent border-l-4 border-emerald-400 rounded-r-2xl">
        <div className="absolute -left-1 top-8 bottom-8 w-1 bg-gradient-to-b from-emerald-400 to-teal-500" />
        <div className="flex items-start gap-6">
          <div className="shrink-0 w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center transform -rotate-3">
            <svg className="w-8 h-8 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Evidence-Based Policy Analysis</h3>
            <p className="text-base text-white/85 leading-relaxed mb-4">
              Complete this profile to receive <span className="font-bold text-emerald-300">dual-impact scores</span> showing 
              both your <span className="font-bold text-emerald-300">personal financial benefit</span> and the <span className="font-bold text-teal-300">climate impact</span> of each policy.
            </p>
            <div className="flex flex-wrap gap-2">
            </div>
          </div>
        </div>
      </div>

      {/* Location */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-black text-white mb-6 flex items-center gap-3">
          <span className="w-1.5 h-8 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full" />
          Location
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="block space-y-2.5">
            <span className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              ZIP CODE
              <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-[10px] font-black rounded border border-red-500/30">REQUIRED</span>
            </span>
            <input
              type="text"
              value={formData.zip}
              onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              placeholder="06511"
              className="w-full px-5 py-4 bg-zinc-900/50 border-2 border-zinc-700/50 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400 focus:bg-zinc-900 transition-all font-medium"
              required
            />
            <p className="text-xs text-zinc-500">Matches you to local policies</p>
          </label>

          <label className="block space-y-2.5">
            <span className="text-sm font-bold text-white tracking-wide">STATE</span>
            <select
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-5 py-4 bg-zinc-900/50 border-2 border-zinc-700/50 rounded-xl text-white focus:outline-none focus:border-teal-400 focus:bg-zinc-900 transition-all appearance-none cursor-pointer font-medium"
            >
              <option value="CT" className="bg-zinc-900">Connecticut</option>
              <option value="CA" className="bg-zinc-900 text-zinc-500">California (Coming Soon)</option>
            </select>
            <p className="text-xs text-zinc-500">Currently analyzing CT policies</p>
          </label>
        </div>
      </fieldset>

      {/* Housing */}
      <fieldset className="space-y-6">
        <legend className="text-xl font-black text-white mb-6 flex items-center gap-3">
          <span className="w-1.5 h-8 bg-gradient-to-b from-teal-400 to-cyan-500 rounded-full" />
          Housing & Property
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { key: 'housing_status', label: 'Housing Status', options: ['Renter', 'Owner', 'Other'] },
            { key: 'property_type', label: 'Property Type', options: ['Apartment', 'Single-family home', 'Multi-family home', 'Condo', 'Other'] },
            { key: 'can_make_upgrades', label: 'Can Make Upgrades?', options: ['Yes', 'No', 'Not sure'] },
            { key: 'home_age', label: 'Home Age', options: ['Not sure', 'Less than 10 years', '10-30 years', '30-50 years', 'More than 50 years'] },
            { key: 'current_heating', label: 'Current Heating', options: ['Not sure', 'Natural gas', 'Oil', 'Electric resistance', 'Heat pump (already efficient!)', 'Propane'] },
            { key: 'interested_in_solar', label: 'Solar Interest', options: ['Maybe', 'Yes, very interested', 'No, not feasible', 'Already have solar'] },
          ].map((field) => (
            <label key={field.key} className="block space-y-2.5">
              <span className="text-sm font-bold text-white tracking-wide">{field.label.toUpperCase()}</span>
              <select
                value={formData[field.key as keyof UserProfile]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full px-5 py-4 bg-zinc-900/50 border-2 border-zinc-700/50 rounded-xl text-white focus:outline-none focus:border-teal-400 focus:bg-zinc-900 transition-all appearance-none cursor-pointer font-medium"
              >
                {field.options.map(opt => (
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
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { key: 'has_car', label: 'Have a Car?', options: ['Yes', 'No'] },
            { key: 'next_vehicle_timeline', label: 'Next Vehicle Decision', options: ['0-12 months', '1-3 years', '3-10 years', '10+ years'] },
            { key: 'utility_fuels', label: 'Vehicle Preference', options: ['No preference', 'Electric only', 'Hybrid', 'Gas'] },
            { key: 'commute_distance', label: 'Commute Distance', options: ['Less than 10 miles', '10-25 miles', '25-50 miles', 'More than 50 miles', 'Work from home'] },
          ].map((field) => (
            <label key={field.key} className="block space-y-2.5">
              <span className="text-sm font-bold text-white tracking-wide">{field.label.toUpperCase()}</span>
              <select
                value={formData[field.key as keyof UserProfile]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full px-5 py-4 bg-zinc-900/50 border-2 border-zinc-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:bg-zinc-900 transition-all appearance-none cursor-pointer font-medium"
              >
                {field.options.map(opt => (
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
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { key: 'household_income', label: 'Household Income', options: ['Prefer not to say', 'Under $50,000', '$50,000 - $100,000', '$100,000 - $150,000', 'Over $150,000'] },
            { key: 'household_size', label: 'Household Size', options: ['1-2 people', '3-4 people', '5+ people'] },
            { key: 'own_business', label: 'Own Business?', options: ['No', 'Yes'] },
          ].map((field) => (
            <label key={field.key} className="block space-y-2.5">
              <span className="text-sm font-bold text-white tracking-wide">{field.label.toUpperCase()}</span>
              <select
                value={formData[field.key as keyof UserProfile]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full px-5 py-4 bg-zinc-900/50 border-2 border-zinc-700/50 rounded-xl text-white focus:outline-none focus:border-emerald-400 focus:bg-zinc-900 transition-all appearance-none cursor-pointer font-medium"
              >
                {field.options.map(opt => (
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
          <input
            type="text"
            value={formData.job_sector}
            onChange={(e) => setFormData({ ...formData, job_sector: e.target.value })}
            placeholder="e.g., Student, Healthcare, Construction, Teacher"
            className="w-full px-5 py-4 bg-zinc-900/50 border-2 border-zinc-700/50 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-teal-400 focus:bg-zinc-900 transition-all font-medium"
          />
          <p className="text-xs text-zinc-500">Some policies offer sector-specific benefits</p>
        </label>
      </fieldset>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="group relative w-full px-8 py-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-zinc-950 font-black text-lg rounded-2xl hover:shadow-2xl hover:shadow-emerald-500/30 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex items-center justify-center gap-4">
          {loading ? (
            <>
              <div className="w-6 h-6 border-3 border-zinc-900/20 border-t-zinc-900 rounded-full animate-spin" />
              <span>ANALYZING POLICIES...</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>FIND YOUR CLIMATE POLICIES</span>
            </>
          )}
        </div>
      </button>

      <p className="text-center text-xs text-zinc-500">
        🔒 Data processed locally • Never stored • Fully transparent methodology
      </p>
    </form>
  );
}

function ScoreMeter({ score, label, color, direction }: { score: number; label: string; color: string; direction: string }) {
  const percentage = (score / 10) * 100;
  
  const colorMap: Record<string, { gradient: string; text: string; shadow: string }> = {
    personal: { gradient: 'from-emerald-400 to-emerald-500', text: 'text-emerald-400', shadow: 'shadow-emerald-500/40' },
    'climate-positive': { gradient: 'from-teal-400 to-cyan-500', text: 'text-teal-400', shadow: 'shadow-teal-500/40' },
    'climate-negative': { gradient: 'from-red-400 to-orange-500', text: 'text-red-400', shadow: 'shadow-red-500/40' },
    'climate-neutral': { gradient: 'from-zinc-400 to-zinc-500', text: 'text-zinc-400', shadow: 'shadow-zinc-500/40' },
  };

  const colorKey = color === 'climate' 
    ? `climate-${direction}` 
    : 'personal';
  
  const colors = colorMap[colorKey] || colorMap.personal;

  return (
    <div className="flex items-center gap-4">
      <div className={`relative w-24 h-24 rounded-full ${colors.shadow} shadow-lg`}>
        <svg className="w-24 h-24 transform -rotate-90">
          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="none" className="text-zinc-800" />
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="url(#gradient)"
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${percentage * 2.513} 251.3`}
            className="transition-all duration-1000 ease-out"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%">
              <stop offset="0%" className={colors.gradient.split(' ')[0].replace('from-', 'text-')} stopColor="currentColor" />
              <stop offset="100%" className={colors.gradient.split(' ')[1].replace('to-', 'text-')} stopColor="currentColor" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-black ${colors.text}`}>{score.toFixed(1)}</span>
        </div>
      </div>
      <div>
        <div className="text-sm font-black text-white tracking-wide">{label.toUpperCase()}</div>
        <div className="text-xs text-zinc-500 font-bold">0-10 SCALE</div>
      </div>
    </div>
  );
}

function BillCard({ bill, onClick }: { bill: Bill; onClick: () => void }) {
  const statusStyles: Record<string, string> = {
    passed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    enacted: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    proposed: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    vetoed: 'bg-red-500/20 text-red-300 border-red-500/50'
  };

  const getCardBorder = () => {
    if (bill.personalScore >= 7 && bill.climateScore >= 7) return 'border-emerald-400/60 bg-emerald-500/5';
    if (bill.climateDirection === 'negative') return 'border-red-500/50 bg-red-500/5';
    if (bill.personalScore >= 6) return 'border-emerald-500/40 bg-emerald-500/5';
    return 'border-zinc-700/50 bg-zinc-900/30';
  };

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left p-8 border-2 rounded-2xl hover:border-emerald-400/70 hover:bg-zinc-900/50 transition-all ${getCardBorder()}`}
    >
      <div className="flex items-start justify-between gap-8 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="px-3 py-1.5 bg-zinc-800/80 text-white font-mono font-bold text-sm rounded-lg border border-zinc-700">
              {bill.identifier}
            </span>
            <span className={`px-3 py-1.5 text-xs font-black rounded-lg border ${statusStyles[bill.status] || statusStyles.proposed}`}>
              {bill.status.toUpperCase()}
            </span>
            {bill.personalScore >= 7 && bill.climateScore >= 7 && (
              <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 text-xs font-black rounded-lg border border-emerald-500/50">
                ⭐ DUAL HIGH IMPACT
              </span>
            )}
          </div>
          
          <h3 className="text-2xl font-black text-white mb-4 group-hover:text-emerald-400 transition-colors leading-tight">
            {bill.title}
          </h3>
          
          <p className="text-sm text-zinc-400 line-clamp-2 mb-6 leading-relaxed">{bill.summary}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {bill.personalReasons.length > 0 && (
              <div className="space-y-2">
                <div className="font-black text-emerald-400 text-sm mb-3 tracking-wide">💰 FOR YOU</div>
                {bill.personalReasons.map((reason, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-emerald-400 font-bold mt-0.5">→</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}
            
            {bill.climateReasons.length > 0 && (
              <div className="space-y-2">
                <div className={`font-black text-sm mb-3 tracking-wide ${
                  bill.climateDirection === 'positive' ? 'text-teal-400' :
                  bill.climateDirection === 'negative' ? 'text-red-400' : 'text-zinc-400'
                }`}>
                  🌍 FOR CLIMATE
                </div>
                {bill.climateReasons.map((reason, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className={`font-bold mt-0.5 ${
                      bill.climateDirection === 'positive' ? 'text-teal-400' :
                      bill.climateDirection === 'negative' ? 'text-red-400' : 'text-zinc-400'
                    }`}>→</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="shrink-0 space-y-6">
          <ScoreMeter score={bill.personalScore} label="Personal" color="personal" direction={bill.personalDirection} />
          <ScoreMeter score={bill.climateScore} label="Climate" color="climate" direction={bill.climateDirection} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t-2 border-zinc-800">
        <div className="flex flex-wrap gap-2">
          {bill.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="px-3 py-1 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-400 text-xs font-bold">
              {tag}
            </span>
          ))}
        </div>
        <span className="text-sm font-black text-zinc-500 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
          VIEW ANALYSIS
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </div>
    </button>
  );
}

function BillDetailModal({ bill, onClose, userProfile }: { bill: Bill; onClose: () => void; userProfile: UserProfile }) {
  const [analysis, setAnalysis] = useState<ComprehensiveAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    async function analyze() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...userProfile,
            mode: 'analyze_bill',
            billId: bill.id
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.details || 'Failed to analyze bill');
        }

        setAnalysis(data.analysis);
      } catch (error: any) {
        setError(error.message || 'Failed to analyze bill');
      } finally {
        setLoading(false);
      }
    }

    analyze();
  }, [bill.id, userProfile]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95" onClick={onClose}>
      <div className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-zinc-950 border-2 border-zinc-800 rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-20 p-8 border-b-2 border-zinc-800 bg-zinc-950/98 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1.5 bg-zinc-800 text-white font-mono font-bold text-sm rounded-lg border border-zinc-700">
                  {bill.identifier}
                </span>
                <span className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-xs font-black rounded-lg border border-zinc-700">
                  {bill.status.toUpperCase()}
                </span>
              </div>
              <h2 className="text-3xl font-black text-white leading-tight mb-2">{bill.title}</h2>
              <p className="text-sm font-bold text-zinc-500">{bill.jurisdictionName}</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex gap-8 p-6 bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl">
            <ScoreMeter score={bill.personalScore} label="Personal" color="personal" direction={bill.personalDirection} />
            <ScoreMeter score={bill.climateScore} label="Climate" color="climate" direction={bill.climateDirection} />
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-zinc-800 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-t-emerald-400 rounded-full animate-spin" />
              </div>
              <p className="text-white font-black text-lg mb-2">ANALYZING POLICY...</p>
              <p className="text-zinc-500 text-sm">Comprehensive AI analysis in progress</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="inline-flex p-4 bg-red-500/20 rounded-full mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-400 font-bold mb-4">{error}</p>
              <button 
                onClick={onClose}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition font-bold"
              >
                CLOSE
              </button>
            </div>
          ) : analysis ? (
            <div className="space-y-8">
              {/* Overview */}
              <section className="p-6 bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl">
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                  <span className="w-1 h-6 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full" />
                  OVERVIEW
                </h3>
                <p className="text-white/90 leading-relaxed mb-6">{analysis.overview.plain_english_summary}</p>
                {analysis.overview.key_provisions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-zinc-400 tracking-wide mb-3">KEY PROVISIONS</h4>
                    {analysis.overview.key_provisions.map((item, i) => (
                      <div key={i} className="flex gap-3 text-sm text-zinc-300">
                        <span className="text-emerald-400 font-bold">→</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Financial & Climate side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="p-6 bg-emerald-500/5 border-2 border-emerald-500/20 rounded-2xl">
                  <h3 className="text-xl font-black text-emerald-400 mb-6">💰 FINANCIAL IMPACT</h3>
                  {analysis.personalized_financial_analysis.direct_benefits.length > 0 && (
                    <div className="space-y-3 mb-6">
                      {analysis.personalized_financial_analysis.direct_benefits.map((item, i) => (
                        <div key={i} className="flex gap-2 text-sm text-white">
                          <span className="text-emerald-400 font-bold">→</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {analysis.personalized_financial_analysis.estimated_value && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                      <div className="text-xs font-black text-emerald-400 mb-1">ESTIMATED VALUE</div>
                      <div className="text-sm text-white">{analysis.personalized_financial_analysis.estimated_value}</div>
                    </div>
                  )}
                </section>

                <section className="p-6 bg-teal-500/5 border-2 border-teal-500/20 rounded-2xl">
                  <h3 className="text-xl font-black text-teal-400 mb-6">🌍 CLIMATE IMPACT</h3>
                  {analysis.personalized_climate_analysis.environmental_benefits.length > 0 && (
                    <div className="space-y-3 mb-6">
                      {analysis.personalized_climate_analysis.environmental_benefits.map((item, i) => (
                        <div key={i} className="flex gap-2 text-sm text-white">
                          <span className="text-teal-400 font-bold">→</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {analysis.personalized_climate_analysis.scale_and_scope && (
                    <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl">
                      <div className="text-xs font-black text-teal-400 mb-1">SCALE & SCOPE</div>
                      <div className="text-sm text-white">{analysis.personalized_climate_analysis.scale_and_scope}</div>
                    </div>
                  )}
                </section>
              </div>

              {/* Action Plan */}
              {analysis.action_plan.immediate_steps.length > 0 && (
                <section className="p-6 bg-blue-500/5 border-2 border-blue-500/20 rounded-2xl">
                  <h3 className="text-xl font-black text-blue-400 mb-6">⚡ ACTION PLAN</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {analysis.action_plan.immediate_steps.length > 0 && (
                      <div>
                        <h4 className="text-sm font-black text-blue-400 mb-3">IMMEDIATE</h4>
                        <div className="space-y-2">
                          {analysis.action_plan.immediate_steps.map((step, i) => (
                            <div key={i} className="flex gap-2 text-sm text-white">
                              <span className="text-blue-400 font-black">{i + 1}.</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.action_plan.medium_term_steps.length > 0 && (
                      <div>
                        <h4 className="text-sm font-black text-cyan-400 mb-3">MEDIUM-TERM</h4>
                        <div className="space-y-2">
                          {analysis.action_plan.medium_term_steps.map((step, i) => (
                            <div key={i} className="flex gap-2 text-sm text-white">
                              <span className="text-cyan-400 font-black">{i + 1}.</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.action_plan.long_term_considerations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-black text-teal-400 mb-3">LONG-TERM</h4>
                        <div className="space-y-2">
                          {analysis.action_plan.long_term_considerations.map((item, i) => (
                            <div key={i} className="flex gap-2 text-sm text-white">
                              <span className="text-teal-400 font-bold">→</span>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

export default function Page() {
  const [step, setStep] = useState<'form' | 'results'>('form');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  async function handleSubmit(profile: UserProfile) {
    setLoading(true);
    setUserProfile(profile);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, mode: 'find_bills' })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bills');
      }
      
      setBills(data.bills || []);
      setStep('results');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <GeometricPattern />
      
      {step === 'form' ? (
        <div className="relative min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-5xl">
            {/* Header */}
            <div className="mb-12 text-center">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-blue-500/10 border-2 border-blue-400/30 rounded-full mb-8">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span className="text-sm font-black text-blue-300 tracking-wide">CURRENTLY FOR CONNECTICUT RESIDENTS ONLY</span>
              </div>
              
              <h1 className="text-7xl font-black mb-6 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent leading-none tracking-tighter">
                CLIMATE<br/>IMPACT<br/>COMPASS
              </h1>
              
              <p className="text-zinc-400 text-lg mb-3 font-bold">
                Evidence-based policy analysis tool by <span className="text-emerald-400">Leo Levitt</span>
              </p>
            </div>
            
            {/* Mission Statement */}
            <MissionStatement />
            
            <div className="p-10 bg-zinc-900/50 border-2 border-zinc-800 rounded-3xl backdrop-blur-xl">
              <UserProfileForm onSubmit={handleSubmit} loading={loading} />
            </div>

            <div className="mt-8 p-6 bg-zinc-900/30 border-2 border-zinc-800 rounded-2xl">
              <p className="text-sm text-zinc-500 text-center">
                <span className="font-black text-white">METHODOLOGY:</span> Dual-impact scoring measures both personal financial benefit and climate impact (including indirect effects like barrier removal and market acceleration). All analysis uses transparent AI frameworks with strict no-hallucination safeguards.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative p-6 md:p-10">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-5xl font-black text-white mb-3 tracking-tight">
                    YOUR POLICIES
                  </h1>
                  <p className="text-zinc-500 text-lg font-bold">
                    {bills.length} {bills.length === 1 ? 'policy' : 'policies'} • Sorted by impact
                  </p>
                </div>
                
                <button
                  onClick={() => { setStep('form'); setSelectedBill(null); }}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition font-black border-2 border-zinc-700"
                >
                  ← CHANGE PROFILE
                </button>
              </div>

              <div className="p-6 bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl">
                <p className="text-sm text-zinc-400">
                  <span className="font-black text-white">SCORING:</span> Personal impact measures YOUR financial benefit. 
                  Climate impact now recognizes indirect benefits (barrier removal, market acceleration, workforce development) 
                  in addition to direct emissions reductions.
                </p>
              </div>
            </div>

            {bills.length > 0 ? (
              <div className="space-y-6">
                {bills.map((bill) => (
                  <BillCard key={bill.id} bill={bill} onClick={() => setSelectedBill(bill)} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-zinc-500 text-lg font-bold">No policies found for your profile</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedBill && userProfile && (
        <BillDetailModal bill={selectedBill} onClose={() => setSelectedBill(null)} userProfile={userProfile} />
      )}
    </div>
  );
}