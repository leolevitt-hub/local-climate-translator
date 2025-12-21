// app/page.tsx
"use client";

import React, { useMemo, useState } from "react";

type RelevanceTier = "LOW" | "MEDIUM" | "HIGH";

type OutputShape = {
  relevance: {
    score_0_to_10: number;
    tier: RelevanceTier;
    reasons: string[];
    what_it_means: string;
  };

  plain_english_summary: string;

  actions: {
    do_now: string[];
    do_later: string[];
    ignore_for_now: string[];
  };

  who_it_applies_to: string[];

  impacts: {
    upfront_costs: string[];
    monthly_bills: string[];
    rebates_tax_credits: string[];
    home_upgrades: string[];
    transportation: string[];
    jobs_local_economy: string[];
    job_impacts: string[];
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
        className="w-full appearance-none rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-300/25 focus:border-emerald-300/35 transition"
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
      className="w-full rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2 text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-emerald-300/25 focus:border-emerald-300/35 transition"
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
      className="w-full rounded-2xl bg-white/[0.06] border border-white/10 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-emerald-300/25 focus:border-emerald-300/35 transition resize-y"
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
    <div className="rounded-3xl border border-white/10 bg-white/[0.045] shadow-[0_22px_90px_rgba(0,0,0,0.52)] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 via-white/[0.03] to-transparent">
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
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-200/80 shrink-0" />
          <span className="text-white/80 leading-relaxed">{x}</span>
        </li>
      ))}
    </ul>
  );
}

