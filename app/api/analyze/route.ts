// app/api/analyze/route.ts
// Climate Impact Compass — V8 Rigorous Calibrated Scoring
// Created by Leo Levitt
//
// V8 improvements:
// - RIGOROUS scoring rubrics with specific calibration anchors
// - Climate scoring based on TANGIBLE emissions impact, not just adjacency
// - Financial scoring calibrated to actual dollar amounts
// - Supports NEGATIVE scores for harmful policies
// - Much deeper bill analysis with specific suggestions
// - Enhanced prompt engineering for more critical evaluation
// - ROBUST ERROR HANDLING for API failures

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export const runtime = "nodejs";

// Increase max duration for Vercel serverless functions
export const maxDuration = 60;

let prismaInstance: PrismaClient | null = null;

function getDatabaseClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is missing");
  }

  if (!prismaInstance) {
    try {
      const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
      prismaInstance = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });
      console.log("✓ Prisma client initialized");
    } catch (err: any) {
      console.error("Failed to initialize Prisma client:", err?.message || err);
      throw new Error(`Database connection failed: ${err?.message || "Unknown error"}`);
    }
  }
  return prismaInstance;
}

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is missing");
  }
  return new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY, 
    maxRetries: 2, 
    timeout: 120000 // 2 minutes
  });
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
};

// Get all valid jurisdiction codes for a state
function getStateJurisdictionCodes(stateCode: string): string[] {
  const normalized = stateCode.toUpperCase().trim();
  const mappings = STATE_NAME_MAP[normalized];
  if (mappings) {
    return mappings;
  }
  return [normalized];
}

// Check if a jurisdiction matches the user's state
function jurisdictionMatchesState(jurisdictionCode: string | null, jurisdictionName: string | null, userState: string): boolean {
  if (!userState) return false;
  
  const normalizedUserState = userState.toUpperCase().trim();
  const validCodes = getStateJurisdictionCodes(normalizedUserState);
  
  if (jurisdictionCode) {
    const normalizedJurisdiction = jurisdictionCode.toUpperCase().trim();
    if (validCodes.some(code => normalizedJurisdiction === code || normalizedJurisdiction.includes(code))) {
      return true;
    }
  }
  
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

function clamp(x: any, min: number, max: number): number {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, n));
}

function clampNeg10to10(x: any): number {
  return clamp(x, -10, 10);
}

function clamp0to1(x: any): number {
  return clamp(x, 0, 1);
}

function safeArray(v: any, max = 4): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string").slice(0, max);
}

function normalizeDirection(d: any): "positive" | "negative" | "neutral" {
  return d === "positive" || d === "negative" || d === "neutral" ? d : "neutral";
}

// ============================================================================
// SAFE JSON PARSING - Handles various edge cases
// ============================================================================

function safeParseJSON(raw: string): any | null {
  if (!raw || typeof raw !== "string") {
    console.warn("[safeParseJSON] Empty or invalid input");
    return null;
  }

  const trimmed = raw.trim();
  
  // Check if it looks like an error message instead of JSON
  if (trimmed.startsWith("An error") || trimmed.startsWith("Error") || trimmed.startsWith("<!DOCTYPE")) {
    console.error("[safeParseJSON] Received error message instead of JSON:", trimmed.substring(0, 200));
    return null;
  }

  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    // Try to extract JSON from the response
    const jsonStart = trimmed.indexOf("{");
    const jsonEnd = trimmed.lastIndexOf("}");
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      try {
        const extracted = trimmed.slice(jsonStart, jsonEnd + 1);
        return JSON.parse(extracted);
      } catch (e2) {
        console.error("[safeParseJSON] Failed to extract JSON:", trimmed.substring(0, 200));
        return null;
      }
    }
    
    console.error("[safeParseJSON] No valid JSON found:", trimmed.substring(0, 200));
    return null;
  }
}

// ============================================================================
// CALIBRATED SCORE LABELS - More granular and accurate
// ============================================================================

function getPersonalScoreLabel(score: number): string {
  if (score >= 9.0) return "Exceptional savings opportunity";
  if (score >= 8.0) return "Major savings opportunity";
  if (score >= 7.0) return "Strong savings potential";
  if (score >= 6.0) return "Good savings potential";
  if (score >= 5.0) return "Moderate savings potential";
  if (score >= 4.0) return "Some savings possible";
  if (score >= 3.0) return "Minor savings possible";
  if (score >= 2.0) return "Small indirect benefit";
  if (score >= 1.0) return "Minimal benefit";
  if (score > 0) return "Negligible benefit";
  if (score === 0) return "No direct financial impact";
  if (score >= -1.0) return "Negligible cost";
  if (score >= -2.0) return "Minor indirect cost";
  if (score >= -3.0) return "Some cost possible";
  if (score >= -4.0) return "Moderate cost possible";
  if (score >= -5.0) return "Notable cost likely";
  if (score >= -6.0) return "Significant cost likely";
  if (score >= -7.0) return "Substantial cost expected";
  if (score >= -8.0) return "Major cost expected";
  if (score >= -9.0) return "Severe cost expected";
  return "Extreme financial burden";
}

