// app/api/analyze/route.ts
// Climate Impact Compass — V7 Enhanced Climate Scoring with Strict State Filtering
// Created by Leo Levitt
//
// V7 improvements:
// - STRICT state filtering - bills ONLY from user's state
// - Enhanced validation of jurisdiction matching
// - Better error messages when no state-specific bills found
// - All personal scoring unchanged

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
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2, timeout: 180000 }); // 3 minutes
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

// Map of state abbreviations to full names for flexible matching
const STATE_NAME_MAP: Record<string, string[]> = {
  "CT": ["CT", "Connecticut", "CONNECTICUT"],
  "CA": ["CA", "California", "CALIFORNIA"],
  "NY": ["NY", "New York", "NEW YORK"],
  "MA": ["MA", "Massachusetts", "MASSACHUSETTS"],
  "NJ": ["NJ", "New Jersey", "NEW JERSEY"],
  "PA": ["PA", "Pennsylvania", "PENNSYLVANIA"],
  "TX": ["TX", "Texas", "TEXAS"],
  "FL": ["FL", "Florida", "FLORIDA"],
  "IL": ["IL", "Illinois", "ILLINOIS"],
  "OH": ["OH", "Ohio", "OHIO"],
  "GA": ["GA", "Georgia", "GEORGIA"],
  "NC": ["NC", "North Carolina", "NORTH CAROLINA"],
  "MI": ["MI", "Michigan", "MICHIGAN"],
  "WA": ["WA", "Washington", "WASHINGTON"],
  "AZ": ["AZ", "Arizona", "ARIZONA"],
  "CO": ["CO", "Colorado", "COLORADO"],
  "VA": ["VA", "Virginia", "VIRGINIA"],
  "TN": ["TN", "Tennessee", "TENNESSEE"],
  "MN": ["MN", "Minnesota", "MINNESOTA"],
  "OR": ["OR", "Oregon", "OREGON"],
  // Add more states as needed
};

// Get all valid jurisdiction codes for a state
function getStateJurisdictionCodes(stateCode: string): string[] {
  const normalized = stateCode.toUpperCase().trim();
  const mappings = STATE_NAME_MAP[normalized];
  if (mappings) {
    return mappings;
  }
  // If not in map, return just the code itself
  return [normalized];
}

// Check if a jurisdiction matches the user's state
function jurisdictionMatchesState(jurisdictionCode: string | null, jurisdictionName: string | null, userState: string): boolean {
  if (!userState) return false;
  
  const normalizedUserState = userState.toUpperCase().trim();
  const validCodes = getStateJurisdictionCodes(normalizedUserState);
  
  // Check jurisdiction code
  if (jurisdictionCode) {
    const normalizedJurisdiction = jurisdictionCode.toUpperCase().trim();
    if (validCodes.some(code => normalizedJurisdiction === code || normalizedJurisdiction.includes(code))) {
      return true;
    }
  }
  
  // Check jurisdiction name
  if (jurisdictionName) {
    const normalizedName = jurisdictionName.toUpperCase().trim();
    if (validCodes.some(code => normalizedName === code || normalizedName.includes(code))) {
      return true;
    }
  }
  
  return false;
}

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

function applyContrast(score0to10: number, gamma: number): number {
  const s = Math.max(0, Math.min(10, score0to10));
  if (s === 0) return 0;
  const out = 10 * Math.pow(s / 10, gamma);
  return Math.max(0, Math.min(10, out));
}

function climatePunch(score0to10: number): number {
  const s = Math.max(0, Math.min(10, score0to10));
  if (s === 0) return 0;
  if (s < 1.5) return s;
  if (s > 8.5) return Math.min(10, s * 1.05);
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

  const personalHintText =
    /(rebate|tax credit|tax deduction|grant|voucher|direct payment|bill credit|bill assistance|rate reduction|low-interest|zero-interest|loan program|financing|eligible|income-qualified|income eligible)/i.test(
      t
    );

  const personalHint = personalHintText ? 0.6 : 0.0;

  return { climateHint, personalHint };
}

