// app/api/analyze/route.ts
// Climate Impact Compass — V5 (granular scoring + more extreme climate)
// Created by Leo Levitt
//
// What you asked for:
// - Climate impact is too low / not varied enough -> make it more extreme + more granular.
// - Keep variety for BOTH scales, but increase granularity for both.
// - Rewrite the whole backend again (done).
//
// V5 approach:
// - AI-led scoring stays the core (so we don't "inflate climate" with dumb keyword baselines).
// - We tighten the AI rubric + request more granularity (2 decimals, full range usage).
// - We add POST-processing shaping curves (like "contrast").
//   - Climate gets a stronger "contrast" curve (more extreme).
//   - Personal gets a lighter "contrast" curve (more granular, not crazy).
// - Neutral is STRICTLY 0.00 for both.
//
// Tuning knobs (env):
// - MAX_BILLS_FETCH (default 180)
// - AI_SHORTLIST (default 140)
// - AI_BATCH_SIZE (default 10)
// - RELEVANCE_THRESHOLD (default 0.22)  // lower -> more bills shown
// - PERSONAL_WEIGHT (default 1.25)
// - CLIMATE_CONTRAST (default 0.62)     // lower -> more extreme (0.55-0.70 safe)
// - PERSONAL_CONTRAST (default 0.82)    // lower -> more extreme (0.75-0.90 safe)

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export const runtime = "nodejs";

let prismaInstance: PrismaClient | null = null;

function getDatabaseClient(): PrismaClient {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL environment variable is missing");

  if (!prismaInstance) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    prismaInstance = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    console.log("✓ Prisma client initialized");
  }
  return prismaInstance;
}

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY environment variable is missing");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2, timeout: 30000 });
}

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

function normalizeInput(body: any): UserProfile {
  return {
    zip: String(body.zip || "").trim(),
    state: String(body.state || "").toUpperCase().trim(),
    housing_status: String(body.housing_status || "").trim(),
    property_type: String(body.property_type || "").trim(),
    can_make_upgrades: String(body.can_make_upgrades || "").trim(),
    utility_fuels: String(body.utility_fuels || "").trim(),
    has_car: String(body.has_car || "").trim(),
    next_vehicle_timeline: String(body.next_vehicle_timeline || "").trim(),
    job_sector: String(body.job_sector || "").trim(),
    household_income: String(body.household_income || "").trim(),
    household_size: String(body.household_size || "").trim(),
    commute_distance: String(body.commute_distance || "").trim(),
    home_age: String(body.home_age || "").trim(),
    current_heating: String(body.current_heating || "").trim(),
    interested_in_solar: String(body.interested_in_solar || "").trim(),
    own_business: String(body.own_business || "").trim(),
  };
}