function getClimateScoreLabel(score: number, direction: "positive" | "negative" | "neutral"): string {
  if (direction === "neutral" || score === 0) return "Neutral climate impact";
  
  const magnitude = Math.abs(score);
  
  if (direction === "positive") {
    if (magnitude >= 9.0) return "Transformative climate benefit";
    if (magnitude >= 8.0) return "Major climate benefit";
    if (magnitude >= 7.0) return "Significant climate benefit";
    if (magnitude >= 6.0) return "Meaningful climate benefit";
    if (magnitude >= 5.0) return "Moderate climate benefit";
    if (magnitude >= 4.0) return "Some climate benefit";
    if (magnitude >= 3.0) return "Minor climate benefit";
    if (magnitude >= 2.0) return "Small climate benefit";
    if (magnitude >= 1.0) return "Minimal climate benefit";
    return "Negligible climate benefit";
  } else {
    if (magnitude >= 9.0) return "Catastrophic climate harm";
    if (magnitude >= 8.0) return "Severe climate harm";
    if (magnitude >= 7.0) return "Major climate harm";
    if (magnitude >= 6.0) return "Significant climate harm";
    if (magnitude >= 5.0) return "Moderate climate harm";
    if (magnitude >= 4.0) return "Some climate harm";
    if (magnitude >= 3.0) return "Minor climate harm";
    if (magnitude >= 2.0) return "Small climate harm";
    if (magnitude >= 1.0) return "Minimal climate harm";
    return "Negligible climate harm";
  }
}

// ============================================================================
// HINT COMPUTATION - Provides weak priors for AI scoring
// ============================================================================

function computeHints(tags: string[], text: string) {
  const t = text.toLowerCase();

  const directEmissionsKeywords = /(greenhouse gas|ghg|emission reduction|carbon cap|carbon tax|methane|co2|decarboniz)/i;
  const hasDirectEmissions = directEmissionsKeywords.test(t);

  const renewableKeywords = /(solar|wind|geothermal|hydropower|renewable portfolio|clean energy standard|100% clean)/i;
  const hasRenewable = renewableKeywords.test(t);

  const electrificationKeywords = /(heat pump|electric vehicle mandate|zev mandate|building electrification|gas ban|fossil fuel phase)/i;
  const hasElectrification = electrificationKeywords.test(t);

  const infrastructureKeywords = /(grid modernization|transmission|battery storage|microgrid|charging infrastructure)/i;
  const hasInfrastructure = infrastructureKeywords.test(t);

  const supportiveKeywords = /(permitting|workforce|training|study|report|planning|advisory)/i;
  const hasSupportive = supportiveKeywords.test(t);

  const harmfulKeywords = /(new pipeline|lng terminal|new gas plant|fracking|coal|drilling|fossil fuel subsid|rollback|repeal.*environmental)/i;
  const hasHarmful = harmfulKeywords.test(t);

  let climateHint = 0.0;
  if (hasHarmful) climateHint = -0.6;
  else if (hasDirectEmissions || hasElectrification) climateHint = 0.7;
  else if (hasRenewable) climateHint = 0.5;
  else if (hasInfrastructure) climateHint = 0.3;
  else if (hasSupportive) climateHint = 0.15;

  const directFinancialKeywords = /(rebate|tax credit|grant|voucher|direct payment|\$\d|thousand dollars|million.*program|bill credit|bill assistance)/i;
  const indirectFinancialKeywords = /(rate reduction|low-interest|financing|loan program|eligible|income-qualified)/i;
  const costKeywords = /(fee increase|tax increase|surcharge|assessment|mandate.*cost|compliance cost)/i;

  let personalHint = 0.0;
  if (directFinancialKeywords.test(t)) personalHint = 0.6;
  else if (indirectFinancialKeywords.test(t)) personalHint = 0.3;
  if (costKeywords.test(t)) personalHint = Math.min(personalHint, -0.3);

  return { climateHint, personalHint };
}

// ============================================================================
// AI SCORING TYPES
// ============================================================================

type AIResult = {
  id: string;
  relevance: number;
  personalScore: number;
  personalDirection: "positive" | "negative" | "neutral";
  personalReasons: string[];
  climateDirection: "positive" | "negative" | "neutral";
  climateScore: number;
  climateReasons: string[];
  impactMechanism: string;
  confidenceLevel: "high" | "medium" | "low";
};

// ============================================================================
// RIGOROUS SCORING PROMPT
// ============================================================================