function tierStyles(tier: RelevanceTier) {
  switch (tier) {
    case "HIGH":
      return {
        pill: "bg-emerald-300/90 text-zinc-950",
        glow: "shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_18px_70px_rgba(16,185,129,0.18)]",
        label: "High relevance",
      };
    case "MEDIUM":
      return {
        pill: "bg-lime-300/85 text-zinc-950",
        glow: "shadow-[0_0_0_1px_rgba(163,230,53,0.30),0_18px_70px_rgba(163,230,53,0.14)]",
        label: "Medium relevance",
      };
    default:
      return {
        pill: "bg-white/10 text-white/85 border border-white/10",
        glow: "shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
        label: "Low relevance",
      };
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function Page() {
  // Inputs
  const [zip, setZip] = useState("06511");
  const [state, setState] = useState("CT");

  const [housing_status, setHousingStatus] = useState("Renter");
  const [property_type, setPropertyType] = useState("Apartment");

  const [job_sector, setJobSector] = useState("Student");
  const [work_location, setWorkLocation] = useState("In-person");

  const [can_make_upgrades, setCanMakeUpgrades] = useState("Not sure");
  const [has_car, setHasCar] = useState("Yes");

  const [next_vehicle_timeline, setNextVehicleTimeline] = useState("1–3 years");
  const [utility_fuels, setUtilityFuels] = useState("No preference");

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

  const score = result?.relevance?.score_0_to_10 ?? 0;
  const tier: RelevanceTier = result?.relevance?.tier ?? "LOW";
  const meterPct = clamp((score / 10) * 100, 0, 100);
  const styles = tierStyles(tier);

  return (
    <main className="min-h-screen text-white relative overflow-hidden">
      {/* Background: darker, more unique green/teal glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900" />
      <div className="absolute inset-0 bg-[radial-gradient(900px_550px_at_15%_10%,rgba(16,185,129,0.22),transparent_62%),radial-gradient(900px_520px_at_85%_18%,rgba(56,189,248,0.16),transparent_60%),radial-gradient(850px_520px_at_55%_92%,rgba(34,197,94,0.12),transparent_62%)]" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div className="relative mx-auto max-w-6xl px-6 py-14">
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/70">
            <span className="h-2 w-2 rounded-full bg-emerald-300/80" />
            Practical climate policy translator
          </div>

          <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">
            Should you care about this climate policy?
          </h1>
          <p className="mt-3 text-white/65 max-w-2xl leading-relaxed">
            Paste a policy excerpt and answer a few questions. You’ll get a{" "}
            <span className="text-white/85">relevance score</span> and a
            prioritized{" "}
            <span className="text-white/85">Do / Do later / Ignore</span> plan.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-300/80" />
              Deterministic relevance score
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-sky-300/70" />
              Clear action priorities
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-lime-300/70" />
              Honest about uncertainty
            </span>
          </div>
        </header>

        <GlassCard
          title="Your situation & policy excerpt"
          subtitle="Short, concrete excerpts work best (1–3 paragraphs)."
          icon="🧾"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <FieldLabel question="ZIP code" helper="Used for basic locality context." badge="Location" />
              <TextInput value={zip} onChange={setZip} />
            </div>

            <div>
              <FieldLabel question="State" helper="Two-letter abbreviation is fine (e.g., CT)." badge="Location" />
              <TextInput value={state} onChange={setState} />
            </div>

            <div>
              <FieldLabel question="Rent or own?" badge="Housing" />
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

            <div>
              <FieldLabel question="Home type" badge="Housing" />
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
                question="Can you make upgrades?"
                helper="Heat pump, insulation, EV charger, etc."
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
                question="Next big decision timeline"
                helper="Car purchase, moving, major upgrades."
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

            <div>
              <FieldLabel
                question="Job / role"
                helper="Examples: student, office, retail, healthcare, trades."
                badge="Work"
              />
              <TextInput value={job_sector} onChange={setJobSector} placeholder="e.g., Student" />
            </div>

            <div className="md:col-span-3">
              <FieldLabel
                question="Policy excerpt"
                helper="Paste 1–3 paragraphs. Avoid huge PDFs here — excerpt the relevant section."
                badge="Policy"
              />
              <TextArea value={policy_text} onChange={setPolicyText} placeholder="Paste policy text…" />
            </div>

            <div className="md:col-span-3 flex flex-col md:flex-row md:items-center gap-3">
              <button
                onClick={onAnalyze}
                disabled={loading}
                className="group inline-flex items-center justify-center rounded-2xl px-5 py-3 font-medium shadow-lg
                bg-gradient-to-r from-emerald-300/90 via-lime-300/80 to-sky-300/85 text-zinc-950
                hover:brightness-105 active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed
                transition"
              >
                <span className="mr-2">{loading ? "Analyzing…" : "Analyze"}</span>
                <span className="opacity-70 group-hover:opacity-90 transition">→</span>
              </button>

              <div className="text-xs text-white/55">
                You’ll get a relevance score + prioritized next steps.
              </div>

              {error ? (
                <div className="md:ml-auto text-sm text-rose-100/90 border border-rose-300/20 bg-rose-500/10 rounded-2xl px-3 py-2">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </GlassCard>

        {result ? (
          <div className="mt-10 space-y-6">
            {/* Relevance Score */}
            <div className={`rounded-3xl border border-white/10 bg-white/[0.045] p-6 ${styles.glow}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-xs text-white/60">Policy relevance score</div>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="text-3xl font-semibold tracking-tight">
                      {result.relevance.score_0_to_10.toFixed(1)} / 10
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full ${styles.pill}`}>
                      {styles.label}
                    </span>
                  </div>
                  <div className="mt-2 text-white/70 text-sm max-w-2xl leading-relaxed">
                    {result.relevance.what_it_means || "—"}
                  </div>
                </div>

                <div className="w-full md:w-[360px]">
                  <div className="text-xs text-white/55 mb-2">Relevance meter</div>
                  <div className="h-3 rounded-full bg-white/10 overflow-hidden border border-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-300/90 via-lime-300/80 to-sky-300/80"
                      style={{ width: `${meterPct}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-white/50">
                    Higher = more likely this policy changes a decision you could make.
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <SectionCard title="Why this score" icon="🔎">
                  <BulletList items={result.relevance.reasons ?? []} />
                </SectionCard>
                <SectionCard title="Plain-English summary" icon="🧠">
                  <p className="text-white/80 leading-relaxed">
                    {result.plain_english_summary || "—"}
                  </p>
                </SectionCard>
              </div>
            </div>

            {/* Do / Later / Ignore */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SectionCard title="✅ Do now" icon="✅">
                <BulletList items={result.actions?.do_now ?? []} />
              </SectionCard>

              <SectionCard title="🕒 Do later" icon="🕒">
                <BulletList items={result.actions?.do_later ?? []} />
              </SectionCard>

              <SectionCard title="🚫 Ignore for now" icon="🚫">
                <BulletList items={result.actions?.ignore_for_now ?? []} />
              </SectionCard>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SectionCard title="Who this applies to" icon="👥">
                <BulletList items={result.who_it_applies_to ?? []} />
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