function joinLowercase(...parts: Array<string | null | undefined>): string {
  return parts
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .join(" ")
    .toLowerCase();
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function clamp0to10(x: any): number {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

function clamp0to1(x: any): number {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function safeArray(v: any, max = 4): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string").slice(0, max);
}

function normalizeDirection(d: any): "positive" | "negative" | "neutral" {
  return d === "positive" || d === "negative" || d === "neutral" ? d : "neutral";
}

// ---------- Contrast / Shaping (granularity + extremeness) ----------
// gamma < 1 expands midrange upward and increases separation.
// climate gamma smaller => more extreme.
// personal gamma closer to 1 => subtler.

function applyContrast(score0to10: number, gamma: number): number {
  const s = Math.max(0, Math.min(10, score0to10));
  if (s === 0) return 0;
  const out = 10 * Math.pow(s / 10, gamma);
  return Math.max(0, Math.min(10, out));
}

// Extra "punch" for climate so it spreads better.
// This is intentionally mild but noticeable.
function climatePunch(score0to10: number): number {
  // piecewise: keep low end low, mid gets contrast, high gets a tiny lift
  const s = Math.max(0, Math.min(10, score0to10));
  if (s === 0) return 0;
  if (s < 1.5) return s; // don't inflate tiny signals
  if (s > 8.5) return Math.min(10, s * 1.05); // tiny lift at the very top
  return s;
}

function getPersonalScoreLabel(score: number): string {
  if (score >= 9.0) return "Exceptional savings opportunity";
  if (score >= 8.0) return "Major savings opportunity";
  if (score >= 7.0) return "Strong savings potential";
  if (score >= 6.0) return "Good savings potential";
  if (score >= 4.5) return "Moderate benefit";
  if (score >= 3.0) return "Some benefit possible";
  if (score >= 1.5) return "Limited benefit";
  if (score > 0) return "Minimal direct benefit";
  return "No direct personal benefit";
}

function getClimateScoreLabel(score: number, direction: "positive" | "negative" | "neutral"): string {
  if (direction === "neutral" || score === 0) return "Neutral climate impact";
  if (direction === "positive") {
    if (score >= 9.0) return "Transformative climate benefit";
    if (score >= 8.0) return "Major climate benefit";
    if (score >= 7.0) return "Strong climate benefit";
    if (score >= 6.0) return "Good climate benefit";
    if (score >= 4.5) return "Meaningful climate benefit";
    if (score >= 3.0) return "Moderate climate benefit";
    if (score > 0) return "Minor climate benefit";
  } else {
    if (score >= 9.0) return "Severely harmful to climate";
    if (score >= 8.0) return "Major climate harm";
    if (score >= 7.0) return "Significant climate harm";
    if (score >= 6.0) return "Considerable climate harm";
    if (score >= 4.5) return "Moderate climate harm";
    if (score >= 3.0) return "Some climate harm";
    if (score > 0) return "Minor climate harm";
  }
  return "Neutral climate impact";
}

// ---------- Minimal hints to help AI (NOT scoring) ----------
// keep conservative so we don't inflate climate again

function computeHints(tags: string[], text: string) {
  const t = text.toLowerCase();
  const tagSet = new Set(tags);

  const climateStrongTags = ["emissions", "renewables", "solar", "wind", "ev", "storage", "buildings", "efficiency", "resilience"];
  const climateWeakTags = ["transit", "agriculture", "water", "finance", "workforce"];

  const climateStrongText =
    /(greenhouse gas|ghg|emission|carbon pricing|cap and trade|carbon tax|renewable portfolio|clean energy standard|heat pump|weatherization|electric vehicle|zev|battery storage|grid modernization|transmission|microgrid|climate resilience|adaptation)/i.test(
      t
    );

  const fossilOrRollback =
    /(new pipeline|lng terminal|new gas plant|fracking|rollback|repeal).*(environmental|climate)?/i.test(t) ||
    /(subsid(y|ies)|tax break).*(oil|gas|coal)/i.test(t);

  const hasStrongTag = climateStrongTags.some((x) => tagSet.has(x));
  const hasWeakTag = climateWeakTags.some((x) => tagSet.has(x));

  const climateHint = fossilOrRollback ? 0.9 : hasStrongTag && climateStrongText ? 0.9 : (hasStrongTag || climateStrongText) ? 0.6 : hasWeakTag ? 0.3 : 0.0;

  // Personal hint: presence of money mechanisms / eligibility language (used only as a prior)
  const personalHintText =
    /(rebate|tax credit|tax deduction|grant|voucher|direct payment|bill credit|bill assistance|rate reduction|low-interest|zero-interest|loan program|financing|eligible|income-qualified|income eligible)/i.test(
      t
    );

  const personalHint = personalHintText ? 0.6 : 0.0;

  return { climateHint, personalHint };
}

// ---------- OpenAI scoring ----------

type AIResult = {
  id: string;
  relevance: number; // 0..1 should we show it
  personalScore: number; // 0..10
  personalReasons: string[];
  climateDirection: "positive" | "negative" | "neutral";
  climateScore: number; // 0..10
  climateReasons: string[];
};

async function aiScoreBillsBatch(
  openai: OpenAI,
  model: string,
  userProfile: UserProfile,
  bills: Array<{
    id: string;
    title: string;
    summary: string;
    tags: string[];
    climateHint: number;
    personalHint: number;
  }>
): Promise<Record<string, AIResult>> {
  // This is the OpenAI scoring prompt section:
  const system = `You are a careful, calibrated scoring engine for a policy recommender.

Return STRICT JSON only. No prose outside JSON.

We want MORE GRANULARITY and MORE VARIANCE:
- Use the full 0.00–10.00 range when appropriate.
- Use 2-decimal precision.
- Avoid clumping scores (e.g. don't make everything 2.00 or 4.00).

Definitions:
- relevance: 0.00–1.00 = "should we show this to the user?" (meaningful personal OR meaningful climate OR clearly adjacent).
- personalScore: 0.00–10.00 = direct practical/financial benefit to THIS user.
- climateScore: 0.00–10.00 magnitude of climate impact with climateDirection.
- Neutral MUST be exactly 0.00 and direction MUST be "neutral".

Climate scoring rubric (more extreme + more varied):
- 0.00–0.60: incidental/weakly related or generic "energy" with no real climate mechanism.
- 0.60–2.50: modest but real climate content (planning with clear climate scope, limited programs).
- 2.50–5.50: meaningful action (programs/incentives/standards with plausible emissions effect).
- 5.50–8.50: major impact (binding standards, large funding, statewide programs, significant buildout).
- 8.50–10.00: transformative (binding caps/standards, major phase-outs, large-scale decarbonization).
- Negative direction when fossil expansion / regulatory rollback; magnitude scales by seriousness.

Personal scoring rubric (granular, optimistic-but-defensible):
- 0.00 if no plausible user-accessible pathway.
- 1.00–3.50: small/indirect savings chance (weak eligibility, limited scope).
- 3.50–6.50: likely savings pathway (rebates/credits/financing/bill relief/eligibility), even if $ not stated.
- 6.50–9.00: strong match + clear mechanism + detail.
- 9.00–10.00 only for extremely clear, high-value user-specific benefits.

Rules:
- Don’t punish missing dollar amounts if mechanism and eligibility are clear.
- DO punish discretionary/vague language (may, consider, study with no funding).
- Use the provided hints as weak priors only (they can be wrong).
- Provide up to 3 short reasons for personal and climate each.

Output format:
{ "results": [ { id, relevance, personalScore, personalReasons, climateDirection, climateScore, climateReasons } ] }`;

  const user = {
    userProfile,
    bills: bills.map((b) => ({
      id: b.id,
      title: b.title,
      summary: b.summary,
      tags: b.tags,
      hints: { climateHint: b.climateHint, personalHint: b.personalHint },
    })),
  };

  const resp = await openai.chat.completions.create({
    model,
    temperature: 0.12,
    response_format: { type: "json_object" } as any,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) },
    ],
  });

  const raw = resp.choices?.[0]?.message?.content ?? "";
  let parsed: any = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) parsed = JSON.parse(raw.slice(start, end + 1));
  }

  const out: Record<string, AIResult> = {};
  const results = parsed?.results;
  if (!Array.isArray(results)) return out;

  for (const r of results) {
    const id = String(r?.id ?? "");
    if (!id) continue;

    let relevance = round2(clamp0to1(r?.relevance));
    let personalScore = round2(clamp0to10(r?.personalScore));
    let climateScore = round2(clamp0to10(r?.climateScore));
    let climateDirection = normalizeDirection(r?.climateDirection);

    // Enforce strict neutrality
    if (climateDirection === "neutral") climateScore = 0.0;
    if (climateScore === 0) climateDirection = "neutral";
    if (personalScore < 0.01) personalScore = 0.0;

    out[id] = {
      id,
      relevance,
      personalScore,
      personalReasons: safeArray(r?.personalReasons, 3),
      climateDirection,
      climateScore,
      climateReasons: safeArray(r?.climateReasons, 3),
    };
  }

  return out;
}