type AIResult = {
  id: string;
  relevance: number;
  personalScore: number;
  personalReasons: string[];
  climateDirection: "positive" | "negative" | "neutral";
  climateScore: number;
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

IMPROVED Climate scoring rubric (recognizes INDIRECT benefits):
- 0.00 ONLY if policy has genuinely NO climate connection whatsoever
- Policies that ENABLE/ACCELERATE clean energy deployment are climate-positive, even if indirect:
  * Removing barriers to solar/wind/EV installation = positive climate impact
  * Streamlining permitting for clean energy = positive climate impact
  * Workforce training for clean energy jobs = positive climate impact
  * Financing mechanisms for clean energy = positive climate impact
  * Licensing exemptions that grow solar industry = positive climate impact
- Score based on POTENTIAL IMPACT, not just direct emissions reductions:
  - 0.60–2.50: enables small-scale clean energy growth or removes minor barriers
  - 2.50–5.50: meaningfully accelerates clean energy adoption or removes significant barriers
  - 5.50–8.50: major market transformation, large-scale clean energy growth, significant barrier removal
  - 8.50–10.00: transformative policy that fundamentally changes energy landscape
- Negative direction when fossil expansion / regulatory rollback; magnitude scales by seriousness.

Personal scoring rubric (UNCHANGED):
- 0.00 if no plausible user-accessible pathway.
- 1.00–3.50: small/indirect savings chance (weak eligibility, limited scope).
- 3.50–6.50: likely savings pathway (rebates/credits/financing/bill relief/eligibility), even if $ not stated.
- 6.50–9.00: strong match + clear mechanism + detail.
- 9.00–10.00 only for extremely clear, high-value user-specific benefits.

Rules:
- Don't punish missing dollar amounts if mechanism and eligibility are clear.
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

async function findRelevantBills(userProfile: UserProfile): Promise<NextResponse> {
  console.log(`\n[FIND_BILLS] Starting for state: ${userProfile.state}, ZIP: ${userProfile.zip}`);

  if (!userProfile.state) {
    return NextResponse.json({ error: "State is required" }, { status: 400 });
  }

  const normalizedState = userProfile.state.toUpperCase().trim();
  const validJurisdictions = getStateJurisdictionCodes(normalizedState);
  
  console.log(`[FIND_BILLS] Looking for bills in jurisdictions: ${validJurisdictions.join(", ")}`);

  const MAX_BILLS_FETCH = Number(process.env.MAX_BILLS_FETCH ?? 180);
  const AI_SHORTLIST = Number(process.env.AI_SHORTLIST ?? 140);
  const AI_BATCH_SIZE = Number(process.env.AI_BATCH_SIZE ?? 10);
  const RELEVANCE_THRESHOLD = Number(process.env.RELEVANCE_THRESHOLD ?? 0.22);
  const PERSONAL_WEIGHT = Number(process.env.PERSONAL_WEIGHT ?? 1.25);
  const CLIMATE_CONTRAST = Number(process.env.CLIMATE_CONTRAST ?? 0.6);
  const PERSONAL_CONTRAST = Number(process.env.PERSONAL_CONTRAST ?? 0.82);

  try {
    const db = getDatabaseClient();

    const totalCount = await db.policy.count();
    console.log(`[FIND_BILLS] Total policies in DB: ${totalCount}`);
    if (totalCount === 0) {
      return NextResponse.json({ bills: [], total: 0, message: "No policies in database. Run ingestion script first." });
    }

    // STRICT STATE FILTERING: Use OR to match any valid jurisdiction code/name
    const bills = await db.policy.findMany({
      where: {
        AND: [
          { policyType: { in: ["direct", "indirect"] } },
          {
            OR: validJurisdictions.map(code => ({
              OR: [
                { jurisdictionCode: { equals: code, mode: 'insensitive' as const } },
                { jurisdictionCode: { contains: code, mode: 'insensitive' as const } },
                { jurisdictionName: { equals: code, mode: 'insensitive' as const } },
                { jurisdictionName: { contains: code, mode: 'insensitive' as const } },
              ]
            }))
          }
        ]
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

    console.log(`[FIND_BILLS] Initial query returned ${bills.length} bills`);

    // SECONDARY FILTER: Double-check that all bills actually match the user's state
    const filteredBills = bills.filter(bill => 
      jurisdictionMatchesState(bill.jurisdictionCode, bill.jurisdictionName, normalizedState)
    );

    console.log(`[FIND_BILLS] After strict state filter: ${filteredBills.length} bills for ${normalizedState}`);

    if (filteredBills.length === 0) {
      // Log what jurisdictions we found in the database for debugging
      const sampleBills = await db.policy.findMany({
        select: { jurisdictionCode: true, jurisdictionName: true },
        distinct: ['jurisdictionCode'],
        take: 10,
      });
      console.log(`[FIND_BILLS] Available jurisdictions in DB:`, sampleBills.map(b => `${b.jurisdictionCode} (${b.jurisdictionName})`));
      
      return NextResponse.json({ 
        bills: [], 
        total: 0, 
        message: `No bills found for state: ${normalizedState}. This state may not be supported yet.`,
        userState: normalizedState,
        availableJurisdictions: sampleBills.map(b => b.jurisdictionCode).filter(Boolean)
      });
    }

    const enriched = filteredBills.map((bill) => {
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
        jurisdictionCode: bill.jurisdictionCode,
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

      let personalScore = ai ? ai.personalScore : 0.0;
      let climateScore = ai ? ai.climateScore : 0.0;
      let climateDirection = ai ? ai.climateDirection : "neutral";
      const relevance = ai ? ai.relevance : Math.max(b.climateHint, b.personalHint) * 0.35;

      if (climateDirection === "neutral") climateScore = 0.0;
      if (climateScore === 0) climateDirection = "neutral";
      if (personalScore < 0.01) personalScore = 0.0;

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
        jurisdictionCode: b.jurisdictionCode,
        jurisdictionName: b.jurisdictionName,
        status: b.status,
        dateIntroduced: b.dateIntroduced,
        tags: b.tags,
        sources: b.sources,
        _rank: rank,
        _scoredBy: ai ? "openai+contrast" : "fallback",
      };
    });

    const included = combined.filter((b) => {
      const hasScore = b.personalScore > 0 || b.climateScore > 0;
      const isRelevant = b.relevance >= RELEVANCE_THRESHOLD;
      return hasScore || isRelevant;
    });

    const relevantBills = included
      .sort((a, b) => b._rank - a._rank)
      .slice(0, 30)
      .map(({ _rank, _scoredBy, ...rest }) => rest);

    console.log(`[FIND_BILLS] Returning ${relevantBills.length} bills for ${normalizedState}\n`);

    return NextResponse.json({
      bills: relevantBills,
      total: relevantBills.length,
      userState: normalizedState,
      scoringExplanation: {
        methodology: "AI-led scoring with improved climate impact detection. Recognizes indirect benefits like barrier removal and market acceleration.",
        stateFiltering: `Bills strictly filtered to ${normalizedState} jurisdiction only.`,
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

async function analyzeBill(billId: string, userProfile: UserProfile): Promise<NextResponse> {
  console.log(`\n[ANALYZE_BILL] Starting comprehensive analysis for bill: ${billId}`);

  try {
    const db = getDatabaseClient();

    const bill = await db.policy.findUnique({
      where: { id: billId },
      include: { 
        tags: { select: { tag: true } },
        sources: {
          select: { url: true, name: true, sourceType: true }
        }
      },
    });

    if (!bill) {
      console.error(`[ANALYZE_BILL] Bill not found: ${billId}`);
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Verify the bill is from the user's state
    if (!jurisdictionMatchesState(bill.jurisdictionCode, bill.jurisdictionName, userProfile.state)) {
      console.warn(`[ANALYZE_BILL] Bill ${billId} is from ${bill.jurisdictionCode}, but user is from ${userProfile.state}`);
      // Still allow analysis but log the mismatch
    }

    console.log(`[ANALYZE_BILL] Found bill: ${bill.title} (${bill.jurisdictionCode})`);

    // First, get the scoring for this bill to ensure consistency
    const tags = bill.tags.map((t) => t.tag);
    const text = joinLowercase(bill.title, bill.summary);
    const { climateHint, personalHint } = computeHints(tags, text);

    const openai = getOpenAIClient();
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    // Get the original scores for this bill to ensure analysis aligns with ratings
    let billScores: AIResult | null = null;
    try {
      const scoringResult = await aiScoreBillsBatch(openai, model, userProfile, [{
        id: bill.id,
        title: bill.title,
        summary: bill.summary || "",
        tags,
        climateHint,
        personalHint
      }]);
      billScores = scoringResult[bill.id] || null;
      console.log(`[ANALYZE_BILL] Retrieved scores - Personal: ${billScores?.personalScore}, Climate: ${billScores?.climateScore} (${billScores?.climateDirection})`);
    } catch (e) {
      console.warn("[ANALYZE_BILL] Could not fetch scores, proceeding without them:", e);
    }

    const systemPrompt = `You are Climate Impact Compass, an expert policy analyst created by Leo Levitt.

Provide DETAILED, HYPER-PERSONALIZED analysis for everyday citizens. Write in simple, clear language.

${billScores ? `CRITICAL - ALIGNMENT WITH SCORES:
Personal: ${billScores.personalScore}/10 (${getPersonalScoreLabel(billScores.personalScore)})
Climate: ${billScores.climateScore}/10 ${billScores.climateDirection} (${getClimateScoreLabel(billScores.climateScore, billScores.climateDirection)})
Your analysis MUST align with these scores. Don't contradict them.
` : ''}

RULES:
1. Base analysis ONLY on bill text provided - no hallucinations
2. If dollar amounts/dates not in bill, say "Not specified"
3. Be hyper-specific to THIS user: ${userProfile.housing_status} in ${userProfile.property_type}, ZIP ${userProfile.zip}, income ${userProfile.household_income}
4. Reference specific cities/regions in ${userProfile.state}
5. Provide 6-10 items per major section
6. Use concrete examples: "Like a $500 Home Depot rebate"
7. Translate jargon: "heating system (HVAC)" not "HVAC"

OUTPUT STRICT JSON:
{
  "overview": {
    "plain_english_summary": "5-6 sentences, simple language, concrete examples for ${userProfile.state}",
    "what_this_means_for_you": "4-5 sentences for THIS user's exact situation",
    "key_provisions": ["8-10 detailed provisions"],
    "timeline_and_status": {
      "current_status": "string",
      "when_it_takes_effect": "string",
      "key_deadlines": ["array"],
      "what_needs_to_happen_next": "string"
    }
  },
  "your_specific_situation": {
    "relevance_to_you": "3-4 sentences",
    "provisions_that_apply_to_you": ["6-8 items referencing their profile"],
    "provisions_that_dont_apply": ["3-4 items"],
    "your_best_opportunities": ["4-5 ranked opportunities"],
    "your_biggest_barriers": ["3-4 barriers"]
  },
  "financial_impact_for_you": {
    "bottom_line": "3-4 sentences",
    "specific_benefits_for_your_situation": ["8-10 benefits with dollar amounts when possible"],
    "how_you_qualify": ["6-8 criteria checked against their profile"],
    "estimated_savings_range": "string",
    "breakdown_by_provision": ["6-8 items: each provision's financial impact"],
    "how_to_actually_get_the_money": ["6-8 actionable steps"],
    "potential_obstacles": ["5-6 realistic barriers"],
    "upfront_costs": "string"
  },
  "environmental_impact_explained": {
    "what_this_means_for_climate": "4-5 sentences in simple terms",
    "local_environmental_benefits": ["7-8 tangible impacts in ${userProfile.state}, mention cities"],
    "if_you_participate_personally": ["6-7 items with comparisons"],
    "bigger_picture": "3-4 sentences",
    "why_this_matters_for_your_community": ["5-6 local benefits"],
    "state_and_regional_context": ["4-5 items about ${userProfile.state} climate goals"]
  },
  "detailed_bill_provisions": {
    "provision_by_provision_analysis": ["6-8 provisions with: what it does, impact on THIS user, dollars, example"],
    "which_parts_matter_most_to_you": ["4-5 ranked provisions"],
    "implementation_mechanisms": ["4-5 how it's implemented"],
    "funding_sources": ["3-4 where money comes from"]
  },
  "eligibility_and_requirements": {
    "who_this_is_for": ["8-10 specific eligible situations"],
    "who_this_is_NOT_for": ["4-5 ineligible situations"],
    "your_eligibility_assessment": ["5-6 checks against THIS user's profile"],
    "documentation_youll_need": ["7-8 specific documents"],
    "income_requirements": "string with comparison to user's income",
    "property_requirements": ["array"],
    "timing_requirements": ["array"],
    "special_considerations": ["4-5 exceptions"]
  },
  "what_we_know_and_dont_know": {
    "definitely_established": ["8-10 certain facts"],
    "still_to_be_determined": ["6-8 unknowns"],
    "potential_risks_and_downsides": ["6-7 honest risks for THIS user"],
    "questions_nobody_can_answer_yet": ["5-6 unknowns"],
    "what_to_watch_for": ["4-5 monitoring items"]
  },
  "your_action_plan": {
    "do_this_now": ["5-6 immediate actions"],
    "do_this_soon": ["6-7 next 3-6 months"],
    "plan_for_later": ["4-5 long-term"],
    "questions_to_ask": {
      "ask_your_utility_company": ["5-6 questions"],
      "ask_contractors": ["5-6 questions"],
      "ask_your_state_agency": ["5-6 questions"]
    },
    "resources_and_help": ["6-7 ${userProfile.state} resources"],
    "decision_framework": ["4-5 key decision factors"]
  },
  "real_world_context": {
    "similar_programs": ["4-5 if known"],
    "what_makes_this_different": ["3-4 differences"],
    "potential_challenges": ["6-7 realistic challenges in ${userProfile.state}"],
    "success_factors": ["5-6 success factors"],
    "lessons_from_other_states": ["3-4 if applicable"]
  },
  "local_and_regional_impact": {
    "cities_and_regions_affected": ["6-7 specific places in ${userProfile.state}"],
    "your_area_specifically": ["5-6 impacts near ZIP ${userProfile.zip}"],
    "urban_vs_rural": "string",
    "local_economic_impact": ["4-5 economic effects"],
    "community_benefits": ["4-5 community benefits"]
  },
  "common_questions_answered": {
    "is_this_a_tax_increase": "detailed answer for income ${userProfile.household_income}",
    "do_i_have_to_do_anything": "detailed answer",
    "what_if_i_rent": "answer for ${userProfile.housing_status}",
    "what_if_im_low_income": "answer comparing to ${userProfile.household_income}",
    "what_if_i_own_a_business": "answer (user: ${userProfile.own_business})",
    "how_long_does_this_take": "realistic timeline",
    "is_the_paperwork_complicated": "honest assessment",
    "what_about_maintenance": "ongoing costs if applicable",
    "can_i_combine_with_other_programs": "stacking in ${userProfile.state}",
    "other_important_questions": ["5-6 bill-specific questions"]
  }
}`;

    const userPrompt = `Analyze this bill with DEPTH and RIGOR for this SPECIFIC user.

USER'S COMPLETE PROFILE:
- Location: ZIP ${userProfile.zip}, ${userProfile.state}
- Housing: ${userProfile.housing_status}, ${userProfile.property_type}
- Home age: ${userProfile.home_age}
- Heating: ${userProfile.current_heating}
- Can upgrade: ${userProfile.can_make_upgrades}
- Solar interest: ${userProfile.interested_in_solar}
- Vehicle: ${userProfile.has_car ? 'Has car' : 'No car'}, next decision: ${userProfile.next_vehicle_timeline}
- Commute: ${userProfile.commute_distance}
- Income: ${userProfile.household_income}
- Household: ${userProfile.household_size}
- Business: ${userProfile.own_business}
- Job: ${userProfile.job_sector || "Not specified"}

BILL TO ANALYZE:
Title: ${bill.title}
Status: ${bill.status}
Summary: ${bill.summary || "No summary"}
Tags: ${bill.tags.map((t) => t.tag).join(", ")}
Jurisdiction: ${bill.jurisdictionName} (${bill.jurisdictionCode})
Date: ${bill.dateIntroduced?.toISOString().split('T')[0] || "Unknown"}

Be thorough. Be specific. Don't hallucinate. Align with the scores provided.`;

    console.log(`[ANALYZE_BILL] Sending comprehensive analysis request...`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Use faster model for comprehensive analysis
      temperature: 0.2, // Lower temperature for faster, more focused responses
      response_format: { type: "json_object" } as any,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const rawContent = response.choices?.[0]?.message?.content ?? "";
    console.log(`[ANALYZE_BILL] Received ${rawContent.length} chars`);

    let analysis: any = null;

    try {
      analysis = JSON.parse(rawContent);
    } catch {
      const start = rawContent.indexOf("{");
      const end = rawContent.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        analysis = JSON.parse(rawContent.slice(start, end + 1));
      }
    }

    if (!analysis) {
      return NextResponse.json({ 
        error: "AI returned invalid response"
      }, { status: 502 });
    }

    const safeAnalysis = {
      overview: {
        plain_english_summary: analysis.overview?.plain_english_summary || "Analysis unavailable",
        what_this_means_for_you: analysis.overview?.what_this_means_for_you || "Unable to determine personal impact",
        key_provisions: Array.isArray(analysis.overview?.key_provisions) ? analysis.overview.key_provisions : [],
        timeline_and_status: {
          current_status: analysis.overview?.timeline_and_status?.current_status || "Status unclear",
          when_it_takes_effect: analysis.overview?.timeline_and_status?.when_it_takes_effect || "Not specified",
          key_deadlines: Array.isArray(analysis.overview?.timeline_and_status?.key_deadlines) ? analysis.overview.timeline_and_status.key_deadlines : [],
          what_needs_to_happen_next: analysis.overview?.timeline_and_status?.what_needs_to_happen_next || "Unknown"
        },
        // BACKWARD COMPATIBILITY
        timeline: analysis.overview?.timeline_and_status?.when_it_takes_effect || "Not specified",
        implementation_status: analysis.overview?.timeline_and_status?.current_status || "Status unclear"
      },
      your_specific_situation: {
        relevance_to_you: analysis.your_specific_situation?.relevance_to_you || "Relevance unclear",
        provisions_that_apply_to_you: Array.isArray(analysis.your_specific_situation?.provisions_that_apply_to_you) ? analysis.your_specific_situation.provisions_that_apply_to_you : [],
        provisions_that_dont_apply: Array.isArray(analysis.your_specific_situation?.provisions_that_dont_apply) ? analysis.your_specific_situation.provisions_that_dont_apply : [],
        your_best_opportunities: Array.isArray(analysis.your_specific_situation?.your_best_opportunities) ? analysis.your_specific_situation.your_best_opportunities : [],
        your_biggest_barriers: Array.isArray(analysis.your_specific_situation?.your_biggest_barriers) ? analysis.your_specific_situation.your_biggest_barriers : []
      },
      financial_impact_for_you: {
        bottom_line: analysis.financial_impact_for_you?.bottom_line || "Financial impact unclear",
        specific_benefits_for_your_situation: Array.isArray(analysis.financial_impact_for_you?.specific_benefits_for_your_situation) ? analysis.financial_impact_for_you.specific_benefits_for_your_situation : [],
        how_you_qualify: Array.isArray(analysis.financial_impact_for_you?.how_you_qualify) ? analysis.financial_impact_for_you.how_you_qualify : [],
        estimated_savings_range: analysis.financial_impact_for_you?.estimated_savings_range || "Cannot estimate",
        breakdown_by_provision: Array.isArray(analysis.financial_impact_for_you?.breakdown_by_provision) ? analysis.financial_impact_for_you.breakdown_by_provision : [],
        how_to_actually_get_the_money: Array.isArray(analysis.financial_impact_for_you?.how_to_actually_get_the_money) ? analysis.financial_impact_for_you.how_to_actually_get_the_money : [],
        potential_obstacles: Array.isArray(analysis.financial_impact_for_you?.potential_obstacles) ? analysis.financial_impact_for_you.potential_obstacles : [],
        upfront_costs: analysis.financial_impact_for_you?.upfront_costs || "Not specified"
      },
      // BACKWARD COMPATIBILITY
      personalized_financial_analysis: {
        direct_benefits: Array.isArray(analysis.financial_impact_for_you?.specific_benefits_for_your_situation) ? analysis.financial_impact_for_you.specific_benefits_for_your_situation : [],
        eligibility_factors: Array.isArray(analysis.financial_impact_for_you?.how_you_qualify) ? analysis.financial_impact_for_you.how_you_qualify : [],
        estimated_value: analysis.financial_impact_for_you?.estimated_savings_range || "Cannot estimate",
        access_pathway: Array.isArray(analysis.financial_impact_for_you?.how_to_actually_get_the_money) ? analysis.financial_impact_for_you.how_to_actually_get_the_money : [],
        barriers: Array.isArray(analysis.financial_impact_for_you?.potential_obstacles) ? analysis.financial_impact_for_you.potential_obstacles : []
      },
      environmental_impact_explained: {
        what_this_means_for_climate: analysis.environmental_impact_explained?.what_this_means_for_climate || "Environmental impact unclear",
        local_environmental_benefits: Array.isArray(analysis.environmental_impact_explained?.local_environmental_benefits) ? analysis.environmental_impact_explained.local_environmental_benefits : [],
        if_you_participate_personally: Array.isArray(analysis.environmental_impact_explained?.if_you_participate_personally) ? analysis.environmental_impact_explained.if_you_participate_personally : [],
        bigger_picture: analysis.environmental_impact_explained?.bigger_picture || "Broader impact unclear",
        why_this_matters_for_your_community: Array.isArray(analysis.environmental_impact_explained?.why_this_matters_for_your_community) ? analysis.environmental_impact_explained.why_this_matters_for_your_community : [],
        state_and_regional_context: Array.isArray(analysis.environmental_impact_explained?.state_and_regional_context) ? analysis.environmental_impact_explained.state_and_regional_context : []
      },
      // BACKWARD COMPATIBILITY
      personalized_climate_analysis: {
        environmental_benefits: Array.isArray(analysis.environmental_impact_explained?.local_environmental_benefits) ? analysis.environmental_impact_explained.local_environmental_benefits : [],
        local_impact: Array.isArray(analysis.environmental_impact_explained?.local_environmental_benefits) ? analysis.environmental_impact_explained.local_environmental_benefits : [],
        personal_contribution: Array.isArray(analysis.environmental_impact_explained?.if_you_participate_personally) ? analysis.environmental_impact_explained.if_you_participate_personally : [],
        scale_and_scope: analysis.environmental_impact_explained?.bigger_picture || "Unclear"
      },
      detailed_bill_provisions: {
        provision_by_provision_analysis: Array.isArray(analysis.detailed_bill_provisions?.provision_by_provision_analysis) ? analysis.detailed_bill_provisions.provision_by_provision_analysis : [],
        which_parts_matter_most_to_you: Array.isArray(analysis.detailed_bill_provisions?.which_parts_matter_most_to_you) ? analysis.detailed_bill_provisions.which_parts_matter_most_to_you : [],
        implementation_mechanisms: Array.isArray(analysis.detailed_bill_provisions?.implementation_mechanisms) ? analysis.detailed_bill_provisions.implementation_mechanisms : [],
        funding_sources: Array.isArray(analysis.detailed_bill_provisions?.funding_sources) ? analysis.detailed_bill_provisions.funding_sources : []
      },
      eligibility_and_requirements: {
        who_this_is_for: Array.isArray(analysis.eligibility_and_requirements?.who_this_is_for) ? analysis.eligibility_and_requirements.who_this_is_for : [],
        who_this_is_NOT_for: Array.isArray(analysis.eligibility_and_requirements?.who_this_is_NOT_for) ? analysis.eligibility_and_requirements.who_this_is_NOT_for : [],
        your_eligibility_assessment: Array.isArray(analysis.eligibility_and_requirements?.your_eligibility_assessment) ? analysis.eligibility_and_requirements.your_eligibility_assessment : [],
        documentation_youll_need: Array.isArray(analysis.eligibility_and_requirements?.documentation_youll_need) ? analysis.eligibility_and_requirements.documentation_youll_need : [],
        income_requirements: analysis.eligibility_and_requirements?.income_requirements || "Not specified",
        property_requirements: Array.isArray(analysis.eligibility_and_requirements?.property_requirements) ? analysis.eligibility_and_requirements.property_requirements : [],
        timing_requirements: Array.isArray(analysis.eligibility_and_requirements?.timing_requirements) ? analysis.eligibility_and_requirements.timing_requirements : [],
        special_considerations: Array.isArray(analysis.eligibility_and_requirements?.special_considerations) ? analysis.eligibility_and_requirements.special_considerations : []
      },
      // BACKWARD COMPATIBILITY
      detailed_requirements: {
        who_qualifies: Array.isArray(analysis.eligibility_and_requirements?.who_this_is_for) ? analysis.eligibility_and_requirements.who_this_is_for : [],
        documentation_needed: Array.isArray(analysis.eligibility_and_requirements?.documentation_youll_need) ? analysis.eligibility_and_requirements.documentation_youll_need : [],
        income_limits: analysis.eligibility_and_requirements?.income_requirements || "Not specified",
        other_restrictions: [
          ...(Array.isArray(analysis.eligibility_and_requirements?.property_requirements) ? analysis.eligibility_and_requirements.property_requirements : []),
          ...(Array.isArray(analysis.eligibility_and_requirements?.timing_requirements) ? analysis.eligibility_and_requirements.timing_requirements : [])
        ]
      },
      what_we_know_and_dont_know: {
        definitely_established: Array.isArray(analysis.what_we_know_and_dont_know?.definitely_established) ? analysis.what_we_know_and_dont_know.definitely_established : [],
        still_to_be_determined: Array.isArray(analysis.what_we_know_and_dont_know?.still_to_be_determined) ? analysis.what_we_know_and_dont_know.still_to_be_determined : [],
        potential_risks_and_downsides: Array.isArray(analysis.what_we_know_and_dont_know?.potential_risks_and_downsides) ? analysis.what_we_know_and_dont_know.potential_risks_and_downsides : [],
        questions_nobody_can_answer_yet: Array.isArray(analysis.what_we_know_and_dont_know?.questions_nobody_can_answer_yet) ? analysis.what_we_know_and_dont_know.questions_nobody_can_answer_yet : [],
        what_to_watch_for: Array.isArray(analysis.what_we_know_and_dont_know?.what_to_watch_for) ? analysis.what_we_know_and_dont_know.what_to_watch_for : []
      },
      // BACKWARD COMPATIBILITY
      certainties_and_uncertainties: {
        what_is_certain: Array.isArray(analysis.what_we_know_and_dont_know?.definitely_established) ? analysis.what_we_know_and_dont_know.definitely_established : [],
        what_depends_on_implementation: Array.isArray(analysis.what_we_know_and_dont_know?.still_to_be_determined) ? analysis.what_we_know_and_dont_know.still_to_be_determined : [],
        missing_information: Array.isArray(analysis.what_we_know_and_dont_know?.questions_nobody_can_answer_yet) ? analysis.what_we_know_and_dont_know.questions_nobody_can_answer_yet : [],
        risks_and_caveats: Array.isArray(analysis.what_we_know_and_dont_know?.potential_risks_and_downsides) ? analysis.what_we_know_and_dont_know.potential_risks_and_downsides : []
      },
      your_action_plan: {
        do_this_now: Array.isArray(analysis.your_action_plan?.do_this_now) ? analysis.your_action_plan.do_this_now : [],
        do_this_soon: Array.isArray(analysis.your_action_plan?.do_this_soon) ? analysis.your_action_plan.do_this_soon : [],
        plan_for_later: Array.isArray(analysis.your_action_plan?.plan_for_later) ? analysis.your_action_plan.plan_for_later : [],
        questions_to_ask: {
          ask_your_utility_company: Array.isArray(analysis.your_action_plan?.questions_to_ask?.ask_your_utility_company) ? analysis.your_action_plan.questions_to_ask.ask_your_utility_company : [],
          ask_contractors: Array.isArray(analysis.your_action_plan?.questions_to_ask?.ask_contractors) ? analysis.your_action_plan.questions_to_ask.ask_contractors : [],
          ask_your_state_agency: Array.isArray(analysis.your_action_plan?.questions_to_ask?.ask_your_state_agency) ? analysis.your_action_plan.questions_to_ask.ask_your_state_agency : []
        },
        resources_and_help: Array.isArray(analysis.your_action_plan?.resources_and_help) ? analysis.your_action_plan.resources_and_help : [],
        decision_framework: Array.isArray(analysis.your_action_plan?.decision_framework) ? analysis.your_action_plan.decision_framework : []
      },
      // BACKWARD COMPATIBILITY
      action_plan: {
        immediate_steps: Array.isArray(analysis.your_action_plan?.do_this_now) ? analysis.your_action_plan.do_this_now : [],
        medium_term_steps: Array.isArray(analysis.your_action_plan?.do_this_soon) ? analysis.your_action_plan.do_this_soon : [],
        long_term_considerations: Array.isArray(analysis.your_action_plan?.plan_for_later) ? analysis.your_action_plan.plan_for_later : [],
        questions_to_ask: [
          ...(Array.isArray(analysis.your_action_plan?.questions_to_ask?.ask_your_utility_company) ? analysis.your_action_plan.questions_to_ask.ask_your_utility_company : []),
          ...(Array.isArray(analysis.your_action_plan?.questions_to_ask?.ask_contractors) ? analysis.your_action_plan.questions_to_ask.ask_contractors : []),
          ...(Array.isArray(analysis.your_action_plan?.questions_to_ask?.ask_your_state_agency) ? analysis.your_action_plan.questions_to_ask.ask_your_state_agency : [])
        ]
      },
      real_world_context: {
        similar_programs: Array.isArray(analysis.real_world_context?.similar_programs) ? analysis.real_world_context.similar_programs : [],
        what_makes_this_different: Array.isArray(analysis.real_world_context?.what_makes_this_different) ? analysis.real_world_context.what_makes_this_different : [],
        potential_challenges: Array.isArray(analysis.real_world_context?.potential_challenges) ? analysis.real_world_context.potential_challenges : [],
        success_factors: Array.isArray(analysis.real_world_context?.success_factors) ? analysis.real_world_context.success_factors : [],
        lessons_from_other_states: Array.isArray(analysis.real_world_context?.lessons_from_other_states) ? analysis.real_world_context.lessons_from_other_states : []
      },
      // BACKWARD COMPATIBILITY
      local_context: {
        local_programs: Array.isArray(analysis.real_world_context?.similar_programs) ? analysis.real_world_context.similar_programs : [],
        local_considerations: Array.isArray(analysis.real_world_context?.potential_challenges) ? analysis.real_world_context.potential_challenges : [],
        community_resources: Array.isArray(analysis.your_action_plan?.resources_and_help) ? analysis.your_action_plan.resources_and_help : []
      },
      local_and_regional_impact: {
        cities_and_regions_affected: Array.isArray(analysis.local_and_regional_impact?.cities_and_regions_affected) ? analysis.local_and_regional_impact.cities_and_regions_affected : [],
        your_area_specifically: Array.isArray(analysis.local_and_regional_impact?.your_area_specifically) ? analysis.local_and_regional_impact.your_area_specifically : [],
        urban_vs_rural: analysis.local_and_regional_impact?.urban_vs_rural || "Not specified",
        local_economic_impact: Array.isArray(analysis.local_and_regional_impact?.local_economic_impact) ? analysis.local_and_regional_impact.local_economic_impact : [],
        community_benefits: Array.isArray(analysis.local_and_regional_impact?.community_benefits) ? analysis.local_and_regional_impact.community_benefits : []
      },
      common_questions_answered: {
        is_this_a_tax_increase: analysis.common_questions_answered?.is_this_a_tax_increase || "Not specified",
        do_i_have_to_do_anything: analysis.common_questions_answered?.do_i_have_to_do_anything || "Not specified",
        what_if_i_rent: analysis.common_questions_answered?.what_if_i_rent || "Not specified",
        what_if_im_low_income: analysis.common_questions_answered?.what_if_im_low_income || "Not specified",
        what_if_i_own_a_business: analysis.common_questions_answered?.what_if_i_own_a_business || "Not specified",
        how_long_does_this_take: analysis.common_questions_answered?.how_long_does_this_take || "Not specified",
        is_the_paperwork_complicated: analysis.common_questions_answered?.is_the_paperwork_complicated || "Not specified",
        what_about_maintenance: analysis.common_questions_answered?.what_about_maintenance || "Not specified",
        can_i_combine_with_other_programs: analysis.common_questions_answered?.can_i_combine_with_other_programs || "Not specified",
        other_important_questions: Array.isArray(analysis.common_questions_answered?.other_important_questions) ? analysis.common_questions_answered.other_important_questions : []
      }
    };

    console.log(`[ANALYZE_BILL] Analysis complete\n`);
    
    return NextResponse.json({ 
      analysis: safeAnalysis,
      bill: {
        id: bill.id,
        title: bill.title,
        status: bill.status,
        jurisdictionCode: bill.jurisdictionCode,
        jurisdictionName: bill.jurisdictionName,
        dateIntroduced: bill.dateIntroduced?.toISOString() || null,
        sources: bill.sources
      },
      // Include the scores so frontend can display them consistently
      scores: billScores ? {
        personalScore: billScores.personalScore,
        personalLabel: getPersonalScoreLabel(billScores.personalScore),
        personalReasons: billScores.personalReasons,
        climateScore: billScores.climateScore,
        climateLabel: getClimateScoreLabel(billScores.climateScore, billScores.climateDirection),
        climateDirection: billScores.climateDirection,
        climateReasons: billScores.climateReasons
      } : null
    });
  } catch (error: any) {
    console.error("[ANALYZE_BILL] Error:", error);
    return NextResponse.json({ 
      error: "Failed to analyze bill", 
      details: error.message
    }, { status: 500 });
  }
}

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
      if (!body.billId) {
        return NextResponse.json({ error: "billId required" }, { status: 400 });
      }
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