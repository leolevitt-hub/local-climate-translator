// app/api/analyze/route.ts
// Climate Impact Compass — V6 Enhanced Climate Scoring
// Created by Leo Levitt
//
// V6 improvements:
// - Enhanced climate scoring that recognizes INDIRECT climate benefits
// - Better detection of policies that enable/accelerate clean energy
// - Recognition that removing barriers = climate positive
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
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2, timeout: 60000 });
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
  console.log(`\n[FIND_BILLS] Starting for state: ${userProfile.state}`);

  if (!userProfile.state) return NextResponse.json({ error: "State is required" }, { status: 400 });

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

    console.log(`[FIND_BILLS] Returning ${relevantBills.length} bills\n`);

    return NextResponse.json({
      bills: relevantBills,
      total: relevantBills.length,
      scoringExplanation: {
        methodology: "AI-led scoring with improved climate impact detection. Recognizes indirect benefits like barrier removal and market acceleration.",
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

    console.log(`[ANALYZE_BILL] Found bill: ${bill.title}`);

    const openai = getOpenAIClient();
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const systemPrompt = `You are Climate Impact Compass, an expert policy analyst created by Leo Levitt.

Your role is to provide COMPREHENSIVE, RIGOROUS, PERSONALIZED analysis of climate policy bills.

CRITICAL RULES - NO HALLUCINATION:
1. Base ALL analysis STRICTLY on the bill text provided
2. If specific numbers (dollar amounts, percentages, timelines) are NOT in the bill text, say "Not specified in bill text"
3. Do NOT invent or estimate: dollar amounts, income limits, deadlines, program names, or agency names
4. When uncertain, say "Depends on implementation" or "Not clear from bill text"
5. Always distinguish between what the bill DEFINITELY does vs. what MIGHT happen

IMPROVED CLIMATE IMPACT ANALYSIS:
- Recognize INDIRECT climate benefits (barrier removal, market acceleration, workforce development)
- Consider that policies enabling clean energy adoption ARE climate positive
- Evaluate POTENTIAL emissions impact from increased clean energy deployment
- Account for market transformation effects

PERSONALIZATION REQUIREMENTS:
- Use the user's SPECIFIC profile details in your analysis
- Reference their ZIP code, housing situation, income range, vehicle status, etc.
- Explain how THEIR SPECIFIC circumstances affect eligibility and benefit
- Use their location (${userProfile.zip}, ${userProfile.state}) when discussing local impacts

DEPTH REQUIREMENTS:
- Provide 4-6 items per section (not just 2-3)
- Include specific mechanisms, not vague statements
- Consider both immediate and long-term implications
- Think through implementation challenges

OUTPUT ONLY VALID JSON in this exact structure:
{
  "overview": {
    "plain_english_summary": "3-4 sentences explaining what this bill does in clear language",
    "key_provisions": ["List 4-6 main things this bill establishes or changes"],
    "timeline": "When this takes effect and key deadlines (or 'Not specified')",
    "implementation_status": "Current status and what needs to happen next"
  },
  "personalized_financial_analysis": {
    "direct_benefits": ["4-6 specific financial benefits for THIS user based on their profile"],
    "eligibility_factors": ["How THIS user's specific situation affects eligibility"],
    "estimated_value": "Range of potential savings (or 'Cannot estimate from bill text')",
    "access_pathway": ["3-4 specific steps THIS user would take"],
    "barriers": ["2-3 potential obstacles THIS user might face"]
  },
  "personalized_climate_analysis": {
    "environmental_benefits": ["4-5 specific climate/environmental outcomes, INCLUDING indirect effects"],
    "local_impact": ["How this affects their area specifically"],
    "personal_contribution": ["How THIS user's participation would contribute"],
    "scale_and_scope": "How significant is the climate impact"
  },
  "detailed_requirements": {
    "who_qualifies": ["4-5 specific eligibility criteria"],
    "documentation_needed": ["What THIS user would need to provide"],
    "income_limits": "Specific limits if stated, or 'Not specified'",
    "other_restrictions": ["Geographic, property, or timing restrictions"]
  },
  "certainties_and_uncertainties": {
    "what_is_certain": ["4-5 things definitely established"],
    "what_depends_on_implementation": ["3-4 things requiring future decisions"],
    "missing_information": ["2-3 key details not in bill"],
    "risks_and_caveats": ["2-3 potential issues or limitations"]
  },
  "action_plan": {
    "immediate_steps": ["3 actions THIS user can take now"],
    "medium_term_steps": ["2-3 actions for next 3-6 months"],
    "long_term_considerations": ["2 strategic considerations"],
    "questions_to_ask": ["5-6 specific questions for utilities/contractors/agencies"]
  },
  "local_context": {
    "local_programs": ["Existing programs this connects to (only if known)"],
    "local_considerations": ["2-3 factors specific to their area"],
    "community_resources": ["Where to get help in their area"]
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
Jurisdiction: ${bill.jurisdictionName}
Date: ${bill.dateIntroduced?.toISOString().split('T')[0] || "Unknown"}

Be thorough. Be specific. Don't hallucinate.`;

    console.log(`[ANALYZE_BILL] Sending comprehensive analysis request...`);

    const response = await openai.chat.completions.create({
      model,
      temperature: 0.3,
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
        key_provisions: Array.isArray(analysis.overview?.key_provisions) ? analysis.overview.key_provisions : [],
        timeline: analysis.overview?.timeline || "Not specified",
        implementation_status: analysis.overview?.implementation_status || "Status unclear"
      },
      personalized_financial_analysis: {
        direct_benefits: Array.isArray(analysis.personalized_financial_analysis?.direct_benefits) ? analysis.personalized_financial_analysis.direct_benefits : [],
        eligibility_factors: Array.isArray(analysis.personalized_financial_analysis?.eligibility_factors) ? analysis.personalized_financial_analysis.eligibility_factors : [],
        estimated_value: analysis.personalized_financial_analysis?.estimated_value || "Cannot estimate",
        access_pathway: Array.isArray(analysis.personalized_financial_analysis?.access_pathway) ? analysis.personalized_financial_analysis.access_pathway : [],
        barriers: Array.isArray(analysis.personalized_financial_analysis?.barriers) ? analysis.personalized_financial_analysis.barriers : []
      },
      personalized_climate_analysis: {
        environmental_benefits: Array.isArray(analysis.personalized_climate_analysis?.environmental_benefits) ? analysis.personalized_climate_analysis.environmental_benefits : [],
        local_impact: Array.isArray(analysis.personalized_climate_analysis?.local_impact) ? analysis.personalized_climate_analysis.local_impact : [],
        personal_contribution: Array.isArray(analysis.personalized_climate_analysis?.personal_contribution) ? analysis.personalized_climate_analysis.personal_contribution : [],
        scale_and_scope: analysis.personalized_climate_analysis?.scale_and_scope || "Unclear"
      },
      detailed_requirements: {
        who_qualifies: Array.isArray(analysis.detailed_requirements?.who_qualifies) ? analysis.detailed_requirements.who_qualifies : [],
        documentation_needed: Array.isArray(analysis.detailed_requirements?.documentation_needed) ? analysis.detailed_requirements.documentation_needed : [],
        income_limits: analysis.detailed_requirements?.income_limits || "Not specified",
        other_restrictions: Array.isArray(analysis.detailed_requirements?.other_restrictions) ? analysis.detailed_requirements.other_restrictions : []
      },
      certainties_and_uncertainties: {
        what_is_certain: Array.isArray(analysis.certainties_and_uncertainties?.what_is_certain) ? analysis.certainties_and_uncertainties.what_is_certain : [],
        what_depends_on_implementation: Array.isArray(analysis.certainties_and_uncertainties?.what_depends_on_implementation) ? analysis.certainties_and_uncertainties.what_depends_on_implementation : [],
        missing_information: Array.isArray(analysis.certainties_and_uncertainties?.missing_information) ? analysis.certainties_and_uncertainties.missing_information : [],
        risks_and_caveats: Array.isArray(analysis.certainties_and_uncertainties?.risks_and_caveats) ? analysis.certainties_and_uncertainties.risks_and_caveats : []
      },
      action_plan: {
        immediate_steps: Array.isArray(analysis.action_plan?.immediate_steps) ? analysis.action_plan.immediate_steps : [],
        medium_term_steps: Array.isArray(analysis.action_plan?.medium_term_steps) ? analysis.action_plan.medium_term_steps : [],
        long_term_considerations: Array.isArray(analysis.action_plan?.long_term_considerations) ? analysis.action_plan.long_term_considerations : [],
        questions_to_ask: Array.isArray(analysis.action_plan?.questions_to_ask) ? analysis.action_plan.questions_to_ask : []
      },
      local_context: {
        local_programs: Array.isArray(analysis.local_context?.local_programs) ? analysis.local_context.local_programs : [],
        local_considerations: Array.isArray(analysis.local_context?.local_considerations) ? analysis.local_context.local_considerations : [],
        community_resources: Array.isArray(analysis.local_context?.community_resources) ? analysis.local_context.community_resources : []
      }
    };

    console.log(`[ANALYZE_BILL] Analysis complete\n`);
    
    return NextResponse.json({ 
      analysis: safeAnalysis,
      bill: {
        id: bill.id,
        title: bill.title,
        status: bill.status,
        jurisdictionName: bill.jurisdictionName,
        dateIntroduced: bill.dateIntroduced?.toISOString() || null,
        sources: bill.sources
      }
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