async function aiScoreBills(
  openai: OpenAI,
  model: string,
  userProfile: UserProfile,
  bills: Array<{ id: string; title: string; summary: string; tags: string[]; climateHint: number; personalHint: number }>,
  batchSize: number
): Promise<Record<string, AIResult>> {
  const all: Record<string, AIResult> = {};
  for (let i = 0; i < bills.length; i += batchSize) {
    const chunk = bills.slice(i, i + batchSize);
    const scored = await aiScoreBillsBatch(openai, model, userProfile, chunk);
    Object.assign(all, scored);
  }
  return all;
}

// ---------- MODE 1: Find bills ----------

async function findRelevantBills(userProfile: UserProfile): Promise<NextResponse> {
  console.log(`\n[FIND_BILLS] Starting for state: ${userProfile.state}`);

  if (!userProfile.state) return NextResponse.json({ error: "State is required" }, { status: 400 });

  const MAX_BILLS_FETCH = Number(process.env.MAX_BILLS_FETCH ?? 180);
  const AI_SHORTLIST = Number(process.env.AI_SHORTLIST ?? 140);
  const AI_BATCH_SIZE = Number(process.env.AI_BATCH_SIZE ?? 10);
  const RELEVANCE_THRESHOLD = Number(process.env.RELEVANCE_THRESHOLD ?? 0.22);
  const PERSONAL_WEIGHT = Number(process.env.PERSONAL_WEIGHT ?? 1.25);

  // Contrast knobs
  const CLIMATE_CONTRAST = Number(process.env.CLIMATE_CONTRAST ?? 0.6); // lower => more extreme
  const PERSONAL_CONTRAST = Number(process.env.PERSONAL_CONTRAST ?? 0.82); // lower => more extreme

  try {
    const db = getDatabaseClient();

    const totalCount = await db.policy.count();
    console.log(`[FIND_BILLS] Total policies in DB: ${totalCount}`);
    if (totalCount === 0) {
      return NextResponse.json({ bills: [], total: 0, message: "No policies in database. Run ingestion script first." });
    }

    const bills = await db.policy.findMany({
      where: {
        jurisdictionCode: userProfile.state,
        policyType: { in: ["direct", "indirect"] },
      },
      include: {
        tags: { select: { tag: true } },
        sources: {
          where: { sourceType: "openstates" },
          select: { url: true, name: true },
          take: 1,
        },
      },
      orderBy: { dateIntroduced: "desc" },
      take: MAX_BILLS_FETCH,
    });

    console.log(`[FIND_BILLS] Pulled ${bills.length} bills for ${userProfile.state}`);
    if (bills.length === 0) {
      return NextResponse.json({ bills: [], total: 0, message: `No bills found for state: ${userProfile.state}` });
    }

    const enriched = bills.map((bill) => {
      const tags = bill.tags.map((t) => t.tag);
      const text = joinLowercase(bill.title, bill.summary);
      const { climateHint, personalHint } = computeHints(tags, text);

      const identifierMatch = bill.title.match(/^([A-Z]{1,3}\s*\d+)/);
      const identifier = identifierMatch ? identifierMatch[1] : bill.title.substring(0, 10);

      return {
        raw: bill,
        id: bill.id,
        identifier,
        title: bill.title,
        summary: bill.summary || "No summary available",
        tags,
        climateHint,
        personalHint,
        sources: bill.sources.map((s) => ({ url: s.url, name: s.name })),
        jurisdictionName: bill.jurisdictionName,
        status: bill.status,
        dateIntroduced: bill.dateIntroduced?.toISOString() || null,
      };
    });

    const aiInput = enriched.slice(0, AI_SHORTLIST).map((b) => ({
      id: b.id,
      title: b.title,
      summary: b.summary,
      tags: b.tags,
      climateHint: b.climateHint,
      personalHint: b.personalHint,
    }));

    const openai = getOpenAIClient();
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    let aiMap: Record<string, AIResult> = {};
    try {
      aiMap = await aiScoreBills(openai, model, userProfile, aiInput, AI_BATCH_SIZE);
    } catch (e: any) {
      console.warn("[FIND_BILLS] AI scoring failed; showing empty list:", e?.message || e);
      aiMap = {};
    }

    const combined = enriched.map((b) => {
      const ai = aiMap[b.id];

      // Raw AI scores
      let personalScore = ai ? ai.personalScore : 0.0;
      let climateScore = ai ? ai.climateScore : 0.0;
      let climateDirection = ai ? ai.climateDirection : "neutral";
      const relevance = ai ? ai.relevance : Math.max(b.climateHint, b.personalHint) * 0.35;

      // Enforce strict neutrality
      if (climateDirection === "neutral") climateScore = 0.0;
      if (climateScore === 0) climateDirection = "neutral";
      if (personalScore < 0.01) personalScore = 0.0;

      // Granular shaping (contrast)
      personalScore = personalScore === 0 ? 0 : round2(applyContrast(personalScore, PERSONAL_CONTRAST));
      climateScore = climateScore === 0 ? 0 : round2(applyContrast(climatePunch(climateScore), CLIMATE_CONTRAST));

      const personalReasons = ai ? ai.personalReasons : [];
      const climateReasons = ai ? ai.climateReasons : [];

      const personalDirection: "positive" | "neutral" = personalScore > 0 ? "positive" : "neutral";

      const rank = personalScore * PERSONAL_WEIGHT + climateScore + relevance * 1.6;

      return {
        id: b.id,
        identifier: b.identifier,
        title: b.title,
        summary: b.summary,
        personalScore,
        personalLabel: getPersonalScoreLabel(personalScore),
        personalDirection,
        personalReasons,
        climateScore,
        climateLabel: getClimateScoreLabel(climateScore, climateDirection),
        climateDirection,
        climateReasons,
        relevance,
        jurisdictionName: b.jurisdictionName,
        status: b.status,
        dateIntroduced: b.dateIntroduced,
        tags: b.tags,
        sources: b.sources,
        _rank: rank,
        _scoredBy: ai ? "openai+contrast" : "fallback",
      };
    });

    // Include more bills without inflating scores: relevance gate + any nonzero score.
    const included = combined.filter((b) => {
      const hasScore = b.personalScore > 0 || b.climateScore > 0;
      const isRelevant = b.relevance >= RELEVANCE_THRESHOLD;
      return hasScore || isRelevant;
    });

    const relevantBills = included
      .sort((a, b) => b._rank - a._rank)
      .slice(0, 30)
      .map(({ _rank, _scoredBy, ...rest }) => rest);

    console.log(`[FIND_BILLS] Returning ${relevantBills.length} bills\n`);

    return NextResponse.json({
      bills: relevantBills,
      total: relevantBills.length,
      scoringExplanation: {
        methodology: "AI-led scoring with contrast shaping for more granularity. Climate contrast is stronger for more extreme/varied climate scores.",
        neutrality: "Neutral personal/climate impact is exactly 0.00.",
        knobs: {
          MAX_BILLS_FETCH,
          AI_SHORTLIST,
          AI_BATCH_SIZE,
          RELEVANCE_THRESHOLD,
          PERSONAL_WEIGHT,
          CLIMATE_CONTRAST,
          PERSONAL_CONTRAST,
        },
        developer: "Created by Leo Levitt",
      },
    });
  } catch (error: any) {
    console.error("[FIND_BILLS] Error:", error);
    return NextResponse.json({ error: "Failed to fetch bills", details: error.message }, { status: 500 });
  }
}