const SCORING_SYSTEM_PROMPT = `You are a RIGOROUS yet FAIR policy scoring engine for Climate Impact Compass.

Your job is to provide CALIBRATED, DEFENSIBLE scores with GRANULAR PRECISION. Use the full decimal range (e.g., 6.3, 4.7, 2.85) - avoid round numbers like 6.0 or 4.0.

═══════════════════════════════════════════════════════════════════════════════
FINANCIAL SCORE: -10.00 to +10.00 (Personal financial impact to THIS specific user)
═══════════════════════════════════════════════════════════════════════════════

CRITICAL CALIBRATION ANCHORS (use decimals within ranges):
• +8.5 to +10.0: Bills providing $400+/month reliable savings or $8,000+ one-time
• +7.0 to +8.4: $175-400/month savings OR $2,500-$8,000 one-time benefit
• +5.5 to +6.9: $75-175/month savings OR $800-$2,500 one-time benefit
• +4.0 to +5.4: $35-75/month savings OR $350-$800 one-time benefit
• +2.8 to +3.9: $15-35/month savings OR $100-$350 one-time benefit
• +1.8 to +2.7: Small indirect savings, notable convenience improvements
• +0.8 to +1.7: Marginal, speculative, or highly conditional benefit
• 0.0 to +0.7: Negligible or no financial impact to this user
• -0.8 to -2.5: Small indirect costs or fees
• -2.6 to -4.5: Moderate costs ($20-90/month or $150-900 one-time)
• -4.6 to -6.5: Significant costs ($90-250/month or $900-4000 one-time)
• -6.6 to -10.0: Major costs ($250+/month or $4000+ one-time)

FINANCIAL SCORING RULES:
1. If no dollar amount specified, estimate conservatively but don't assume zero
2. "May provide" or "could save" = reduce score by 1.5-2.5 points from stated value
3. If user doesn't meet eligibility criteria, score is 0-1.5
4. Convenience improvements alone (no money saved) = 1.8-3.2 depending on significance
5. Future/speculative benefits = reduce score by 1-2 points
6. Consider user's specific situation: renter vs owner, income, etc.
7. USE PRECISE DECIMALS - scores like 5.7, 3.25, 6.85 are better than 6.0, 3.0

═══════════════════════════════════════════════════════════════════════════════
CLIMATE SCORE: 0.00 to 10.00 with direction (positive/negative/neutral)
═══════════════════════════════════════════════════════════════════════════════

Score based on TANGIBLE EMISSIONS IMPACT while recognizing enabling/accelerating effects.

CALIBRATION ANCHORS FOR POSITIVE DIRECTION:
• 8.5-10.0: TRANSFORMATIVE - Directly mandates massive emissions cuts
• 6.8-8.4: MAJOR - Large-scale direct emissions reduction
• 5.2-6.7: SIGNIFICANT - Meaningful emissions reduction, proven mechanism
• 3.8-5.1: MODERATE - Clear emissions reduction but limited scope
• 2.5-3.7: SOME BENEFIT - Indirect but measurable enabling impact
• 1.5-2.4: MINOR - Supportive infrastructure, indirect pathway to reductions
• 0.5-1.4: MINIMAL - Climate-adjacent, speculative impact
• 0.0-0.4: NEUTRAL - No meaningful climate connection

CALIBRATION ANCHORS FOR NEGATIVE DIRECTION:
• 0.5-2.4 negative: Minor harm
• 2.5-4.5 negative: Moderate harm
• 4.6-6.5 negative: Significant harm
• 6.6-8.4 negative: Major harm
• 8.5-10.0 negative: Catastrophic

CLIMATE SCORING RULES:
1. REMOVING BARRIERS has value but ≠ DIRECT EMISSIONS REDUCTION. Score 2.5-4.0 range.
2. "Supports" or "enables" clean energy = 2.0-4.5 depending on how direct
3. Payment/convenience improvements alone = 1.5-2.5
4. Studies, reports, advisory bodies = 0.8-1.5
5. Workforce training = 1.8-2.8
6. Infrastructure that enables future reductions = score probability × potential impact
7. USE PRECISE DECIMALS throughout

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Return STRICT JSON with PRECISE DECIMAL SCORES:
{
  "results": [
    {
      "id": "bill_id",
      "relevance": 0.00-1.00,
      "personalScore": -10.00 to +10.00,
      "personalDirection": "positive" | "negative" | "neutral",
      "personalReasons": ["reason1", "reason2", "reason3"],
      "climateDirection": "positive" | "negative" | "neutral",
      "climateScore": 0.00-10.00,
      "climateReasons": ["reason1", "reason2", "reason3"],
      "impactMechanism": "Brief description of HOW this creates impact",
      "confidenceLevel": "high" | "medium" | "low"
    }
  ]
}

CRITICAL REMINDERS:
- USE PRECISE DECIMALS: 5.73 is better than 6.0, 3.15 is better than 3.0
- Use FULL range of scores. Most bills should be 2-6, with some reaching 7-8.
- A score of 8.5+ should be RARE and well-justified.
- Be specific in reasons. "Supports clean energy" is too vague.`;

