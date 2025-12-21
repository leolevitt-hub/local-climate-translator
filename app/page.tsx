// app/page.tsx
"use client";

import { useMemo, useState } from "react";

type OutputShape = {
  plain_english_summary: string;

  // NEW: more professional econ + local framing
  economic_summary: string; // plain-language economics lens, no fake numbers
  local_context_summary: string; // local framing using ZIP lookup + user notes

  local_profile: {
    place_name: string;
    state: string;
    latitude: string;
    longitude: string;
    source: string; // e.g. "zippopotam.us" or ""
  };

  who_it_applies_to: string[];
  actions_user_can_take: string[];
  impacts: {
    upfront_costs: string[];
    monthly_bills: string[];
    rebates_tax_credits: string[];
    home_upgrades: string[];
    transportation: string[];
    jobs_local_economy: string[];
    job_impacts: string[];
  };

  // NEW: a dedicated economics lens section with bullet structure
  economics_lens: {
    who_pays_who_benefits: string[];
    timeline_and_payback_logic: string[];
    market_and_supply_chain_effects: string[];
    equity_distributional_notes: string[];
  };

  what_to_check_locally: string[];
  uncertainties: string[];
  questions_to_ask: string[];
};

function FieldLabel({
  question,
  helper,
  badge,
}: {
  question: string;
  helper?: string;
  badge?: string;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-white/90">{question}</div>
        {badge ? (
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60">
            {badge}
          </span>
        ) : null}
      </div>
      {helper ? (
        <div className="text-xs text-white/55 leading-snug mt-1">{helper}</div>
      ) : null}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-sky-300/25 focus:border-sky-300/35 transition"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-zinc-950">
            {o.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/45">
        ▾
      </div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2 text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-sky-300/25 focus:border-sky-300/35 transition"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 8,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-2xl bg-white/[0.06] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-sky-300/25 focus:border-sky-300/35 transition resize-y"
    />
  );
}

function GlassCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.045] shadow-[0_22px_80px_rgba(0,0,0,0.45)] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-white/[0.07] via-white/[0.03] to-transparent">
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/[0.06] flex items-center justify-center text-white/80 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              {icon}
            </div>
          ) : null}
          <div>
            <div className="text-sm font-semibold tracking-wide text-white/90">
              {title}
            </div>
            {subtitle ? (
              <div className="text-xs text-white/55 mt-1 leading-snug">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex items-center gap-2 mb-3">
        {icon ? <span className="text-white/70 text-sm">{icon}</span> : null}
        <div className="text-sm font-semibold text-white/90">{title}</div>
      </div>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items?.length) return <div className="text-white/50 text-sm">—</div>;
  return (
    <ul className="space-y-2">
      {items.map((x, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-sky-200/80 shrink-0" />
          <span className="text-white/80 leading-relaxed">{x}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  // Inputs
  const [zip, setZip] = useState("06511");
  const [state, setState] = useState("CT");

  const [housing_status, setHousingStatus] = useState("Renter");
  const [property_type, setPropertyType] = useState("Apartment");

  const [job_sector, setJobSector] = useState("Healthcare");
  const [work_location, setWorkLocation] = useState("In-person");

  const [can_make_upgrades, setCanMakeUpgrades] = useState("Yes");
  const [has_car, setHasCar] = useState("Yes");

  const [next_vehicle_timeline, setNextVehicleTimeline] = useState("1–3 years");
  const [utility_fuels, setUtilityFuels] = useState("Electric only");

  // NEW: local notes for truly-local facts (utility name, program links, landlord rules, etc.)
  const [local_notes, setLocalNotes] = useState(
    "Local notes (optional): e.g., your utility name, whether your building already has heat pumps, landlord restrictions, local rebate program link, whether you have off-street parking for EV charging, etc."
  );

  const [policy_text, setPolicyText] = useState(
    "Clean Energy Tax Credits: Extends and expands credits like the Production Tax Credit (PTC) and Investment Tax Credit (ITC) for solar, wind, storage, geothermal, and nuclear, with bonus credits for domestic content and low-income areas.\nHousehold Incentives: Offers rebates and tax credits for electric vehicles (EVs), heat pumps, and home energy efficiency upgrades.\nClean Energy Manufacturing: Incentivizes domestic production of clean energy components, boosting American supply chains."
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OutputShape | null>(null);

  const payload = useMemo(
    () => ({
      zip,
      state,
      housing_status,
      property_type,
      can_make_upgrades,
      utility_fuels,
      has_car,
      next_vehicle_timeline,
      job_sector,
      work_location,
      policy_text,
      local_notes, // NEW
    }),
    [
      zip,
      state,
      housing_status,
      property_type,
      can_make_upgrades,
      utility_fuels,
      has_car,
      next_vehicle_timeline,
      job_sector,
      work_location,
      policy_text,
      local_notes,
    ]
  );

  async function onAnalyze() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        const parts = [
          data?.error ?? "Something went wrong.",
          data?.status ? `Status: ${data.status}` : null,
          data?.code ? `Code: ${data.code}` : null,
          data?.type ? `Type: ${data.type}` : null,
          data?.details ? `Details: ${data.details}` : null,
        ].filter(Boolean);

        setError(parts.join(" • "));
        return;
      }

      setResult(data.output as OutputShape);
    } catch (e: any) {
      setError(e?.message ?? "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-white relative overflow-hidden">
      {/* Background (unchanged) */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900" />
      <div className="absolute inset-0 bg-[radial-gradient(900px_550px_at_18%_12%,rgba(56,189,248,0.20),transparent_62%),radial-gradient(850px_520px_at_82%_18%,rgba(99,102,241,0.16),transparent_60%),radial-gradient(850px_520px_at_55%_92%,rgba(16,185,129,0.12),transparent_62%)]" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div className="relative mx-auto max-w-6xl px-6 py-14">
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Local Climate Policy Impact
          </h1>
          <p className="mt-3 text-white/65 max-w-2xl leading-relaxed">
            Share a bit about your situation and paste a short excerpt from a
            climate policy. We’ll summarize what it may mean for you, add an
            economics lens, and list practical next steps to explore locally.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-sky-300/80" />
              Designed for clarity
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-indigo-300/70" />
              Economics lens
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-300/70" />
              Local context
            </span>
          </div>
        </header>

        <GlassCard
          title="Your situation & policy excerpt"
          subtitle="Add local notes if you want truly ZIP-specific accuracy (e.g., your utility, landlord rules, or local program links)."
          icon="🧾"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <FieldLabel
                question="What ZIP code are you in?"
                helper="Used to infer city/area for context."
                badge="Location"
              />
              <TextInput value={zip} onChange={setZip} />
            </div>

            <div>
              <FieldLabel
                question="What state are you in?"
                helper="Two-letter abbreviation is fine (e.g., CT)."
                badge="Location"
              />
              <TextInput value={state} onChange={setState} />
            </div>

            <div>
              <FieldLabel question="Do you rent or own your home?" badge="Housing" />
              <Select
                value={housing_status}
                onChange={setHousingStatus}
                options={[
                  { value: "Renter", label: "Renter" },
                  { value: "Owner", label: "Owner" },
                  { value: "Other", label: "Other" },
                ]}
              />
            </div>

            <div className="md:col-span-2">
              <FieldLabel
                question="What job or role best describes you?"
                helper="Examples: student, office, retail, healthcare, trades, etc."
                badge="Work"
              />
              <TextInput
                value={job_sector}
                onChange={setJobSector}
                placeholder="e.g., Student, Healthcare, Retail…"
              />
            </div>

            <div>
              <FieldLabel question="Where do you typically work or study?" badge="Work" />
              <Select
                value={work_location}
                onChange={setWorkLocation}
                options={[
                  { value: "In-person", label: "In-person" },
                  { value: "Hybrid", label: "Hybrid" },
                  { value: "Remote", label: "Remote" },
                  { value: "Not working / Student", label: "Not working / Student" },
                ]}
              />
            </div>

            <div>
              <FieldLabel question="What type of home do you live in?" badge="Housing" />
              <Select
                value={property_type}
                onChange={setPropertyType}
                options={[
                  { value: "Apartment", label: "Apartment" },
                  { value: "Single-family home", label: "Single-family home" },
                  { value: "Multi-family home", label: "Multi-family home" },
                  { value: "Other", label: "Other" },
                ]}
              />
            </div>

            <div>
              <FieldLabel
                question="Can you make upgrades to your home?"
                helper="For example: heat pump, insulation, EV charger."
                badge="Constraints"
              />
              <Select
                value={can_make_upgrades}
                onChange={setCanMakeUpgrades}
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                  { value: "Not sure", label: "Not sure" },
                ]}
              />
            </div>

            <div>
              <FieldLabel question="Do you have a car?" badge="Transportation" />
              <Select
                value={has_car}
                onChange={setHasCar}
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />
            </div>

            <div>
              <FieldLabel
                question="When might you make a big decision?"
                helper="Like moving, buying a car, or starting upgrades."
                badge="Timing"
              />
              <Select
                value={next_vehicle_timeline}
                onChange={setNextVehicleTimeline}
                options={[
                  { value: "0–12 months", label: "0–12 months" },
                  { value: "1–3 years", label: "1–3 years" },
                  { value: "3–10 years", label: "3–10 years" },
                  { value: "10+ years", label: "10+ years" },
                ]}
              />
            </div>

            <div>
              <FieldLabel
                question="If you buy a car, what would you consider?"
                helper="Helps tailor transportation-related impacts."
                badge="Transportation"
              />
              <Select
                value={utility_fuels}
                onChange={setUtilityFuels}
                options={[
                  { value: "Electric only", label: "Electric only" },
                  { value: "Hybrid", label: "Hybrid" },
                  { value: "Gas", label: "Gas" },
                  { value: "No preference", label: "No preference" },
                  { value: "No car", label: "No car" },
                ]}
              />
            </div>

            {/* NEW local notes box */}
            <div className="md:col-span-3">
              <FieldLabel
                question="Local notes (optional but improves ZIP-specific accuracy)"
                helper="Paste anything you know is true locally: your utility name, a rebate link, landlord policy, building constraints, transit reality, etc."
                badge="Local"
              />
              <TextArea
                value={local_notes}
                onChange={setLocalNotes}
                rows={5}
                placeholder="Optional local notes…"
              />
            </div>

            <div className="md:col-span-3">
              <FieldLabel
                question="Paste the policy text you want analyzed"
                helper="Short, concrete excerpts usually work best."
                badge="Policy excerpt"
              />
              <TextArea
                value={policy_text}
                onChange={setPolicyText}
                placeholder="Paste 1–3 paragraphs here…"
              />
            </div>

            <div className="md:col-span-3 flex flex-col md:flex-row md:items-center gap-3">
              <button
                onClick={onAnalyze}
                disabled={loading}
                className="group inline-flex items-center justify-center rounded-2xl px-5 py-3 font-medium shadow-lg
                bg-gradient-to-r from-sky-300/90 via-indigo-300/85 to-emerald-300/85 text-zinc-950
                hover:brightness-105 active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed
                transition"
              >
                <span className="mr-2">{loading ? "Analyzing…" : "Analyze"}</span>
                <span className="opacity-70 group-hover:opacity-90 transition">→</span>
              </button>

              <div className="text-xs text-white/55">
                You’ll get a structured summary + economics lens + local checks.
              </div>

              {error ? (
                <div className="md:ml-auto text-sm text-rose-100/90 border border-rose-300/20 bg-rose-500/10 rounded-2xl px-3 py-2">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </GlassCard>

        {/* Results */}
        {result ? (
          <div className="mt-10 space-y-6">
            <SectionCard title="Plain-English summary" icon="🧠">
              <p className="text-white/80 leading-relaxed">
                {result.plain_english_summary || "—"}
              </p>
            </SectionCard>

            {/* NEW: Economic summary */}
            <SectionCard title="Economics lens (plain language)" icon="📈">
              <p className="text-white/80 leading-relaxed">
                {result.economic_summary || "—"}
              </p>
            </SectionCard>

            {/* NEW: Local context summary + inferred place */}
            <SectionCard title="Local context" icon="📍">
              <div className="text-xs text-white/55 mb-3">
                {result.local_profile?.place_name ? (
                  <>
                    Inferred area:{" "}
                    <span className="text-white/80">
                      {result.local_profile.place_name}, {result.local_profile.state}
                    </span>
                    {result.local_profile.source ? (
                      <span className="text-white/40">
                        {" "}
                        • source: {result.local_profile.source}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <>Inferred area: —</>
                )}
              </div>
              <p className="text-white/80 leading-relaxed">
                {result.local_context_summary || "—"}
              </p>
            </SectionCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SectionCard title="Who this applies to" icon="👥">
                <BulletList items={result.who_it_applies_to} />
              </SectionCard>

              <SectionCard title="Actions you can take" icon="✅">
                <BulletList items={result.actions_user_can_take} />
              </SectionCard>

              <SectionCard title="Upfront costs" icon="🏷️">
                <BulletList items={result.impacts?.upfront_costs ?? []} />
              </SectionCard>

              <SectionCard title="Monthly bills" icon="🧾">
                <BulletList items={result.impacts?.monthly_bills ?? []} />
              </SectionCard>

              <SectionCard title="Rebates & tax credits" icon="🎟️">
                <BulletList items={result.impacts?.rebates_tax_credits ?? []} />
              </SectionCard>

              <SectionCard title="Home upgrades" icon="🏠">
                <BulletList items={result.impacts?.home_upgrades ?? []} />
              </SectionCard>

              <SectionCard title="Transportation" icon="🚗">
                <BulletList items={result.impacts?.transportation ?? []} />
              </SectionCard>

              <SectionCard title="Jobs & local economy" icon="🏗️">
                <BulletList items={result.impacts?.jobs_local_economy ?? []} />
              </SectionCard>

              <SectionCard title="Job impacts" icon="🧰">
                <BulletList items={result.impacts?.job_impacts ?? []} />
              </SectionCard>

              {/* NEW: Economics lens bullets */}
              <SectionCard title="Economics lens (details)" icon="🧮">
                <div className="space-y-5">
                  <div>
                    <div className="text-xs font-semibold text-white/75 mb-2">
                      Who pays / who benefits
                    </div>
                    <BulletList items={result.economics_lens?.who_pays_who_benefits ?? []} />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-white/75 mb-2">
                      Timeline & payback logic
                    </div>
                    <BulletList
                      items={result.economics_lens?.timeline_and_payback_logic ?? []}
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-white/75 mb-2">
                      Market & supply chain effects
                    </div>
                    <BulletList
                      items={result.economics_lens?.market_and_supply_chain_effects ?? []}
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-white/75 mb-2">
                      Equity / distribution notes
                    </div>
                    <BulletList
                      items={result.economics_lens?.equity_distributional_notes ?? []}
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="What to check locally" icon="📍">
                <BulletList items={result.what_to_check_locally ?? []} />
              </SectionCard>

              <SectionCard title="Uncertainties" icon="⚠️">
                <BulletList items={result.uncertainties ?? []} />
              </SectionCard>

              <SectionCard title="Questions to ask" icon="❓">
                <BulletList items={result.questions_to_ask ?? []} />
              </SectionCard>
            </div>
          </div>
        ) : null}

        <footer className="mt-14 text-xs text-white/35">
          © {new Date().getFullYear()} • Local Climate Policy Impact
        </footer>
      </div>
    </main>
  );
}