// ---------- MODE 2: Analyze bill (AI narrative analysis) ----------

async function analyzeBill(billId: string, userProfile: UserProfile): Promise<NextResponse> {
  console.log(`\n[ANALYZE_BILL] Starting for bill: ${billId}`);

  try {
    const db = getDatabaseClient();

    const bill = await db.policy.findUnique({
      where: { id: billId },
      include: { tags: { select: { tag: true } } },
    });

    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });

    const openai = getOpenAIClient();
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const systemPrompt = `You are Climate Impact Compass, an analytical policy tool created by Leo Levitt.
Return strict JSON only. Do not invent dollar amounts or emissions numbers unless supported by the provided text.`;

    const userPrompt = `Analyze this bill for this user.

USER PROFILE:
- Location: ${userProfile.zip}, ${userProfile.state}
- Housing: ${userProfile.housing_status} in ${userProfile.property_type}
- Home age: ${userProfile.home_age}
- Heating: ${userProfile.current_heating}
- Can upgrade: ${userProfile.can_make_upgrades}
- Solar interest: ${userProfile.interested_in_solar}
- Car: ${userProfile.has_car}
- Commute: ${userProfile.commute_distance}
- Next vehicle timeline: ${userProfile.next_vehicle_timeline}
- Income: ${userProfile.household_income}
- Household size: ${userProfile.household_size}
- Business owner: ${userProfile.own_business}
- Job sector: ${userProfile.job_sector || "Not specified"}

BILL:
Title: ${bill.title}
Status: ${bill.status}
Summary: ${bill.summary || "No summary provided"}
Tags: ${bill.tags.map((t) => t.tag).join(", ")}
Jurisdiction: ${bill.jurisdictionName}

Output JSON:
{
  "plain_english_summary": "2-3 sentences",
  "what_is_certain": ["facts supported by title/summary/tags"],
  "what_is_uncertain": ["implementation-dependent items"],
  "personal_benefits": ["mechanisms: rebates/credits/bill relief/financing/eligibility"],
  "climate_impacts": ["mitigation/adaptation impacts; be conservative if unclear"],
  "who_qualifies": ["eligibility signals if present"],
  "next_steps": ["3 concrete steps"],
  "questions_to_ask": ["3 questions for utility/agency/contractor"]
}`;

    const response = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" } as any,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const rawContent = response.choices?.[0]?.message?.content ?? "";
    let analysis: any = null;

    try {
      analysis = JSON.parse(rawContent);
    } catch {
      const start = rawContent.indexOf("{");
      const end = rawContent.lastIndexOf("}");
      if (start !== -1 && end !== -1) analysis = JSON.parse(rawContent.slice(start, end + 1));
    }

    if (!analysis) return NextResponse.json({ error: "AI returned invalid response" }, { status: 502 });

    console.log(`[ANALYZE_BILL] Analysis complete\n`);
    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error("[ANALYZE_BILL] Error:", error);
    return NextResponse.json({ error: "Failed to analyze bill", details: error.message }, { status: 500 });
  }
}

// ---------- MAIN HANDLER ----------

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const userProfile = normalizeInput(body);
    const mode = body.mode || "find_bills";

    let response: NextResponse;

    if (mode === "find_bills") {
      response = await findRelevantBills(userProfile);
    } else if (mode === "analyze_bill") {
      if (!body.billId) return NextResponse.json({ error: "billId required" }, { status: 400 });
      response = await analyzeBill(String(body.billId), userProfile);
    } else {
      return NextResponse.json({ error: `Invalid mode: ${mode}` }, { status: 400 });
    }

    console.log(`✓ Completed in ${Date.now() - startTime}ms\n`);
    return response;
  } catch (error: any) {
    console.error(`✗ Failed:`, error.message);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      },
      { status: 500 }
    );
  }
}