// ============================================================================
// AI SCORING FUNCTION WITH ROBUST ERROR HANDLING
// ============================================================================

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
  const userContext = `USER PROFILE FOR PERSONALIZATION:
- Location: ${userProfile.state}, ZIP ${userProfile.zip}
- Housing: ${userProfile.housing_status} (${userProfile.property_type})
- Home age: ${userProfile.home_age || "Unknown"}
- Current heating: ${userProfile.current_heating || "Unknown"}
- Can make upgrades: ${userProfile.can_make_upgrades || "Unknown"}
- Has car: ${userProfile.has_car || "Unknown"}
- Next vehicle timeline: ${userProfile.next_vehicle_timeline || "Unknown"}
- Commute: ${userProfile.commute_distance || "Unknown"}
- Household income: ${userProfile.household_income || "Unknown"}
- Household size: ${userProfile.household_size || "Unknown"}
- Interested in solar: ${userProfile.interested_in_solar || "Unknown"}
- Owns business: ${userProfile.own_business || "Unknown"}
- Job sector: ${userProfile.job_sector || "Unknown"}

Use this to determine:
1. Eligibility for programs (income limits, homeowner requirements, etc.)
2. Relevance of provisions (renter can't use homeowner incentives)
3. Practical ability to benefit (apartment dweller can't install solar panels)`;

  const billsContext = bills.map((b) => ({
    id: b.id,
    title: b.title,
    summary: b.summary,
    tags: b.tags,
    hints: { 
      climateHint: b.climateHint, 
      personalHint: b.personalHint,
      note: "Hints are weak priors only - override with your analysis"
    },
  }));

  const userPrompt = `${userContext}

BILLS TO SCORE (use precise decimals like 5.73, 3.15, 6.85 - avoid round numbers):

${JSON.stringify(billsContext, null, 2)}

Remember:
- Use PRECISE DECIMALS: 4.85 not 5.0, 6.35 not 6.0, 2.15 not 2.0
- Most bills should score 2-6 on both scales, with standouts reaching 7-8
- 8.5+ requires exceptional, transformative, quantifiable impact
- Convenience improvements with no dollar savings = 1.8-3.2
- Consider this specific user's eligibility and situation
- Enabling/accelerating clean energy has value (2.5-4.5 range typically)`;

  // Wrap OpenAI call in try-catch
  let resp;
  try {
    resp = await openai.chat.completions.create({
      model,
      temperature: 0.18,
      response_format: { type: "json_object" } as any,
      messages: [
        { role: "system", content: SCORING_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });
  } catch (apiError: any) {
    console.error("[AI_SCORING] OpenAI API error:", apiError?.message || apiError);
    console.error("[AI_SCORING] Error details:", {
      status: apiError?.status,
      code: apiError?.code,
      type: apiError?.type
    });
    // Return empty results instead of crashing
    return {};
  }

  const raw = resp?.choices?.[0]?.message?.content ?? "";
  
  // Validate response before parsing
  if (!raw || raw.trim() === "") {
    console.warn("[AI_SCORING] Empty response from OpenAI");
    return {};
  }

  // Use safe JSON parsing
  const parsed = safeParseJSON(raw);
  
  if (!parsed) {
    console.error("[AI_SCORING] Failed to parse OpenAI response");
    return {};
  }

  const out: Record<string, AIResult> = {};
  const results = parsed?.results;
  if (!Array.isArray(results)) {
    console.warn("[AI_SCORING] No results array in response");
    return out;
  }

  for (const r of results) {
    const id = String(r?.id ?? "");
    if (!id) continue;

    let relevance = round2(clamp0to1(r?.relevance));
    let personalScore = round2(clampNeg10to10(r?.personalScore));
    let climateScore = round2(clamp(r?.climateScore, 0, 10));
    let climateDirection = normalizeDirection(r?.climateDirection);
    let personalDirection = normalizeDirection(r?.personalDirection);

    // Enforce consistency
    if (climateDirection === "neutral") climateScore = 0.0;
    if (climateScore === 0) climateDirection = "neutral";
    if (personalDirection === "neutral") personalScore = 0.0;
    if (personalScore === 0) personalDirection = "neutral";
    if (personalScore > 0) personalDirection = "positive";
    if (personalScore < 0) personalDirection = "negative";

    out[id] = {
      id,
      relevance,
      personalScore,
      personalDirection,
      personalReasons: safeArray(r?.personalReasons, 3),
      climateDirection,
      climateScore,
      climateReasons: safeArray(r?.climateReasons, 3),
      impactMechanism: String(r?.impactMechanism || "Not specified"),
      confidenceLevel: ["high", "medium", "low"].includes(r?.confidenceLevel) ? r.confidenceLevel : "medium",
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
    try {
      const scored = await aiScoreBillsBatch(openai, model, userProfile, chunk);
      Object.assign(all, scored);
    } catch (err: any) {
      console.error(`[AI_SCORING] Batch ${i}-${i + batchSize} failed:`, err?.message || err);
      // Continue with other batches
    }
  }
  return all;
}

// ============================================================================
// FIND RELEVANT BILLS
// ============================================================================

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

  let db: PrismaClient;
  try {
    db = getDatabaseClient();
  } catch (dbError: any) {
    console.error("[FIND_BILLS] Database connection failed:", dbError?.message);
    return NextResponse.json({ 
      error: "Database connection failed", 
      details: dbError?.message || "Unable to connect to database"
    }, { status: 503 });
  }

  try {
    const totalCount = await db.policy.count();
    console.log(`[FIND_BILLS] Total policies in DB: ${totalCount}`);
    if (totalCount === 0) {
      return NextResponse.json({ bills: [], total: 0, message: "No policies in database. Run ingestion script first." });
    }

    // STRICT STATE FILTERING
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

    // SECONDARY FILTER
    const filteredBills = bills.filter(bill => 
      jurisdictionMatchesState(bill.jurisdictionCode, bill.jurisdictionName, normalizedState)
    );

    console.log(`[FIND_BILLS] After strict state filter: ${filteredBills.length} bills for ${normalizedState}`);

    if (filteredBills.length === 0) {
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

    let openai: OpenAI;
    try {
      openai = getOpenAIClient();
    } catch (apiKeyError: any) {
      console.error("[FIND_BILLS] OpenAI client initialization failed:", apiKeyError?.message);
      // Return bills without AI scoring
      const fallbackBills = enriched.slice(0, 30).map((b) => ({
        id: b.id,
        identifier: b.identifier,
        title: b.title,
        summary: b.summary,
        personalScore: 0,
        personalLabel: "Scoring unavailable",
        personalDirection: "neutral" as const,
        personalReasons: [],
        climateScore: 0,
        climateLabel: "Scoring unavailable",
        climateDirection: "neutral" as const,
        climateReasons: [],
        relevance: Math.max(Math.abs(b.climateHint), Math.abs(b.personalHint)),
        jurisdictionCode: b.jurisdictionCode,
        jurisdictionName: b.jurisdictionName,
        status: b.status,
        dateIntroduced: b.dateIntroduced,
        tags: b.tags,
        sources: b.sources,
      }));
      
      return NextResponse.json({
        bills: fallbackBills,
        total: fallbackBills.length,
        userState: normalizedState,
        warning: "AI scoring unavailable - showing unscored results",
      });
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    let aiMap: Record<string, AIResult> = {};
    try {
      aiMap = await aiScoreBills(openai, model, userProfile, aiInput, AI_BATCH_SIZE);
      console.log(`[FIND_BILLS] AI scored ${Object.keys(aiMap).length} bills`);
    } catch (e: any) {
      console.warn("[FIND_BILLS] AI scoring failed; continuing with fallback:", e?.message || e);
      aiMap = {};
    }

    const combined = enriched.map((b) => {
      const ai = aiMap[b.id];

      let personalScore = ai ? ai.personalScore : 0.0;
      let climateScore = ai ? ai.climateScore : 0.0;
      let climateDirection = ai ? ai.climateDirection : "neutral";
      let personalDirection = ai ? ai.personalDirection : "neutral";
      const relevance = ai ? ai.relevance : Math.max(Math.abs(b.climateHint), Math.abs(b.personalHint)) * 0.35;

      // Ensure consistency
      if (climateDirection === "neutral") climateScore = 0.0;
      if (climateScore === 0) climateDirection = "neutral";
      if (personalScore === 0) personalDirection = "neutral";
      if (personalScore > 0) personalDirection = "positive";
      if (personalScore < 0) personalDirection = "negative";

      const personalReasons = ai ? ai.personalReasons : [];
      const climateReasons = ai ? ai.climateReasons : [];
      const impactMechanism = ai?.impactMechanism || "Not analyzed";
      const confidenceLevel = ai?.confidenceLevel || "low";

      const rank = Math.abs(personalScore) * PERSONAL_WEIGHT + climateScore + relevance * 1.6;

      return {
        id: b.id,
        identifier: b.identifier,
        title: b.title,
        summary: b.summary,
        personalScore: round2(personalScore),
        personalLabel: getPersonalScoreLabel(personalScore),
        personalDirection,
        personalReasons,
        climateScore: round2(climateScore),
        climateLabel: getClimateScoreLabel(climateScore, climateDirection),
        climateDirection,
        climateReasons,
        impactMechanism,
        confidenceLevel,
        relevance,
        jurisdictionCode: b.jurisdictionCode,
        jurisdictionName: b.jurisdictionName,
        status: b.status,
        dateIntroduced: b.dateIntroduced,
        tags: b.tags,
        sources: b.sources,
        _rank: rank,
        _scoredBy: ai ? "openai-v8-calibrated" : "fallback",
      };
    });

    const included = combined.filter((b) => {
      const hasScore = Math.abs(b.personalScore) > 0 || b.climateScore > 0;
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
        methodology: "V8.1 Calibrated Scoring",
        stateFiltering: `Bills strictly filtered to ${normalizedState} jurisdiction only.`,
        developer: "Created by Leo Levitt",
      },
    });
  } catch (error: any) {
    console.error("[FIND_BILLS] Error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch bills", 
      details: error?.message || "Unknown error"
    }, { status: 500 });
  }
}

// ============================================================================
// COMPREHENSIVE BILL ANALYSIS
// ============================================================================

const ANALYSIS_SYSTEM_PROMPT = `You are Climate Impact Compass, an expert policy analyst created by Leo Levitt.

Your role is to provide COMPREHENSIVE, RIGOROUS, HONEST analysis of climate and energy legislation for everyday citizens.

CORE PRINCIPLES:
1. BE RIGOROUS: Base ALL analysis on the actual bill text provided. Never hallucinate provisions, dollar amounts, or requirements.
2. BE SPECIFIC: Generic statements like "may provide benefits" are useless. Say exactly what, how much, and for whom.
3. BE HONEST ABOUT UNCERTAINTY: If the bill doesn't specify dollar amounts, say "Not specified in bill text." Don't guess.
4. BE CRITICAL: Identify weaknesses, implementation challenges, and reasons the bill might not deliver its promised benefits.
5. CONSIDER THE MECHANISM: Don't just say what the bill aims to do - explain HOW it creates impact.
6. ACKNOWLEDGE LIMITATIONS: Payment standardization ≠ emissions reduction. Workforce training ≠ immediate climate benefit. Be precise.

USER PERSONALIZATION - You MUST tailor analysis to the specific user. Consider:
- Renter vs. owner (renters can't install solar, change HVAC, etc.)
- Income level (affects eligibility, ability to access benefits)
- Property type (apartment dweller vs. single-family home)
- Vehicle situation (no car = EV incentives irrelevant)
- Location within state (urban vs. rural considerations)
- Ability to make changes (lease restrictions, HOA rules)

IMPORTANT REMINDERS:
- If bill text doesn't specify something, say "Not specified in bill text"
- Don't inflate benefits - be conservative in estimates
- Acknowledge when provisions are vague or discretionary
- Note if funding is appropriated or just authorized
- Consider implementation timeline realistically
- Be honest about barriers and challenges`;

async function analyzeBill(billId: string, userProfile: UserProfile): Promise<NextResponse> {
  console.log(`\n[ANALYZE_BILL] Starting comprehensive analysis for bill: ${billId}`);

  let db: PrismaClient;
  try {
    db = getDatabaseClient();
  } catch (dbError: any) {
    console.error("[ANALYZE_BILL] Database connection failed:", dbError?.message);
    return NextResponse.json({ 
      error: "Database connection failed", 
      details: dbError?.message || "Unable to connect to database"
    }, { status: 503 });
  }

  try {
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

    if (!jurisdictionMatchesState(bill.jurisdictionCode, bill.jurisdictionName, userProfile.state)) {
      console.warn(`[ANALYZE_BILL] Bill ${billId} is from ${bill.jurisdictionCode}, but user is from ${userProfile.state}`);
    }

    console.log(`[ANALYZE_BILL] Found bill: ${bill.title} (${bill.jurisdictionCode})`);

    const tags = bill.tags.map((t) => t.tag);
    const text = joinLowercase(bill.title, bill.summary);
    const { climateHint, personalHint } = computeHints(tags, text);

    let openai: OpenAI;
    try {
      openai = getOpenAIClient();
    } catch (apiKeyError: any) {
      console.error("[ANALYZE_BILL] OpenAI client initialization failed:", apiKeyError?.message);
      return NextResponse.json({ 
        error: "AI service unavailable", 
        details: "OpenAI API key is missing or invalid"
      }, { status: 503 });
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    // Get calibrated scores
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
    } catch (e: any) {
      console.warn("[ANALYZE_BILL] Could not fetch scores, proceeding without them:", e?.message);
    }

    const userPrompt = `Analyze this bill with DEPTH, RIGOR, and HONESTY for this SPECIFIC user.

USER'S COMPLETE PROFILE:
- Location: ZIP ${userProfile.zip}, ${userProfile.state}
- Housing: ${userProfile.housing_status}, ${userProfile.property_type}
- Home age: ${userProfile.home_age || "Not specified"}
- Current heating: ${userProfile.current_heating || "Not specified"}
- Can make upgrades: ${userProfile.can_make_upgrades || "Not specified"}
- Solar interest: ${userProfile.interested_in_solar || "Not specified"}
- Vehicle: ${userProfile.has_car ? 'Has car' : 'No car'}, next decision: ${userProfile.next_vehicle_timeline || "Not specified"}
- Commute: ${userProfile.commute_distance || "Not specified"}
- Income: ${userProfile.household_income || "Not specified"}
- Household size: ${userProfile.household_size || "Not specified"}
- Owns business: ${userProfile.own_business || "Not specified"}
- Job sector: ${userProfile.job_sector || "Not specified"}

${billScores ? `
CALIBRATED SCORES (your analysis must align with these):
Personal Financial Score: ${billScores.personalScore}/10 (${getPersonalScoreLabel(billScores.personalScore)})
- Direction: ${billScores.personalDirection}
- Reasons: ${billScores.personalReasons.join("; ")}

Climate Score: ${billScores.climateScore}/10 ${billScores.climateDirection} (${getClimateScoreLabel(billScores.climateScore, billScores.climateDirection)})
- Reasons: ${billScores.climateReasons.join("; ")}
- Impact mechanism: ${billScores.impactMechanism}
` : "Scores not available - be conservative in your assessment."}

BILL TO ANALYZE:
Title: ${bill.title}
Status: ${bill.status}
Jurisdiction: ${bill.jurisdictionName} (${bill.jurisdictionCode})
Date Introduced: ${bill.dateIntroduced?.toISOString().split('T')[0] || "Unknown"}
Tags: ${tags.join(", ")}

Summary/Text:
${bill.summary || "No summary available - be especially careful about claims."}

Provide STRICT JSON with comprehensive analysis including: overview, your_specific_situation, financial_impact_for_you, environmental_impact_explained, detailed_bill_provisions, eligibility_and_requirements, what_we_know_and_dont_know, your_action_plan, real_world_context, local_and_regional_impact, common_questions_answered, and critical_assessment.`;

    console.log(`[ANALYZE_BILL] Sending comprehensive analysis request...`);

    let response;
    try {
      response = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.2,
        response_format: { type: "json_object" } as any,
        messages: [
          { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      });
    } catch (apiError: any) {
      console.error("[ANALYZE_BILL] OpenAI API error:", apiError?.message || apiError);
      return NextResponse.json({ 
        error: "AI analysis failed", 
        details: apiError?.message || "OpenAI API request failed"
      }, { status: 502 });
    }

    const rawContent = response?.choices?.[0]?.message?.content ?? "";
    console.log(`[ANALYZE_BILL] Received ${rawContent.length} chars`);

    const analysis = safeParseJSON(rawContent);

    if (!analysis) {
      console.error("[ANALYZE_BILL] Failed to parse AI response");
      return NextResponse.json({ 
        error: "AI returned invalid response",
        details: "Could not parse the analysis response as JSON"
      }, { status: 502 });
    }

    // Safe extraction with all the new fields (keeping backward compatibility)
    const safeAnalysis = {
      overview: {
        plain_english_summary: analysis.overview?.plain_english_summary || "Analysis unavailable",
        what_this_means_for_you: analysis.overview?.what_this_means_for_you || "Unable to determine personal impact",
        honest_assessment: analysis.overview?.honest_assessment || "No critical assessment available",
        key_provisions: Array.isArray(analysis.overview?.key_provisions) ? analysis.overview.key_provisions : [],
        timeline_and_status: {
          current_status: analysis.overview?.timeline_and_status?.current_status || "Status unclear",
          when_it_takes_effect: analysis.overview?.timeline_and_status?.when_it_takes_effect || "Not specified",
          key_deadlines: Array.isArray(analysis.overview?.timeline_and_status?.key_deadlines) ? analysis.overview.timeline_and_status.key_deadlines : [],
          what_needs_to_happen_next: analysis.overview?.timeline_and_status?.what_needs_to_happen_next || "Unknown",
          implementation_risks: analysis.overview?.timeline_and_status?.implementation_risks || "Not assessed"
        },
        timeline: analysis.overview?.timeline_and_status?.when_it_takes_effect || "Not specified",
        implementation_status: analysis.overview?.timeline_and_status?.current_status || "Status unclear"
      },
      your_specific_situation: {
        relevance_to_you: analysis.your_specific_situation?.relevance_to_you || "Relevance unclear",
        provisions_that_apply_to_you: Array.isArray(analysis.your_specific_situation?.provisions_that_apply_to_you) ? analysis.your_specific_situation.provisions_that_apply_to_you : [],
        provisions_that_dont_apply: Array.isArray(analysis.your_specific_situation?.provisions_that_dont_apply) ? analysis.your_specific_situation.provisions_that_dont_apply : [],
        your_best_opportunities: Array.isArray(analysis.your_specific_situation?.your_best_opportunities) ? analysis.your_specific_situation.your_best_opportunities : [],
        your_biggest_barriers: Array.isArray(analysis.your_specific_situation?.your_biggest_barriers) ? analysis.your_specific_situation.your_biggest_barriers : [],
        honest_bottom_line: analysis.your_specific_situation?.honest_bottom_line || "Unable to assess"
      },
      financial_impact_for_you: {
        bottom_line: analysis.financial_impact_for_you?.bottom_line || "Financial impact unclear",
        specific_benefits_for_your_situation: Array.isArray(analysis.financial_impact_for_you?.specific_benefits_for_your_situation) ? analysis.financial_impact_for_you.specific_benefits_for_your_situation : [],
        how_you_qualify: Array.isArray(analysis.financial_impact_for_you?.how_you_qualify) ? analysis.financial_impact_for_you.how_you_qualify : [],
        what_disqualifies_you: Array.isArray(analysis.financial_impact_for_you?.what_disqualifies_you) ? analysis.financial_impact_for_you.what_disqualifies_you : [],
        estimated_savings_range: analysis.financial_impact_for_you?.estimated_savings_range || "Cannot estimate",
        one_time_vs_ongoing: analysis.financial_impact_for_you?.one_time_vs_ongoing || "Not specified",
        how_to_actually_get_the_money: Array.isArray(analysis.financial_impact_for_you?.how_to_actually_get_the_money) ? analysis.financial_impact_for_you.how_to_actually_get_the_money : [],
        potential_obstacles: Array.isArray(analysis.financial_impact_for_you?.potential_obstacles) ? analysis.financial_impact_for_you.potential_obstacles : [],
        upfront_costs: analysis.financial_impact_for_you?.upfront_costs || "Not specified",
        hidden_costs: Array.isArray(analysis.financial_impact_for_you?.hidden_costs) ? analysis.financial_impact_for_you.hidden_costs : [],
        compared_to_alternatives: analysis.financial_impact_for_you?.compared_to_alternatives || "Not assessed"
      },
      personalized_financial_analysis: {
        direct_benefits: Array.isArray(analysis.financial_impact_for_you?.specific_benefits_for_your_situation) ? analysis.financial_impact_for_you.specific_benefits_for_your_situation : [],
        eligibility_factors: Array.isArray(analysis.financial_impact_for_you?.how_you_qualify) ? analysis.financial_impact_for_you.how_you_qualify : [],
        estimated_value: analysis.financial_impact_for_you?.estimated_savings_range || "Cannot estimate",
        access_pathway: Array.isArray(analysis.financial_impact_for_you?.how_to_actually_get_the_money) ? analysis.financial_impact_for_you.how_to_actually_get_the_money : [],
        barriers: Array.isArray(analysis.financial_impact_for_you?.potential_obstacles) ? analysis.financial_impact_for_you.potential_obstacles : []
      },
      environmental_impact_explained: {
        what_this_means_for_climate: analysis.environmental_impact_explained?.what_this_means_for_climate || "Environmental impact unclear",
        quantified_impact: analysis.environmental_impact_explained?.quantified_impact || "Not quantified",
        causal_mechanism: analysis.environmental_impact_explained?.causal_mechanism || "Mechanism not specified",
        direct_vs_indirect: analysis.environmental_impact_explained?.direct_vs_indirect || "Not assessed",
        local_environmental_benefits: Array.isArray(analysis.environmental_impact_explained?.local_environmental_benefits) ? analysis.environmental_impact_explained.local_environmental_benefits : [],
        if_you_participate_personally: Array.isArray(analysis.environmental_impact_explained?.if_you_participate_personally) ? analysis.environmental_impact_explained.if_you_participate_personally : [],
        bigger_picture: analysis.environmental_impact_explained?.bigger_picture || "Broader impact unclear",
        why_this_matters_for_your_community: Array.isArray(analysis.environmental_impact_explained?.why_this_matters_for_your_community) ? analysis.environmental_impact_explained.why_this_matters_for_your_community : [],
        limitations_and_caveats: Array.isArray(analysis.environmental_impact_explained?.limitations_and_caveats) ? analysis.environmental_impact_explained.limitations_and_caveats : [],
        state_context: analysis.environmental_impact_explained?.state_context || "Not assessed"
      },
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
        enforcement: analysis.detailed_bill_provisions?.enforcement || "Not specified",
        funding_sources: Array.isArray(analysis.detailed_bill_provisions?.funding_sources) ? analysis.detailed_bill_provisions.funding_sources : [],
        funding_adequacy: analysis.detailed_bill_provisions?.funding_adequacy || "Not assessed"
      },
      eligibility_and_requirements: {
        who_this_is_for: Array.isArray(analysis.eligibility_and_requirements?.who_this_is_for) ? analysis.eligibility_and_requirements.who_this_is_for : [],
        who_this_is_NOT_for: Array.isArray(analysis.eligibility_and_requirements?.who_this_is_NOT_for) ? analysis.eligibility_and_requirements.who_this_is_NOT_for : [],
        your_eligibility_assessment: analysis.eligibility_and_requirements?.your_eligibility_assessment || {
          criteria_you_meet: [],
          criteria_you_dont_meet: [],
          uncertain_criteria: [],
          overall_eligibility: "Unable to assess"
        },
        documentation_youll_need: Array.isArray(analysis.eligibility_and_requirements?.documentation_youll_need) ? analysis.eligibility_and_requirements.documentation_youll_need : [],
        income_requirements: analysis.eligibility_and_requirements?.income_requirements || "Not specified",
        property_requirements: Array.isArray(analysis.eligibility_and_requirements?.property_requirements) ? analysis.eligibility_and_requirements.property_requirements : [],
        timing_requirements: Array.isArray(analysis.eligibility_and_requirements?.timing_requirements) ? analysis.eligibility_and_requirements.timing_requirements : [],
        special_considerations: Array.isArray(analysis.eligibility_and_requirements?.special_considerations) ? analysis.eligibility_and_requirements.special_considerations : []
      },
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
        what_could_go_wrong: Array.isArray(analysis.what_we_know_and_dont_know?.what_could_go_wrong) ? analysis.what_we_know_and_dont_know.what_could_go_wrong : [],
        what_to_watch_for: Array.isArray(analysis.what_we_know_and_dont_know?.what_to_watch_for) ? analysis.what_we_know_and_dont_know.what_to_watch_for : []
      },
      certainties_and_uncertainties: {
        what_is_certain: Array.isArray(analysis.what_we_know_and_dont_know?.definitely_established) ? analysis.what_we_know_and_dont_know.definitely_established : [],
        what_depends_on_implementation: Array.isArray(analysis.what_we_know_and_dont_know?.still_to_be_determined) ? analysis.what_we_know_and_dont_know.still_to_be_determined : [],
        missing_information: Array.isArray(analysis.what_we_know_and_dont_know?.questions_nobody_can_answer_yet) ? analysis.what_we_know_and_dont_know.questions_nobody_can_answer_yet : [],
        risks_and_caveats: Array.isArray(analysis.what_we_know_and_dont_know?.potential_risks_and_downsides) ? analysis.what_we_know_and_dont_know.potential_risks_and_downsides : []
      },
      your_action_plan: {
        should_you_care: analysis.your_action_plan?.should_you_care || "Unable to assess",
        do_this_now: Array.isArray(analysis.your_action_plan?.do_this_now) ? analysis.your_action_plan.do_this_now : [],
        do_this_soon: Array.isArray(analysis.your_action_plan?.do_this_soon) ? analysis.your_action_plan.do_this_soon : [],
        plan_for_later: Array.isArray(analysis.your_action_plan?.plan_for_later) ? analysis.your_action_plan.plan_for_later : [],
        questions_to_ask: {
          ask_your_utility_company: Array.isArray(analysis.your_action_plan?.questions_to_ask?.ask_your_utility_company) ? analysis.your_action_plan.questions_to_ask.ask_your_utility_company : [],
          ask_contractors: Array.isArray(analysis.your_action_plan?.questions_to_ask?.ask_contractors) ? analysis.your_action_plan.questions_to_ask.ask_contractors : [],
          ask_your_state_agency: Array.isArray(analysis.your_action_plan?.questions_to_ask?.ask_your_state_agency) ? analysis.your_action_plan.questions_to_ask.ask_your_state_agency : []
        },
        resources_and_help: Array.isArray(analysis.your_action_plan?.resources_and_help) ? analysis.your_action_plan.resources_and_help : [],
        decision_framework: Array.isArray(analysis.your_action_plan?.decision_framework) ? analysis.your_action_plan.decision_framework : [],
        if_you_do_nothing: analysis.your_action_plan?.if_you_do_nothing || "Not assessed"
      },
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
        track_record: analysis.real_world_context?.track_record || "Not assessed",
        potential_challenges: Array.isArray(analysis.real_world_context?.potential_challenges) ? analysis.real_world_context.potential_challenges : [],
        success_factors: Array.isArray(analysis.real_world_context?.success_factors) ? analysis.real_world_context.success_factors : [],
        lessons_from_other_states: Array.isArray(analysis.real_world_context?.lessons_from_other_states) ? analysis.real_world_context.lessons_from_other_states : [],
        political_durability: analysis.real_world_context?.political_durability || "Not assessed"
      },
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
        community_benefits: Array.isArray(analysis.local_and_regional_impact?.community_benefits) ? analysis.local_and_regional_impact.community_benefits : [],
        equity_considerations: analysis.local_and_regional_impact?.equity_considerations || "Not assessed"
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
        what_if_i_dont_qualify: analysis.common_questions_answered?.what_if_i_dont_qualify || "Not specified",
        is_this_worth_my_time: analysis.common_questions_answered?.is_this_worth_my_time || "Not specified",
        other_important_questions: Array.isArray(analysis.common_questions_answered?.other_important_questions) ? analysis.common_questions_answered.other_important_questions : []
      },
      critical_assessment: {
        strengths: Array.isArray(analysis.critical_assessment?.strengths) ? analysis.critical_assessment.strengths : [],
        weaknesses: Array.isArray(analysis.critical_assessment?.weaknesses) ? analysis.critical_assessment.weaknesses : [],
        who_benefits_most: analysis.critical_assessment?.who_benefits_most || "Not assessed",
        who_benefits_least: analysis.critical_assessment?.who_benefits_least || "Not assessed",
        implementation_grade: analysis.critical_assessment?.implementation_grade || "Not graded",
        overall_value_for_you: analysis.critical_assessment?.overall_value_for_you || "Unable to assess"
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
      scores: billScores ? {
        personalScore: billScores.personalScore,
        personalLabel: getPersonalScoreLabel(billScores.personalScore),
        personalDirection: billScores.personalDirection,
        personalReasons: billScores.personalReasons,
        climateScore: billScores.climateScore,
        climateLabel: getClimateScoreLabel(billScores.climateScore, billScores.climateDirection),
        climateDirection: billScores.climateDirection,
        climateReasons: billScores.climateReasons,
        impactMechanism: billScores.impactMechanism,
        confidenceLevel: billScores.confidenceLevel
      } : null,
      scoringMethodology: {
        version: "V8.1 Calibrated",
        description: "Rigorous scoring with precise decimal calibration.",
      }
    });
  } catch (error: any) {
    console.error("[ANALYZE_BILL] Error:", error);
    return NextResponse.json({ 
      error: "Failed to analyze bill", 
      details: error?.message || "Unknown error"
    }, { status: 500 });
  }
}

// ============================================================================
// MAIN HANDLER WITH ROBUST ERROR HANDLING
// ============================================================================

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    // Parse request body with error handling
    let body: any;
    try {
      body = await req.json();
    } catch (parseError: any) {
      console.error("[POST] Failed to parse request body:", parseError?.message);
      return NextResponse.json(
        { error: "Invalid JSON in request body", details: parseError?.message },
        { status: 400 }
      );
    }

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
    console.error(`✗ Failed:`, error?.message || error);
    
    // Always return valid JSON
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error?.message || "An unexpected error occurred",
        ...(process.env.NODE_ENV === "development" && { stack: error?.stack }),
      },
      { status: 500 }
    );
  }
}