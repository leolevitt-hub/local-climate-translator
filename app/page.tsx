"use client";

import React, { useState } from 'react';

// Types
type UserProfile = {
  zip: string;
  state: string;
  housing_status: string;
  property_type: string;
  can_make_upgrades: string;
  has_car: string;
  next_vehicle_timeline: string;
  utility_fuels: string;
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

type Analysis = {
  plain_english_summary: string;
  personal_benefits?: string[];
  climate_benefits?: string[];
  potential_downsides?: string[];
  actions: {
    do_now: string[];
    do_later: string[];
    ignore_for_now: string[];
  };
  who_qualifies?: string[];
  money_details?: {
    upfront_costs: string[];
    monthly_savings: string[];
    payback_timeline: string[];
    available_help: string[];
  };
  climate_details?: {
    emissions_impact: string[];
    clean_energy_added: string[];
    resilience_benefits: string[];
  };
  next_steps?: string[];
  local_checks?: string[];
  open_questions?: string[];
  questions_for_pros?: string[];
};

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
    <div className="space-y-6">
      <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-2">Evidence-Based Climate Policy Analysis</h3>
            <p className="text-sm text-white/80 leading-relaxed">
              Answer these questions to get personalized scores. More details = more accurate analysis of <span className="text-emerald-400 font-medium">financial benefits</span> and <span className="text-teal-400 font-medium">climate impact</span>. All data processed locally.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Location Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 pb-2 border-b border-white/10">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Location
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">
                <span className="text-sm font-medium text-white">ZIP Code</span>
                <span className="block text-xs text-white/50 mt-0.5">Matches you to local policies & incentives</span>
              </label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                placeholder="06511"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition"
                required
              />
            </div>

            <div>
              <label className="block mb-2">
                <span className="text-sm font-medium text-white">State</span>
                <span className="block text-xs text-white/50 mt-0.5">Currently analyzing Connecticut policies</span>
              </label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                <option value="CT">Connecticut</option>
                <option value="CA">California (Coming Soon)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Housing Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 pb-2 border-b border-white/10">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Housing & Property
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2">
                <span className="text-sm font-medium text-white">Housing Status</span>
                <span className="block text-xs text-white/50 mt-0.5">Owners can directly access most home incentives</span>
              </label>
              <select
                value={formData.housing_status}
                onChange={(e) => setFormData({ ...formData, housing_status: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                <option>Renter</option>
                <option>Owner</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block mb-2">
                <span className="text-sm font-medium text-white">Property Type</span>
                <span className="block text-xs text-white/50 mt-0.5">Single-family homes qualify for more upgrades</span>
              </label>
              <select
                value={formData.property_type}
                onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                <option>Apartment</option>
                <option>Single-family home</option>
                <option>Multi-family home</option>
                <option>Condo</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block mb-2">
                <span className="text-sm font-medium text-white">Can Make Upgrades?</span>
                <span className="block text-xs text-white/50 mt-0.5">Ability to install solar, heat pumps, etc.</span>
              </label>
              <select
                value={formData.can_make_upgrades}
                onChange={(e) => setFormData({ ...formData, can_make_upgrades: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                <option>Yes</option>
                <option>No</option>
                <option>Not sure</option>
              </select>
            </div>

            <div>
              <label className="block mb-2">
                <span className="text-sm font-medium text-white">Home Age</span>
                <span className="block text-xs text-white/50 mt-0.5">Older homes benefit more from efficiency upgrades</span>
              </label>
              <select
                value={formData.home_age}
                onChange={(e) => setFormData({ ...formData, home_age: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                <option>Not sure</option>
                <option>Less than 10 years</option>
                <option>10-30 years</option>
                <option>30-50 years</option>
                <option>More than 50 years</option>
              </select>
            </div>

            <div>
              <label className="block mb-2">
                <span className="text-sm font-medium text-white">Current Heating</span>
                <span className="block text-xs text-white/50 mt-0.5">Fossil fuel heating → bigger heat pump savings</span>
              </label>
              <select
                value={formData.current_heating}
                onChange={(e) => setFormData({ ...formData, current_heating: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                <option>Not sure</option>
                <option>Natural gas</option>
                <option>Oil</option>
                <option>Electric resistance</option>
                <option>Heat pump (already efficient!)</option>
                <option>Propane</option>
              </select>
            </div>

            <div>
              <label className="block mb-2">
                <span className="text-sm font-medium text-white">Interested in Solar?</span>
                <span className="block text-xs text-white/50 mt-0.5">Prioritizes solar incentives in your results</span>
              </label>
              <select
                value={formData.interested_in_solar}
                onChange={(e) => setFormData({ ...formData, interested_in_solar: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                <option>Maybe</option>
                <option>Yes, very interested</option>
                <option>No, not feasible</option>
                <option>Already have solar</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transportation Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 pb-2 border-b border-white/10">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Transportation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2">
                <span className="text-sm font-medium text-white">Have a Car?</span>
                <span className="block text-xs text-white/50 mt-0.5">Determines EV policy relevance</span>
              </label>
              <select
                value={formData.has_car}
                onChange={(e) => setFormData({ ...formData, has_car: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>

            <div>
              <label className="block mb-2">
                <span className="text-sm font-medium text-white">Vehicle Decision Timeline</span>
                <span className="block text-xs text-white/50 mt-0.5">When you might buy/lease next vehicle</span>
              </label>
              <select
                value={formData.next_vehicle_timeline}
                onChange={(e) => setFormData({ ...formData, next_vehicle_timeline: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                <option>0-12 months</option>
                <option>1-3 years</option>
                <option>3-10 years</option>
                <option>10+ years</option>
              </select>
            </div>

            <div>
              <label className="block mb-2">
                <span className="text-sm font-medium text-white">Vehicle Preference</span>
                <span className="block text-xs text-white/50 mt-0.5">Filters relevant vehicle policies</span>
              </label>
              <select
                value={formData.utility_fuels}
                onChange={(e) => setFormData({ ...formData, utility_fuels: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                <option>No preference</option>
                <option>Electric only</option>
                <option>Hybrid</option>
                <option>Gas</option>
              </select>
            </div>

            <div>
              <label className="block mb-2">
                <span className="text-sm font-medium text-white">Commute Distance</span>
                <span className="block text-xs text-white/50 mt-0.5">Longer commutes → higher EV fuel savings</span>
              </label>
              <select
                value={formData.commute_distance}
                onChange={(e) => setFormData({ ...formData, commute_distance: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                <option>Less than 10 miles</option>
                <option>10-25 miles</option>
                <option>25-50 miles</option>
                <option>More than 50 miles</option>
                <option>Work from home</option>
              </select>
            </div>
          </div>
        </div>

        {/* Household & Income Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 pb-2 border-b border-white/10">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Household Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2">
                <span className="text-sm font-medium text-white">Household Income</span>
                <span className="block text-xs text-white/50 mt-0.5">Many incentives have income limits (optional)</span>
              </label>
              <select
                value={formData.household_income}
                onChange={(e) => setFormData({ ...formData, household_income: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                <option>Prefer not to say</option>
                <option>Under $50,000</option>
                <option>$50,000 - $100,000</option>
                <option>$100,000 - $150,000</option>
                <option>Over $150,000</option>
              </select>
            </div>

            <div>
              <label className="block mb-2">
                <span className="text-sm font-medium text-white">Household Size</span>
                <span className="block text-xs text-white/50 mt-0.5">Affects income limit calculations</span>
              </label>
              <select
                value={formData.household_size}
                onChange={(e) => setFormData({ ...formData, household_size: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                <option>1-2 people</option>
                <option>3-4 people</option>
                <option>5+ people</option>
              </select>
            </div>

            <div>
              <label className="block mb-2">
                <span className="text-sm font-medium text-white">Own a Business?</span>
                <span className="block text-xs text-white/50 mt-0.5">Business owners may qualify for commercial incentives</span>
              </label>
              <select
                value={formData.own_business}
                onChange={(e) => setFormData({ ...formData, own_business: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Job/Career Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 pb-2 border-b border-white/10">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Career (Optional)
          </h3>
          <div>
            <label className="block mb-2">
              <span className="text-sm font-medium text-white">Job / Role</span>
              <span className="block text-xs text-white/50 mt-0.5">Some policies offer workforce training or sector-specific incentives</span>
            </label>
            <input
              type="text"
              value={formData.job_sector}
              onChange={(e) => setFormData({ ...formData, job_sector: e.target.value })}
              placeholder="e.g., Student, Healthcare, Construction, Teacher"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-400 to-teal-400 text-zinc-950 font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-zinc-900/20 border-t-zinc-900 rounded-full animate-spin" />
              Analyzing Connecticut policies with dual-impact scoring...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Find Connecticut Climate Policies That Matter to You
            </>
          )}
        </button>

        <div className="text-xs text-white/50 text-center space-y-1">
          <p>Your data is processed locally and never stored. All calculations use transparent analytical frameworks.</p>
          <p className="text-white/40">More detailed answers = more accurate personal impact scores</p>
        </div>
      </form>
    </div>
  );
}

function ScoreMeter({ score, label, color, direction }: { score: number; label: string; color: string; direction: string }) {
  const percentage = (score / 10) * 100;
  
  let gradientClass = "from-emerald-400 to-emerald-500";
  let textColor = "text-emerald-400";
  let bgGlow = "shadow-emerald-500/20";
  
  if (color === "climate") {
    if (direction === "positive") {
      gradientClass = "from-teal-400 to-cyan-400";
      textColor = "text-teal-400";
      bgGlow = "shadow-teal-500/20";
    } else if (direction === "negative") {
      gradientClass = "from-red-400 to-orange-400";
      textColor = "text-red-400";
      bgGlow = "shadow-red-500/20";
    } else {
      gradientClass = "from-amber-400 to-yellow-400";
      textColor = "text-amber-400";
      bgGlow = "shadow-amber-500/20";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`relative w-16 h-16 rounded-full ${bgGlow} shadow-lg`}>
        <svg className="w-16 h-16 transform -rotate-90">
          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-white/10" />
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="url(#gradient-${label}-${direction})"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${percentage * 1.759} 175.9`}
            className="transition-all duration-1000"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id={`gradient-${label}-${direction}`} x1="0%" y1="0%" x2="100%">
              <stop offset="0%" className={gradientClass.split(' ')[0].replace('from-', 'text-')} stopColor="currentColor" />
              <stop offset="100%" className={gradientClass.split(' ')[1].replace('to-', 'text-')} stopColor="currentColor" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${textColor}`}>{score.toFixed(1)}</span>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold text-white/90">{label} Impact</div>
        <div className="text-[10px] text-white/50">0-10 scale</div>
      </div>
    </div>
  );
}

function DualScoreDisplay({ bill }: { bill: Bill }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <ScoreMeter score={bill.personalScore} label="Personal" color="personal" direction={bill.personalDirection} />
        <div className="flex-1">
          <div className={`text-xs font-medium ${
            bill.personalDirection === 'positive' ? 'text-emerald-400' : 'text-white/70'
          }`}>
            {bill.personalLabel}
          </div>
          <div className="text-[10px] text-white/50 mt-0.5">Financial benefit to you</div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <ScoreMeter score={bill.climateScore} label="Climate" color="climate" direction={bill.climateDirection} />
        <div className="flex-1">
          <div className={`text-xs font-medium ${
            bill.climateDirection === 'positive' ? 'text-teal-400' :
            bill.climateDirection === 'negative' ? 'text-red-400' :
            'text-amber-400'
          }`}>
            {bill.climateLabel}
          </div>
          <div className="text-[10px] text-white/50 mt-0.5">Environmental impact</div>
        </div>
      </div>
    </div>
  );
}

function BillCard({ bill, onClick }: { bill: Bill; onClick: () => void }) {
  const statusColors: Record<string, string> = {
    passed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    enacted: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    proposed: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    vetoed: 'bg-red-500/20 text-red-300 border-red-500/30'
  };

  const getCardBorder = () => {
    if (bill.personalScore >= 7 && bill.climateScore >= 7) {
      return 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 shadow-lg shadow-emerald-500/10';
    }
    if (bill.climateDirection === 'negative') {
      return 'border-red-500/30 bg-red-500/5';
    }
    if (bill.personalScore >= 6) {
      return 'border-emerald-500/30 bg-emerald-500/5';
    }
    return 'border-white/10 bg-white/5';
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-6 border rounded-2xl hover:border-emerald-400/40 hover:shadow-xl hover:shadow-emerald-500/10 transition-all group ${getCardBorder()}`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-sm font-mono text-white/60">{bill.identifier}</span>
            <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[bill.status] || statusColors.proposed}`}>
              {bill.status}
            </span>
            {bill.personalScore >= 7 && bill.climateScore >= 7 && (
              <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30">
                ⭐ High Dual Impact
              </span>
            )}
            {bill.climateDirection === 'negative' && (
              <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-300 border-red-500/30">
                ⚠️ Climate Risk
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-emerald-400 transition">
            {bill.title}
          </h3>
          <p className="text-sm text-white/70 line-clamp-2 mb-4">{bill.summary}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {bill.personalReasons.length > 0 && (
              <div className="space-y-1">
                <div className="font-medium text-emerald-400/90 mb-1.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                  For You:
                </div>
                {bill.personalReasons.slice(0, 2).map((reason, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-white/70">
                    <span className="mt-0.5">•</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}
            
            {bill.climateReasons.length > 0 && (
              <div className="space-y-1">
                <div className={`font-medium mb-1.5 flex items-center gap-1.5 ${
                  bill.climateDirection === 'positive' ? 'text-teal-400/90' :
                  bill.climateDirection === 'negative' ? 'text-red-400/90' :
                  'text-amber-400/90'
                }`}>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                  </svg>
                  For Climate:
                </div>
                {bill.climateReasons.slice(0, 2).map((reason, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-white/70">
                    <span className="mt-0.5">•</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <DualScoreDisplay bill={bill} />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {bill.tags.slice(0, 5).map((tag: string) => (
          <span key={tag} className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded-full text-white/70">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-white/50">
        <span>{bill.jurisdictionName}</span>
        <span className="group-hover:translate-x-1 transition flex items-center gap-1">
          View Detailed Analysis
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </button>
  );
}

function BillDetailModal({ bill, onClose, userProfile }: { bill: Bill; onClose: () => void; userProfile: UserProfile }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    async function analyze() {
      setLoading(true);
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

        if (!response.ok) throw new Error('Failed');

        const data = await response.json();
        setAnalysis(data.analysis);
      } catch (error) {
        console.error('Analysis failed:', error);
      } finally {
        setLoading(false);
      }
    }

    analyze();
  }, [bill.id, userProfile]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 p-6 border-b border-white/10 bg-gradient-to-br from-zinc-900/95 to-zinc-950/95 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono text-white/60">{bill.identifier}</span>
                <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-white/70">
                  {bill.status}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{bill.title}</h2>
              <p className="text-sm text-white/70">{bill.jurisdictionName}</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/10 rounded-lg transition"
              aria-label="Close modal"
            >
              <span className="text-2xl text-white/70">×</span>
            </button>
          </div>
          <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl">
            <DualScoreDisplay bill={bill} />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin mb-4" />
              <p className="text-white/60 text-sm font-medium">Analyzing policy impact with AI...</p>
              <p className="text-white/40 text-xs mt-1">Quantifying financial & environmental benefits</p>
            </div>
          ) : analysis ? (
            <>
              <div className="p-6 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Policy Summary
                </h3>
                <p className="text-white/80 leading-relaxed">{analysis.plain_english_summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.personal_benefits && analysis.personal_benefits.length > 0 && (
                  <BenefitCard title="💰 Financial Benefits for You" items={analysis.personal_benefits} color="emerald" />
                )}
                {analysis.climate_benefits && analysis.climate_benefits.length > 0 && (
                  <BenefitCard title="🌍 Environmental Benefits" items={analysis.climate_benefits} color="teal" />
                )}
                {analysis.potential_downsides && analysis.potential_downsides.length > 0 && (
                  <BenefitCard title="⚠️ Considerations & Challenges" items={analysis.potential_downsides} color="amber" />
                )}
              </div>

              <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Action Plan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ActionCard title="✅ Do Now" items={analysis.actions.do_now} color="emerald" />
                  <ActionCard title="🕒 Plan For Later" items={analysis.actions.do_later} color="amber" />
                  <ActionCard title="🚫 Skip For Now" items={analysis.actions.ignore_for_now} color="gray" />
                </div>
              </div>

              {analysis.money_details && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    Financial Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.money_details.upfront_costs.length > 0 && (
                      <DetailSection title="💳 Upfront Costs" items={analysis.money_details.upfront_costs} />
                    )}
                    {analysis.money_details.monthly_savings.length > 0 && (
                      <DetailSection title="📊 Monthly Savings" items={analysis.money_details.monthly_savings} />
                    )}
                    {analysis.money_details.payback_timeline.length > 0 && (
                      <DetailSection title="⏱️ Payback Timeline" items={analysis.money_details.payback_timeline} />
                    )}
                    {analysis.money_details.available_help.length > 0 && (
                      <DetailSection title="🎁 Available Assistance" items={analysis.money_details.available_help} />
                    )}
                  </div>
                </div>
              )}

              {analysis.climate_details && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                    </svg>
                    Climate Impact Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.climate_details.emissions_impact.length > 0 && (
                      <DetailSection title="📉 Emissions Reduction" items={analysis.climate_details.emissions_impact} />
                    )}
                    {analysis.climate_details.clean_energy_added.length > 0 && (
                      <DetailSection title="⚡ Clean Energy Expansion" items={analysis.climate_details.clean_energy_added} />
                    )}
                    {analysis.climate_details.resilience_benefits.length > 0 && (
                      <DetailSection title="🛡️ Climate Resilience" items={analysis.climate_details.resilience_benefits} />
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.who_qualifies && <DetailSection title="✅ Eligibility Requirements" items={analysis.who_qualifies} />}
                {analysis.next_steps && <DetailSection title="📝 Next Steps to Take" items={analysis.next_steps} />}
                {analysis.local_checks && <DetailSection title="📍 Local Verification Needed" items={analysis.local_checks} />}
                {analysis.open_questions && <DetailSection title="❓ Open Questions" items={analysis.open_questions} />}
                {analysis.questions_for_pros && <DetailSection title="💬 Questions for Professionals" items={analysis.questions_for_pros} />}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BenefitCard({ title, items, color }: { title: string; items: string[]; color: string }) {
  const styles = {
    emerald: { bg: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-500/20', arrow: 'text-emerald-400' },
    teal: { bg: 'from-teal-500/10 to-cyan-600/5', border: 'border-teal-500/20', arrow: 'text-teal-400' },
    amber: { bg: 'from-amber-500/10 to-yellow-600/5', border: 'border-amber-500/20', arrow: 'text-amber-400' }
  };

  const style = styles[color as keyof typeof styles] || styles.emerald;

  return (
    <div className={`p-5 bg-gradient-to-br ${style.bg} border ${style.border} rounded-2xl`}>
      <h4 className="font-semibold text-white mb-3">{title}</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-white/90 flex gap-2">
            <span className={style.arrow}>→</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActionCard({ title, items, color }: { title: string; items: string[]; color: string }) {
  const colors = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20',
    gray: 'bg-white/5 border-white/10'
  };

  return (
    <div className={`p-5 border rounded-2xl ${colors[color as keyof typeof colors]}`}>
      <h4 className="font-semibold text-white mb-3">{title}</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-white/80 flex gap-2">
            <span className="shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DetailSection({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  
  return (
    <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
      <h4 className="font-semibold text-white mb-3">{title}</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-white/80 flex gap-2">
            <span className="text-emerald-400 shrink-0 mt-1.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-2xl">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        About This Tool
      </h3>
      <div className="space-y-3 text-sm text-white/70">
        <p>
          <strong className="text-white/90">Climate Impact Compass</strong> was created by <strong className="text-emerald-400">Leo Levitt</strong>, 
          combining environmental commitment with analytical rigor to make climate policy actionable.
        </p>
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <p className="text-white/80 leading-relaxed">
            <strong className="text-emerald-400">Philosophy:</strong> Climate action requires both urgency and precision. 
            This tool uses evidence-based scoring frameworks to quantify what matters: the financial impact on your life and 
            the measurable environmental benefit to our planet. Every score is transparent, data-driven, and designed to help you 
            make informed decisions about climate policies.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="text-emerald-400 font-medium mb-1">Personal Impact Score (0-10)</div>
            <div className="text-xs">Quantifies direct financial benefits based on available incentives, your housing situation, upgrade capability, and decision timeline.</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="text-teal-400 font-medium mb-1">Climate Impact Score (0-10)</div>
            <div className="text-xs">Measures environmental benefit through emissions reduction, renewable energy expansion, and climate resilience metrics.</div>
          </div>
        </div>
        <p className="text-xs text-white/50 italic">
          All scoring methodologies are transparent and based on peer-reviewed climate science, energy economics, and policy analysis. 
          This tool processes your data locally and never stores personal information.
        </p>
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(20,184,166,0.12),transparent_50%)]" />

      {step === 'form' ? (
        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-5xl">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs font-medium text-blue-400">Currently Available for Connecticut Residents</span>
              </div>
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Climate Impact Compass
              </h1>
              <p className="text-white/70 text-lg mb-2">
                Discover climate policies that benefit both you and the planet
              </p>
              <p className="text-white/50 text-sm">
                Created by <span className="text-emerald-400 font-medium">Leo Levitt</span> • Analytical framework for actionable climate policy
              </p>
            </div>
            <div className="p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
              <UserProfileForm onSubmit={handleSubmit} loading={loading} />
            </div>
            <AboutSection />
          </div>
        </div>
      ) : (
        <div className="relative p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">Your Connecticut Climate Policy Analysis</h1>
                  <p className="text-white/70">
                    {bills.length} {bills.length === 1 ? 'policy' : 'policies'} found with measurable impact • 
                    Sorted by personal benefit
                  </p>
                </div>
                <button
                  onClick={() => {
                    setStep('form');
                    setSelectedBill(null);
                  }}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-white/90 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Change Profile
                </button>
              </div>

              <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-emerald-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <div className="flex-1">
                    <div className="text-sm text-white/90 font-medium mb-1">Scoring Methodology</div>
                    <div className="text-xs text-white/70 space-y-1">
                      <p>
                        <strong className="text-emerald-400">Personal Impact (0-10):</strong> Quantifies your financial benefit based on available incentives, 
                        housing status, upgrade capability, and decision timeline.
                      </p>
                      <p>
                        <strong className="text-teal-400">Climate Impact (0-10):</strong> Measures environmental benefit through emissions reduction, 
                        renewable energy expansion, and climate resilience. Lower scores indicate policies that may harm climate goals.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {bills.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {bills.map((bill) => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    onClick={() => setSelectedBill(bill)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-white/30 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-white/60">No policies found for your location and profile.</p>
                <p className="text-white/40 text-sm mt-2">Try adjusting your profile or check back later for new policies.</p>
              </div>
            )}

            <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
              <p className="text-sm text-white/60">
                Powered by <span className="text-emerald-400 font-medium">Climate Impact Compass</span> • 
                Created by Leo Levitt
              </p>
              <p className="text-xs text-white/40 mt-2">
                Analytical framework combining environmental science, energy economics, and policy analysis
              </p>
            </div>
          </div>
        </div>
      )}

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