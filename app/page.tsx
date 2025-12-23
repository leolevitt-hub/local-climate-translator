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

// Field option type
type FieldOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

// Field type definition
type FormField = {
  key: string;
  label: string;
  type: 'input' | 'select';
  required?: boolean;
  placeholder?: string;
  helper?: string;
  options?: FieldOption[];
};

// Stunning animated background with depth
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs with blur */}
      <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-teal-500/20 via-transparent to-transparent blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]" />
      
      {/* Floating geometric shapes */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 border border-emerald-400/10 rounded-[40px] rotate-12 animate-[float_20s_ease-in-out_infinite]" />
      <div className="absolute bottom-1/3 left-1/4 w-48 h-48 border border-teal-400/10 rounded-[30px] -rotate-12 animate-[float_15s_ease-in-out_infinite]" style={{ animationDelay: '3s' }} />
    </div>
  );
}

// Mission Statement with enhanced design
function MissionStatement() {
  return (
    <div className="mb-16 relative group">
      {/* Glowing accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-emerald-400 via-teal-400 to-cyan-500 rounded-full shadow-lg shadow-emerald-500/50" />
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-emerald-400 via-teal-400 to-cyan-500 rounded-full blur-sm opacity-50" />
      
      <div className="pl-10 space-y-6">
        {/* Main Mission with animated underline */}
        <div className="space-y-4">
          <div className="relative inline-block">
            <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
              OUR MISSION
            </h2>
            <div className="absolute -bottom-1 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transform origin-left transition-transform duration-300 group-hover:scale-x-110" />
          </div>
          <p className="text-lg text-white/90 leading-relaxed max-w-4xl">
            Climate action requires both <span className="font-black text-emerald-400">urgency</span> and{' '}
            <span className="font-black text-teal-400">precision</span>. This tool hopes to bridge the gap between 
            complex climate policy and actionable decisions by quantifying what matters most: 
            the <span className="font-black text-emerald-400">financial impact on your life</span> and 
            the <span className="font-black text-teal-400">measurable environmental benefit</span> to our planet.
          </p>
        </div>

        {/* Principle cards with hover effects and gradients */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6">
          {[
            {
              color: 'emerald',
              title: 'EVIDENCE-BASED',
              text: 'Every score derived from transparent AI analysis of actual bill text from the OpenStates policy database. No assumptions, no hallucinations.',
              icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            },
            {
              color: 'teal',
              title: 'PERSONALIZED',
              text: 'Analysis tailored to YOUR specific situation: location, housing, income, and energy decisions.',
              icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            },
            {
              color: 'cyan',
              title: 'ACTIONABLE',
              text: 'Not just information! Click on any of the bills in the list to view concrete next steps, eligibility criteria, and financial pathways.',
              icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            }
          ].map((principle, i) => (
            <div 
              key={i}
              className="group/card relative p-6 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl"
            >
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
              
              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-400/20 to-transparent blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 bg-gradient-to-br from-${principle.color}-400/20 to-${principle.color}-500/10 rounded-lg border border-${principle.color}-400/30 group-hover/card:scale-110 transition-transform duration-300`}>
                    <div className={`text-${principle.color}-400`}>
                      {principle.icon}
                    </div>
                  </div>
                  <h3 className={`text-sm font-black text-${principle.color}-400 tracking-wider`}>
                    {principle.title}
                  </h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {principle.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar with enhanced styling */}
        <div className="pt-6 border-t border-zinc-800/50 flex items-center justify-end">
          <div className="flex gap-3">
            <span className="px-4 py-2 bg-gradient-to-r from-zinc-800 to-zinc-800/50 border border-zinc-700/50 rounded-xl text-xs font-bold text-zinc-400 backdrop-blur-sm">
              OPEN-SOURCE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Form Component
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
    <form onSubmit={handleSubmit} className="space-y-14">
      {/* Premium intro banner with animations */}
      <div className="group relative p-8 bg-gradient-to-br from-emerald-500/[0.12] via-teal-500/[0.08] to-transparent border-l-[3px] border-emerald-400 rounded-r-3xl overflow-hidden backdrop-blur-sm">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        {/* Glowing accent */}
        <div className="absolute -left-[3px] top-0 bottom-0 w-[3px] bg-gradient-to-b from-emerald-400 via-teal-400 to-cyan-500 shadow-lg shadow-emerald-500/50" />
        
        <div className="relative flex items-start gap-8">
          <div className="shrink-0 w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-[20px] flex items-center justify-center transform -rotate-6 group-hover:rotate-0 transition-transform duration-500 shadow-2xl shadow-emerald-500/30">
            <svg className="w-10 h-10 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-white mb-4 tracking-tight">Evidence-Based Policy Analysis</h3>
            <p className="text-base text-white/85 leading-relaxed mb-4">
              Complete this profile to receive <span className="font-bold text-emerald-300">dual-impact scores</span> showing 
              both your <span className="font-bold text-emerald-300">personal financial benefit</span> and the <span className="font-bold text-teal-300">climate impact</span> of each policy.
            </p>
          </div>
        </div>
      </div>

      {/* Form sections with enhanced visual hierarchy */}
      {[
        {
          title: 'Location',
          gradient: 'from-emerald-400 to-teal-500',
          fields: [
            {
              key: 'zip',
              label: 'Zip Code',
              type: 'input' as const,
              required: true,
              placeholder: '06511',
              helper: 'Matches you to local policies'
            },
            {
              key: 'state',
              label: 'State',
              type: 'select' as const,
              required: false,
              options: [
                { value: 'CT', label: 'Connecticut' },
                { value: 'CA', label: 'California (Coming Soon)', disabled: true }
              ],
              helper: 'Currently analyzing CT policies'
            }
          ]
        },
        {
          title: 'Housing & Property',
          gradient: 'from-teal-400 to-cyan-500',
          fields: [
            {
              key: 'housing_status',
              label: 'Housing Status',
              type: 'select' as const,
              options: ['Renter', 'Owner', 'Other'].map(v => ({ value: v, label: v })),
              helper: undefined
            },
            {
              key: 'property_type',
              label: 'Property Type',
              type: 'select' as const,
              options: ['Apartment', 'Single-family home', 'Multi-family home', 'Condo', 'Other'].map(v => ({ value: v, label: v })),
              helper: undefined
            },
            {
              key: 'can_make_upgrades',
              label: 'Can make upgrades?',
              type: 'select' as const,
              options: ['Yes', 'No', 'Not sure'].map(v => ({ value: v, label: v })),
              helper: undefined
            },
            {
              key: 'home_age',
              label: 'Home Age',
              type: 'select' as const,
              options: ['Not sure', 'Less than 10 years', '10-30 years', '30-50 years', 'More than 50 years'].map(v => ({ value: v, label: v })),
              helper: undefined
            },
            {
              key: 'current_heating',
              label: 'Current Heating',
              type: 'select' as const,
              options: ['Not sure', 'Natural gas', 'Oil', 'Electric resistance', 'Heat pump (already efficient!)', 'Propane'].map(v => ({ value: v, label: v })),
              helper: undefined
            },
            {
              key: 'interested_in_solar',
              label: 'Solar Interest',
              type: 'select' as const,
              options: ['Maybe', 'Yes, very interested', 'No, not feasible', 'Already have solar'].map(v => ({ value: v, label: v })),
              helper: undefined
            }
          ]
        },
        {
          title: 'Transportation',
          gradient: 'from-cyan-400 to-blue-500',
          fields: [
            {
              key: 'has_car',
              label: 'Have a Car?',
              type: 'select' as const,
              options: ['Yes', 'No'].map(v => ({ value: v, label: v })),
              helper: undefined
            },
            {
              key: 'next_vehicle_timeline',
              label: 'Next Vehicle Decision',
              type: 'select' as const,
              options: ['0-12 months', '1-3 years', '3-10 years', '10+ years'].map(v => ({ value: v, label: v })),
              helper: undefined
            },
            {
              key: 'utility_fuels',
              label: 'Vehicle Preference',
              type: 'select' as const,
              options: ['No preference', 'Electric only', 'Hybrid', 'Gas'].map(v => ({ value: v, label: v })),
              helper: undefined
            },
            {
              key: 'commute_distance',
              label: 'Commute Distance',
              type: 'select' as const,
              options: ['Less than 10 miles', '10-25 miles', '25-50 miles', 'More than 50 miles', 'Work from home'].map(v => ({ value: v, label: v })),
              helper: undefined
            }
          ]
        },
        {
          title: 'Household Details',
          gradient: 'from-emerald-400 to-teal-500',
          fields: [
            {
              key: 'household_income',
              label: 'Household Income',
              type: 'select' as const,
              options: ['Prefer not to say', 'Under $50,000', '$50,000 - $100,000', '$100,000 - $150,000', 'Over $150,000'].map(v => ({ value: v, label: v })),
              helper: undefined
            },
            {
              key: 'household_size',
              label: 'Household Size',
              type: 'select' as const,
              options: ['1-2 people', '3-4 people', '5+ people'].map(v => ({ value: v, label: v })),
              helper: undefined
            },
            {
              key: 'own_business',
              label: 'Own Business?',
              type: 'select' as const,
              options: ['No', 'Yes'].map(v => ({ value: v, label: v })),
              helper: undefined
            }
          ]
        },
        {
          title: 'Career (Optional)',
          gradient: 'from-teal-400 to-cyan-500',
          fields: [
            {
              key: 'job_sector',
              label: 'Job/Role',
              type: 'input' as const,
              required: false,
              placeholder: 'e.g., Student, Healthcare, Construction, Teacher',
              helper: 'Some policies offer sector-specific benefits'
            }
          ]
        }
      ].map((section, sectionIdx) => (
        <fieldset key={sectionIdx} className="space-y-7 group">
          {/* Section header with gradient bar */}
          <legend className="flex items-center gap-4 mb-8">
            <div className={`w-1 h-10 bg-gradient-to-b ${section.gradient} rounded-full shadow-lg group-hover:h-12 transition-all duration-300`} />
            <span className="text-2xl font-black text-white tracking-tight">{section.title}</span>
          </legend>
          
          <div className={`grid grid-cols-1 ${section.fields.length > 4 ? 'md:grid-cols-3' : section.fields.length > 2 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'} gap-6`}>
            {section.fields.map((field) => (
              <label key={field.key} className="group/field block space-y-3">
                <span className="text-sm font-black text-white tracking-[0.1em] flex items-center gap-2">
                  {field.label}
                  {field.type === 'input' && field.required && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 text-[9px] font-black rounded-md border border-red-500/30 animate-pulse">
                      REQUIRED
                    </span>
                  )}
                </span>
                
                {field.type === 'input' ? (
                  <input
                    type="text"
                    value={formData[field.key as keyof UserProfile]}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    required={field.required ?? false}
                    className="w-full px-5 py-4 bg-gradient-to-br from-zinc-900/90 to-zinc-900/50 border border-zinc-800/50 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-300 font-medium backdrop-blur-sm group-hover/field:border-zinc-700/50"
                  />
                ) : (
                  <div className="relative">
                    <select
                      value={formData[field.key as keyof UserProfile]}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      className="w-full px-5 py-4 bg-gradient-to-br from-zinc-900/90 to-zinc-900/50 border border-zinc-800/50 rounded-xl text-white focus:outline-none focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/20 transition-all duration-300 appearance-none cursor-pointer font-medium backdrop-blur-sm group-hover/field:border-zinc-700/50"
                    >
                      {field.options?.map((opt: FieldOption) => (
                        <option 
                          key={opt.value} 
                          value={opt.value}
                          disabled={opt.disabled}
                          className="bg-zinc-900"
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                )}
                
                {field.helper && (
                  <p className="text-xs text-zinc-500 leading-relaxed">{field.helper}</p>
                )}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {/* Premium submit button with complex animation */}
      <div className="relative pt-6">
        <button
          type="submit"
          disabled={loading}
          className="group/btn relative w-full px-10 py-7 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-zinc-950 font-black text-lg rounded-2xl overflow-hidden transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_20px_60px_-15px_rgba(16,185,129,0.4)] hover:scale-[1.01] active:scale-[0.99]"
        >
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
          
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
          
          <div className="relative flex items-center justify-center gap-4">
            {loading ? (
              <>
                <div className="relative w-7 h-7">
                  <div className="absolute inset-0 border-4 border-zinc-900/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-t-zinc-900 rounded-full animate-spin" />
                </div>
                <span className="tracking-wide">ANALYZING POLICIES...</span>
              </>
            ) : (
              <>
                <div className="relative">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <div className="absolute inset-0 blur-lg opacity-50">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <span className="tracking-wide">FIND YOUR CLIMATE POLICIES</span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Privacy notice with icon */}
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 pt-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Data processed locally • Never stored • Fully transparent methodology</span>
      </div>
    </form>
  );
}

// Enhanced score meter with premium animations
function ScoreMeter({ score, label, color, direction }: { score: number; label: string; color: string; direction: string }) {
  const percentage = (score / 10) * 100;
  
  const colorMap: Record<string, { gradient: string; text: string; glow: string }> = {
    personal: { gradient: 'from-emerald-400 to-emerald-500', text: 'text-emerald-400', glow: 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' },
    'climate-positive': { gradient: 'from-teal-400 to-cyan-500', text: 'text-teal-400', glow: 'drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]' },
    'climate-negative': { gradient: 'from-red-400 to-orange-500', text: 'text-red-400', glow: 'drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]' },
    'climate-neutral': { gradient: 'from-zinc-400 to-zinc-500', text: 'text-zinc-400', glow: 'drop-shadow-[0_0_8px_rgba(161,161,170,0.3)]' },
  };

  const colorKey = color === 'climate' ? `climate-${direction}` : 'personal';
  const colors = colorMap[colorKey] || colorMap.personal;

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-28 h-28 group/meter">
        {/* Outer glow ring */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors.gradient} opacity-20 blur-xl group-hover/meter:opacity-30 transition-opacity duration-500`} />
        
        {/* SVG meter */}
        <svg className="w-28 h-28 transform -rotate-90 relative z-10">
          {/* Background circle */}
          <circle 
            cx="56" 
            cy="56" 
            r="48" 
            stroke="currentColor" 
            strokeWidth="8" 
            fill="none" 
            className="text-zinc-800/50" 
          />
          {/* Progress circle */}
          <circle
            cx="56"
            cy="56"
            r="48"
            stroke="url(#gradient)"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${percentage * 3.016} 301.6`}
            className="transition-all duration-1000 ease-out"
            strokeLinecap="round"
            style={{ filter: colors.glow }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={colors.gradient.split(' ')[0].replace('from-', 'text-')} stopColor="currentColor" />
              <stop offset="100%" className={colors.gradient.split(' ')[1].replace('to-', 'text-')} stopColor="currentColor" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Center number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-black ${colors.text} transition-all duration-500 group-hover/meter:scale-110`}>
            {score.toFixed(1)}
          </span>
        </div>
      </div>
      
      <div>
        <div className="text-sm font-black text-white tracking-wider mb-1">{label.toUpperCase()}</div>
        <div className="text-xs text-zinc-500 font-bold tracking-wide">0-10 SCALE</div>
      </div>
    </div>
  );
}

// Enhanced Bill Card
function BillCard({ bill, onClick }: { bill: Bill; onClick: () => void }) {
  const statusStyles: Record<string, string> = {
    passed: 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 text-emerald-300 border-emerald-500/50 shadow-emerald-500/20',
    enacted: 'bg-gradient-to-r from-blue-500/20 to-blue-600/10 text-blue-300 border-blue-500/50 shadow-blue-500/20',
    proposed: 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300 border-amber-500/50 shadow-amber-500/20',
    vetoed: 'bg-gradient-to-r from-red-500/20 to-red-600/10 text-red-300 border-red-500/50 shadow-red-500/20'
  };

  const getCardStyle = () => {
    if (bill.personalScore >= 7 && bill.climateScore >= 7) 
      return 'border-emerald-400/50 bg-gradient-to-br from-emerald-500/[0.08] via-teal-500/[0.05] to-transparent shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/20';
    if (bill.climateDirection === 'negative') 
      return 'border-red-500/40 bg-gradient-to-br from-red-500/[0.08] to-transparent shadow-lg shadow-red-500/10 hover:shadow-red-500/20';
    if (bill.personalScore >= 6) 
      return 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.05] to-transparent shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/10';
    return 'border-zinc-800/50 bg-gradient-to-br from-zinc-900/50 to-zinc-900/20 backdrop-blur-sm hover:border-zinc-700/50';
  };

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left p-9 border-2 rounded-3xl transition-all duration-500 hover:scale-[1.01] ${getCardStyle()}`}
    >
      {/* Animated gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/5 to-emerald-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl" />
      
      <div className="relative flex items-start justify-between gap-10 mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <span className="px-4 py-2 bg-gradient-to-br from-zinc-800 to-zinc-900 text-white font-mono font-bold text-sm rounded-xl border border-zinc-700 shadow-lg">
              {bill.identifier}
            </span>
            <span className={`px-4 py-2 text-xs font-black rounded-xl border shadow-lg ${statusStyles[bill.status] || statusStyles.proposed}`}>
              {bill.status.toUpperCase()}
            </span>
            {bill.personalScore >= 7 && bill.climateScore >= 7 && (
              <span className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 text-emerald-300 text-xs font-black rounded-xl border border-emerald-500/50 shadow-lg shadow-emerald-500/20 animate-pulse">
                ⭐ DUAL HIGH IMPACT
              </span>
            )}
          </div>
          
          <h3 className="text-2xl font-black text-white mb-5 group-hover:text-emerald-400 transition-colors duration-300 leading-tight">
            {bill.title}
          </h3>
          
          <p className="text-sm text-zinc-400 line-clamp-2 mb-7 leading-relaxed">{bill.summary}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bill.personalReasons.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-black text-emerald-400 text-sm tracking-wide mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400/20 to-emerald-500/10 flex items-center justify-center border border-emerald-400/30">
                    💰
                  </div>
                  FOR YOU
                </div>
                {bill.personalReasons.map((reason, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-zinc-300 group/reason">
                    <span className="text-emerald-400 font-bold mt-1 group-hover/reason:translate-x-1 transition-transform">→</span>
                    <span className="leading-relaxed">{reason}</span>
                  </div>
                ))}
              </div>
            )}
            
            {bill.climateReasons.length > 0 && (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 font-black text-sm tracking-wide mb-4 ${
                  bill.climateDirection === 'positive' ? 'text-teal-400' :
                  bill.climateDirection === 'negative' ? 'text-red-400' : 'text-zinc-400'
                }`}>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${
                    bill.climateDirection === 'positive' ? 'from-teal-400/20 to-teal-500/10 border-teal-400/30' :
                    bill.climateDirection === 'negative' ? 'from-red-400/20 to-red-500/10 border-red-400/30' :
                    'from-zinc-400/20 to-zinc-500/10 border-zinc-400/30'
                  } flex items-center justify-center border`}>
                    🌍
                  </div>
                  FOR CLIMATE
                </div>
                {bill.climateReasons.map((reason, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-zinc-300 group/reason">
                    <span className={`font-bold mt-1 group-hover/reason:translate-x-1 transition-transform ${
                      bill.climateDirection === 'positive' ? 'text-teal-400' :
                      bill.climateDirection === 'negative' ? 'text-red-400' : 'text-zinc-400'
                    }`}>→</span>
                    <span className="leading-relaxed">{reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="shrink-0 space-y-8">
          <ScoreMeter score={bill.personalScore} label="Personal" color="personal" direction={bill.personalDirection} />
          <ScoreMeter score={bill.climateScore} label="Climate" color="climate" direction={bill.climateDirection} />
        </div>
      </div>

      <div className="relative flex items-center justify-between pt-6 border-t-2 border-zinc-800/50">
        <div className="flex flex-wrap gap-2">
          {bill.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-zinc-400 text-xs font-bold backdrop-blur-sm">
              {tag}
            </span>
          ))}
        </div>
        <span className="text-sm font-black text-zinc-500 group-hover:text-emerald-400 transition-colors flex items-center gap-3">
          VIEW ANALYSIS
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </div>
    </button>
  );
}

// Modal component (keeping compact for space)
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
          body: JSON.stringify({ ...userProfile, mode: 'analyze_bill', billId: bill.id })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to analyze');
        setAnalysis(data.analysis);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    analyze();
  }, [bill.id, userProfile]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={onClose}>
      <div className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 border-2 border-zinc-800/50 rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-20 p-8 border-b-2 border-zinc-800/50 bg-zinc-950/98 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-4 py-2 bg-zinc-800 text-white font-mono font-bold text-sm rounded-xl border border-zinc-700">{bill.identifier}</span>
                <span className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-black rounded-xl border border-zinc-700">{bill.status.toUpperCase()}</span>
              </div>
              <h2 className="text-3xl font-black text-white leading-tight mb-2">{bill.title}</h2>
              <p className="text-sm font-bold text-zinc-500">{bill.jurisdictionName}</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-zinc-800 rounded-xl transition-colors group">
              <svg className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-8 p-6 bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl">
            <ScoreMeter score={bill.personalScore} label="Personal" color="personal" direction={bill.personalDirection} />
            <ScoreMeter score={bill.climateScore} label="Climate" color="climate" direction={bill.climateDirection} />
          </div>
        </div>

        <div className="p-8 space-y-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-zinc-800 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-t-emerald-400 rounded-full animate-spin" />
              </div>
              <p className="text-white font-black text-lg">ANALYZING POLICY...</p>
              <p className="text-zinc-500 text-sm mt-2">Comprehensive AI analysis in progress</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="inline-flex p-4 bg-red-500/20 rounded-full mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-400 font-bold mb-4">{error}</p>
              <button onClick={onClose} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition font-bold">CLOSE</button>
            </div>
          ) : analysis ? (
            <div className="space-y-8">
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-2 border-emerald-500/20 rounded-2xl">
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

                <section className="p-6 bg-gradient-to-br from-teal-500/10 to-teal-500/5 border-2 border-teal-500/20 rounded-2xl">
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

              {analysis.action_plan.immediate_steps.length > 0 && (
                <section className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-2 border-blue-500/20 rounded-2xl">
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

// Main Page Component
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
      if (!response.ok) throw new Error(data.error || 'Failed to fetch bills');
      setBills(data.bills || []);
      setStep('results');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden">
      <AnimatedBackground />
      
      {step === 'form' ? (
        <div className="relative min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-6xl relative z-9">
            {/* Enhanced header with premium design */}
            <div className="mb-16 text-center space-y-6">
              {/* MOVED: Connecticut badge ABOVE title block + tuned spacing */}
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-4 px-6 py-3 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-400/30 rounded-full backdrop-blur-xl shadow-lg shadow-blue-500/10">
                  <div className="relative">
                    <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <div className="absolute inset-0 blur-lg opacity-50">
                      <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm font-black text-blue-300 tracking-wider">CURRENTLY FOR CONNECTICUT RESIDENTS ONLY</span>
                </div>
              </div>

              <div className="relative inline-block">
                <h1 className="text-8xl font-black mb-6 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent leading-[0.9] tracking-tighter filter drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  CLIMATE<br/>IMPACT<br/>COMPASS
                </h1>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 blur-3xl opacity-20 -z-10" />
              </div>
              
              <p className="text-zinc-400 text-xl font-bold">
                Evidence-based policy analysis tool by <span className="text-emerald-400">Leo Levitt</span>
              </p>
            </div>
            
            <MissionStatement />
            
            <div className="p-12 bg-gradient-to-br from-zinc-900/80 via-zinc-900/50 to-zinc-900/30 backdrop-blur-2xl border border-zinc-800/50 rounded-[2rem] shadow-2xl">
              <UserProfileForm onSubmit={handleSubmit} loading={loading} />
            </div>

            <div className="mt-10 p-8 bg-gradient-to-br from-zinc-900/40 to-zinc-900/20 backdrop-blur-xl border border-zinc-800/30 rounded-3xl">
              <p className="text-sm text-zinc-500 text-center leading-relaxed">
                <span className="font-black text-white">METHODOLOGY:  </span> Dual-impact scoring measures both personal financial benefit and climate impact (including indirect effects like barrier removal and market acceleration). All analysis uses transparent AI frameworks with strict no-hallucination safeguards.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative p-6 md:p-12">
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="mb-12">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h1 className="text-6xl font-black text-white mb-4 tracking-tight">YOUR POLICIES</h1>
                  <p className="text-zinc-500 text-xl font-bold">
                    {bills.length} {bills.length === 1 ? 'policy' : 'policies'} • Sorted by impact
                  </p>
                </div>
                <button
                  onClick={() => { setStep('form'); setSelectedBill(null); }}
                  className="group px-8 py-4 bg-gradient-to-br from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 rounded-xl transition-all font-black border border-zinc-700 shadow-lg hover:shadow-emerald-500/10 hover:scale-105"
                >
                  <span className="flex items-center gap-3">
                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    CHANGE PROFILE
                  </span>
                </button>
              </div>

              <div className="p-8 bg-gradient-to-br from-zinc-900/50 to-zinc-900/20 backdrop-blur-xl border border-zinc-800/30 rounded-3xl">
                <p className="text-sm text-zinc-400 leading-relaxed">
                  <span className="font-black text-white">SCORING:</span> Personal impact measures YOUR financial benefit. 
                  Climate impact now recognizes indirect benefits (barrier removal, market acceleration, workforce development) 
                  in addition to direct emissions reductions.
                </p>
              </div>
            </div>

            {bills.length > 0 ? (
              <div className="space-y-8">
                {bills.map((bill) => (
                  <BillCard key={bill.id} bill={bill} onClick={() => setSelectedBill(bill)} />
                ))}
              </div>
            ) : (
              <div className="text-center py-32">
                <div className="inline-flex p-8 bg-zinc-900/50 rounded-3xl mb-6 border border-zinc-800/50">
                  <svg className="w-20 h-20 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-zinc-500 text-xl font-bold">No policies found for your profile</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedBill && userProfile && (
        <BillDetailModal bill={selectedBill} onClose={() => setSelectedBill(null)} userProfile={userProfile} />
      )}
      
      {/* Add CSS for float animation */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
}
