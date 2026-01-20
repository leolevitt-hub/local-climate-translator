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
// CALIBRATED SCORE LABELS - More granular and accurate
// ============================================================================

function getPersonalScoreLabel(score: number): string {
  // Positive benefits
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
  // Neutral
  if (score === 0) return "No direct financial impact";
  // Negative impacts (costs)
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
  const tagSet = new Set(tags);

  // Direct emissions reduction indicators
  const directEmissionsKeywords = /(greenhouse gas|ghg|emission reduction|carbon cap|carbon tax|methane|co2|decarboniz)/i;
  const hasDirectEmissions = directEmissionsKeywords.test(t);

  // Renewable energy deployment
  const renewableKeywords = /(solar|wind|geothermal|hydropower|renewable portfolio|clean energy standard|100% clean)/i;
  const hasRenewable = renewableKeywords.test(t);

  // Electrification
  const electrificationKeywords = /(heat pump|electric vehicle mandate|zev mandate|building electrification|gas ban|fossil fuel phase)/i;
  const hasElectrification = electrificationKeywords.test(t);

  // Infrastructure (indirect but important)
  const infrastructureKeywords = /(grid modernization|transmission|battery storage|microgrid|charging infrastructure)/i;
  const hasInfrastructure = infrastructureKeywords.test(t);

  // Supportive but very indirect
  const supportiveKeywords = /(permitting|workforce|training|study|report|planning|advisory)/i;
  const hasSupportive = supportiveKeywords.test(t);

  // Harmful indicators
  const harmfulKeywords = /(new pipeline|lng terminal|new gas plant|fracking|coal|drilling|fossil fuel subsid|rollback|repeal.*environmental)/i;
  const hasHarmful = harmfulKeywords.test(t);

  // Calculate climate hint
  let climateHint = 0.0;
  if (hasHarmful) climateHint = -0.6;
  else if (hasDirectEmissions || hasElectrification) climateHint = 0.7;
  else if (hasRenewable) climateHint = 0.5;
  else if (hasInfrastructure) climateHint = 0.3;
  else if (hasSupportive) climateHint = 0.15;

  // Financial hint indicators
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
// RIGOROUS SCORING PROMPT - The core of the improved system
// ============================================================================

const SCORING_SYSTEM_PROMPT = `You are a RIGOROUS yet FAIR policy scoring engine for Climate Impact Compass.

Your job is to provide CALIBRATED, DEFENSIBLE scores with GRANULAR PRECISION. Use the full decimal range (e.g., 6.3, 4.7, 2.85) - avoid round numbers like 6.0 or 4.0.

═══════════════════════════════════════════════════════════════════════════════
FINANCIAL SCORE: -10.00 to +10.00 (Personal financial impact to THIS specific user)
═══════════════════════════════════════════════════════════════════════════════

CRITICAL CALIBRATION ANCHORS (use decimals within ranges):
• +8.5 to +10.0: Bills providing $400+/month reliable savings or $8,000+ one-time
  Example: "30% tax credit on $30,000 solar installation = $9,000 direct savings" → 9.2
  Example: "$7,500 EV tax credit for eligible buyers" → 8.7
  
• +7.0 to +8.4: $175-400/month savings OR $2,500-$8,000 one-time benefit
  Example: "50% rebate on $6,000 heat pump installation" → 7.8
  Example: "$4,000 home battery incentive" → 7.3
  
• +5.5 to +6.9: $75-175/month savings OR $800-$2,500 one-time benefit
  Example: "$2,000 rebate for electric water heater" → 6.4
  Example: "Low-income utility bill assistance of $120/month" → 6.1
  Example: "$1,500 weatherization grant" → 5.9
  
• +4.0 to +5.4: $35-75/month savings OR $350-$800 one-time benefit
  Example: "Weatherization program covering $600 in improvements" → 4.8
  Example: "$500 rebate for induction stove" → 4.5
  
• +2.8 to +3.9: $15-35/month savings OR $100-$350 one-time benefit
  Example: "$250 rebate for smart thermostat" → 3.4
  Example: "Free energy audit worth $200" → 3.1
  
• +1.8 to +2.7: Small indirect savings, notable convenience improvements
  Example: "Standardized EV charging payment (real convenience value)" → 2.3
  Example: "Utility rate transparency requirements" → 2.1
  
• +0.8 to +1.7: Marginal, speculative, or highly conditional benefit
  Example: "Might slightly reduce utility rates through efficiency programs" → 1.4
  Example: "Future potential for program participation" → 1.1
  
• 0.0 to +0.7: Negligible or no financial impact to this user
  Example: "Commercial building codes that don't affect residential users" → 0.2
  
• -0.8 to -2.5: Small indirect costs or fees
  Example: "Small surcharge on utility bills for clean energy fund" → -1.6
  
• -2.6 to -4.5: Moderate costs ($20-90/month or $150-900 one-time)
  Example: "Mandatory home energy upgrade requirements for sellers" → -3.8
  
• -4.6 to -6.5: Significant costs ($90-250/month or $900-4000 one-time)
  Example: "Required EV charger installation in new construction (cost to buyer)" → -5.3
  
• -6.6 to -10.0: Major costs ($250+/month or $4000+ one-time)
  Example: "Mandatory building retrofit requirements with compliance costs" → -7.4

FINANCIAL SCORING RULES:
1. If no dollar amount specified, estimate conservatively but don't assume zero
2. "May provide" or "could save" = reduce score by 1.5-2.5 points from stated value
3. If user doesn't meet eligibility criteria, score is 0-1.5 (not necessarily zero - they may qualify later)
4. Convenience improvements alone (no money saved) = 1.8-3.2 depending on significance
5. Future/speculative benefits = reduce score by 1-2 points
6. Consider user's specific situation: renter vs owner, income, etc.
7. USE PRECISE DECIMALS - scores like 5.7, 3.25, 6.85 are better than 6.0, 3.0

═══════════════════════════════════════════════════════════════════════════════
CLIMATE SCORE: 0.00 to 10.00 with direction (positive/negative/neutral)
═══════════════════════════════════════════════════════════════════════════════

Score based on TANGIBLE EMISSIONS IMPACT while recognizing enabling/accelerating effects.

CALIBRATION ANCHORS FOR POSITIVE DIRECTION (use precise decimals):
• 8.5-10.0: TRANSFORMATIVE - Directly mandates massive emissions cuts
  Example: "100% clean electricity standard by 2035" → 9.6
  Example: "Ban on new gas hookups statewide" → 9.1
  Example: "Carbon cap reducing emissions 50% by 2030" → 9.3
  
• 6.8-8.4: MAJOR - Large-scale direct emissions reduction
  Example: "50% renewable portfolio standard" → 8.2
  Example: "Mandatory building emissions limits with penalties" → 7.6
  Example: "$500M annual investment in utility-scale solar" → 7.9
  Example: "EV sales mandate: 50% of new cars by 2030" → 7.4
  
• 5.2-6.7: SIGNIFICANT - Meaningful emissions reduction, proven mechanism
  Example: "Commercial building energy benchmarking with disclosure & penalties" → 6.5
  Example: "EV sales mandate: 35% of new cars by 2030" → 6.2
  Example: "Methane leak detection and repair requirements" → 5.8
  Example: "Large solar incentive program ($100M/year)" → 5.9
  
• 3.8-5.1: MODERATE - Clear emissions reduction but limited scope
  Example: "Residential solar incentive program ($50M/year)" → 4.7
  Example: "Electric school bus replacement program" → 4.4
  Example: "State fleet electrification requirements" → 4.2
  Example: "Building energy codes update" → 4.0
  
• 2.5-3.7: SOME BENEFIT - Indirect but measurable enabling impact
  Example: "Streamlined permitting for solar installations" → 3.5
  Example: "EV charging infrastructure requirements in new construction" → 3.3
  Example: "Energy efficiency standards for appliances" → 3.1
  Example: "Green bank with $50M capitalization" → 2.9
  
• 1.5-2.4: MINOR - Supportive infrastructure, indirect pathway to reductions
  Example: "Clean energy workforce training program" → 2.2
  Example: "EV charging payment standardization" → 2.1 ← THIS IS WHERE THAT BILL BELONGS
  Example: "Climate adaptation planning requirements" → 1.9
  Example: "Emissions reporting requirements (no limits)" → 1.7
  
• 0.5-1.4: MINIMAL - Climate-adjacent, speculative impact
  Example: "Study on climate impacts" → 1.1
  Example: "Advisory committee creation" → 0.9
  Example: "Voluntary efficiency programs" → 1.3
  Example: "Climate education curriculum" → 0.8
  
• 0.0-0.4: NEUTRAL - No meaningful climate connection
  Example: "General tax policy" → 0.1
  Example: "Non-energy infrastructure" → 0.0

CALIBRATION ANCHORS FOR NEGATIVE DIRECTION:
• 0.5-2.4 negative: Minor harm - Slight emissions increase
  Example: "Weakening of efficiency standards" → -1.8
  Example: "Delay of clean energy deadline by 2 years" → -2.2
  
• 2.5-4.5 negative: Moderate harm - Meaningful emissions increase
  Example: "Subsidies for natural gas appliances" → -3.6
  Example: "Delay of emissions requirements by 5+ years" → -4.1
  
• 4.6-6.5 negative: Significant harm - Substantial emissions increase
  Example: "New gas pipeline approval" → -5.7
  Example: "Rollback of renewable requirements" → -6.2
  
• 6.6-8.4 negative: Major harm - Large-scale emissions increase
  Example: "New coal plant approval" → -7.8
  Example: "Repeal of major climate legislation" → -8.1
  
• 8.5-10.0 negative: Catastrophic - Massive emissions lock-in
  Example: "Long-term fossil fuel infrastructure expansion" → -9.4

CLIMATE SCORING RULES:
1. REMOVING BARRIERS has value but ≠ DIRECT EMISSIONS REDUCTION. Score 2.5-4.0 range.
2. "Supports" or "enables" clean energy = 2.0-4.5 depending on how direct the pathway is
3. Payment/convenience improvements alone = 1.5-2.5
4. Studies, reports, advisory bodies = 0.8-1.5
5. Workforce training = 1.8-2.8
6. Infrastructure that enables future reductions = score probability × potential impact
7. USE PRECISE DECIMALS throughout - 3.65, 5.2, 7.85 are better than round numbers

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Return STRICT JSON with PRECISE DECIMAL SCORES:
{
  "results": [
    {
      "id": "bill_id",
      "relevance": 0.00-1.00 (use decimals like 0.67, 0.43),
      "personalScore": -10.00 to +10.00 (use decimals like 5.7, -2.35, 7.15),
      "personalDirection": "positive" | "negative" | "neutral",
      "personalReasons": ["reason1", "reason2", "reason3"],
      "climateDirection": "positive" | "negative" | "neutral",
      "climateScore": 0.00-10.00 (use decimals like 3.85, 6.2, 2.15),
      "climateReasons": ["reason1", "reason2", "reason3"],
      "impactMechanism": "Brief description of HOW this creates impact",
      "confidenceLevel": "high" | "medium" | "low"
    }
  ]
}

CRITICAL REMINDERS:
- USE PRECISE DECIMALS: 5.73 is better than 6.0, 3.15 is better than 3.0
- Avoid round numbers (2.0, 5.0, 7.0) - use incremental values (2.15, 4.85, 6.7)
- Use FULL range of scores. Most bills should be 2-6, with some reaching 7-8.
- A score of 8.5+ should be RARE and well-justified (transformative policy).
- Scores of 6-7 represent meaningful but moderate impact - use this range often.
- Convenience ≠ savings, but significant convenience has value (1.8-3.2).
- Be specific in reasons. "Supports clean energy" is too vague.
- Consider: Does this DIRECTLY reduce emissions or ENABLE reductions?`;

// ============================================================================
// AI SCORING FUNCTION
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

  const resp = await openai.chat.completions.create({
    model,
    temperature: 0.18,
    response_format: { type: "json_object" } as any,
    messages: [
      { role: "system", content: SCORING_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
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
    const scored = await aiScoreBillsBatch(openai, model, userProfile, chunk);
    Object.assign(all, scored);
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

  try {
    const db = getDatabaseClient();

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

      // Ranking formula - penalize negative scores less in ranking (still show harmful bills)
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
        methodology: "V8.1 Calibrated Scoring: Rigorous rubrics with precise decimal scores. Climate scores based on tangible emissions impact while recognizing enabling effects. Financial scores calibrated to actual dollar amounts.",
        stateFiltering: `Bills strictly filtered to ${normalizedState} jurisdiction only.`,
        scoreInterpretation: {
          financial: "5.5-6.9 = ~$75-175/month savings, 7.0-8.4 = $175-400/month, 8.5+ = exceptional ($400+/month or $8k+ one-time). Negative scores indicate costs. Scores use precise decimals.",
          climate: "5.2-6.7 = meaningful significant impact, 6.8-8.4 = major direct impact, 8.5+ = transformative (rare). 2.5-3.7 = enabling/supporting. 1.5-2.4 = indirect/supportive. Scores use precise decimals."
        },
        knobs: {
          MAX_BILLS_FETCH,
          AI_SHORTLIST,
          AI_BATCH_SIZE,
          RELEVANCE_THRESHOLD,
          PERSONAL_WEIGHT,
        },
        developer: "Created by Leo Levitt",
      },
    });
  } catch (error: any) {
    console.error("[FIND_BILLS] Error:", error);
    return NextResponse.json({ error: "Failed to fetch bills", details: error.message }, { status: 500 });
  }
}

// ============================================================================
// COMPREHENSIVE BILL ANALYSIS - Much more rigorous and specific
// ============================================================================

const ANALYSIS_SYSTEM_PROMPT = `You are Climate Impact Compass, an expert policy analyst created by Leo Levitt.

Your role is to provide COMPREHENSIVE, RIGOROUS, HONEST analysis of climate and energy legislation for everyday citizens.

═══════════════════════════════════════════════════════════════════════════════
CORE PRINCIPLES
═══════════════════════════════════════════════════════════════════════════════

1. BE RIGOROUS: Base ALL analysis on the actual bill text provided. Never hallucinate provisions, dollar amounts, or requirements.

2. BE SPECIFIC: Generic statements like "may provide benefits" are useless. Say exactly what, how much, and for whom.

3. BE HONEST ABOUT UNCERTAINTY: If the bill doesn't specify dollar amounts, say "Not specified in bill text." Don't guess.

4. BE CRITICAL: Identify weaknesses, implementation challenges, and reasons the bill might not deliver its promised benefits.

5. CONSIDER THE MECHANISM: Don't just say what the bill aims to do - explain HOW it creates impact and whether that mechanism is likely to work.

6. ACKNOWLEDGE LIMITATIONS: Payment standardization ≠ emissions reduction. Workforce training ≠ immediate climate benefit. Be precise.

═══════════════════════════════════════════════════════════════════════════════
ANALYSIS DEPTH REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

For FINANCIAL analysis:
- Calculate actual dollar amounts where possible
- Compare to user's specific income level
- Identify ALL eligibility requirements (don't miss disqualifiers)
- Note if benefit is one-time vs. ongoing
- Assess probability of user actually receiving benefit
- Identify upfront costs, paperwork burden, timing constraints
- Provide SPECIFIC next steps with real resources

For CLIMATE analysis:
- Quantify emissions impact where possible (tons CO2, % reduction)
- Identify the CAUSAL MECHANISM (how does this reduce emissions?)
- Distinguish direct vs. indirect impacts
- Compare to state/national goals for context
- Assess likelihood of implementation success
- Identify potential unintended consequences
- Be honest if impact is primarily symbolic/educational

═══════════════════════════════════════════════════════════════════════════════
USER PERSONALIZATION
═══════════════════════════════════════════════════════════════════════════════

You MUST tailor analysis to the specific user. Consider:
- Renter vs. owner (renters can't install solar, change HVAC, etc.)
- Income level (affects eligibility, ability to access benefits)
- Property type (apartment dweller vs. single-family home)
- Vehicle situation (no car = EV incentives irrelevant)
- Location within state (urban vs. rural considerations)
- Ability to make changes (lease restrictions, HOA rules)

═══════════════════════════════════════════════════════════════════════════════
IMPORTANT REMINDERS
═══════════════════════════════════════════════════════════════════════════════

- If bill text doesn't specify something, say "Not specified in bill text"
- Don't inflate benefits - be conservative in estimates
- Acknowledge when provisions are vague or discretionary
- Note if funding is appropriated or just authorized
- Identify who actually administers the program
- Consider implementation timeline realistically
- Be honest about barriers and challenges`;

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

    // Verify state match
    if (!jurisdictionMatchesState(bill.jurisdictionCode, bill.jurisdictionName, userProfile.state)) {
      console.warn(`[ANALYZE_BILL] Bill ${billId} is from ${bill.jurisdictionCode}, but user is from ${userProfile.state}`);
    }

    console.log(`[ANALYZE_BILL] Found bill: ${bill.title} (${bill.jurisdictionCode})`);

    // Get scores for this bill
    const tags = bill.tags.map((t) => t.tag);
    const text = joinLowercase(bill.title, bill.summary);
    const { climateHint, personalHint } = computeHints(tags, text);

    const openai = getOpenAIClient();
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
    } catch (e) {
      console.warn("[ANALYZE_BILL] Could not fetch scores, proceeding without them:", e);
    }

    const userPrompt = `Analyze this bill with DEPTH, RIGOR, and HONESTY for this SPECIFIC user.

═══════════════════════════════════════════════════════════════════════════════
USER'S COMPLETE PROFILE
═══════════════════════════════════════════════════════════════════════════════
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

═══════════════════════════════════════════════════════════════════════════════
CALIBRATED SCORES (your analysis must align with these)
═══════════════════════════════════════════════════════════════════════════════
${billScores ? `
Personal Financial Score: ${billScores.personalScore}/10 (${getPersonalScoreLabel(billScores.personalScore)})
- Direction: ${billScores.personalDirection}
- Reasons: ${billScores.personalReasons.join("; ")}

Climate Score: ${billScores.climateScore}/10 ${billScores.climateDirection} (${getClimateScoreLabel(billScores.climateScore, billScores.climateDirection)})
- Reasons: ${billScores.climateReasons.join("; ")}
- Impact mechanism: ${billScores.impactMechanism}

YOUR ANALYSIS MUST BE CONSISTENT WITH THESE SCORES. 
- A climate score of 2-3 means this is indirect/supportive, NOT a major climate action.
- A personal score of 2-3 means minimal direct benefit, NOT significant savings.
- Don't overstate benefits that aren't reflected in the scores.
` : "Scores not available - be conservative in your assessment."}

═══════════════════════════════════════════════════════════════════════════════
BILL TO ANALYZE
═══════════════════════════════════════════════════════════════════════════════
Title: ${bill.title}
Status: ${bill.status}
Jurisdiction: ${bill.jurisdictionName} (${bill.jurisdictionCode})
Date Introduced: ${bill.dateIntroduced?.toISOString().split('T')[0] || "Unknown"}
Tags: ${tags.join(", ")}

Summary/Text:
${bill.summary || "No summary available - be especially careful about claims."}

═══════════════════════════════════════════════════════════════════════════════
OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

Provide STRICT JSON with the following structure. Be thorough but honest.
For each section, if information is not in the bill text, say "Not specified in bill text."

{
  "overview": {
    "plain_english_summary": "5-6 sentences explaining what this bill actually does in simple terms. Be specific about mechanisms, not just goals.",
    "what_this_means_for_you": "4-5 sentences for THIS specific user. Be honest about relevance level. If impact is minimal, say so clearly.",
    "honest_assessment": "2-3 sentences of critical analysis: What are the limitations? What might not work as intended?",
    "key_provisions": ["8-10 specific provisions from the bill text"],
    "timeline_and_status": {
      "current_status": "string",
      "when_it_takes_effect": "string or 'Not specified'",
      "key_deadlines": ["array"],
      "what_needs_to_happen_next": "string",
      "implementation_risks": "What could delay or prevent implementation?"
    }
  },
  
  "your_specific_situation": {
    "relevance_to_you": "3-4 sentences. Be honest - if this doesn't really apply to them, say so.",
    "provisions_that_apply_to_you": ["Only list provisions that ACTUALLY apply given their profile"],
    "provisions_that_dont_apply": ["Be specific about WHY each doesn't apply"],
    "your_best_opportunities": ["Ranked, with realistic probability assessment"],
    "your_biggest_barriers": ["Specific to their situation"],
    "honest_bottom_line": "One sentence: What's the realistic best-case outcome for this specific user?"
  },
  
  "financial_impact_for_you": {
    "bottom_line": "3-4 sentences. Include actual dollar estimates ONLY if in bill text, otherwise say 'amounts not specified'.",
    "specific_benefits_for_your_situation": ["8-10 items. For each: what it is, eligibility, estimated value (or 'not specified'), probability of access"],
    "how_you_qualify": ["Specific eligibility criteria checked against their profile"],
    "what_disqualifies_you": ["Any criteria they DON'T meet"],
    "estimated_savings_range": "Be conservative. If not specified, say 'Cannot estimate from bill text'",
    "one_time_vs_ongoing": "Clarify if benefits are one-time or recurring",
    "how_to_actually_get_the_money": ["Specific actionable steps with real resources"],
    "potential_obstacles": ["Realistic barriers: paperwork, timing, funding limits, etc."],
    "upfront_costs": "What they'd need to spend to access benefits",
    "hidden_costs": ["Any costs not immediately obvious"],
    "compared_to_alternatives": "How does this compare to existing programs?"
  },
  
  "environmental_impact_explained": {
    "what_this_means_for_climate": "4-5 sentences. Be specific about the MECHANISM of impact. If indirect, say so.",
    "quantified_impact": "Specific numbers if available (tons CO2, % reduction) or 'Not quantified in bill'",
    "causal_mechanism": "HOW does this reduce emissions? Be specific.",
    "direct_vs_indirect": "Is this directly reducing emissions or just supporting/enabling?",
    "local_environmental_benefits": ["7-8 tangible impacts. Be realistic, not aspirational."],
    "if_you_participate_personally": ["What YOUR contribution would be, with comparisons"],
    "bigger_picture": "How does this fit into state/national climate goals?",
    "why_this_matters_for_your_community": ["5-6 local benefits"],
    "limitations_and_caveats": ["What this bill WON'T accomplish", "Potential unintended consequences"],
    "state_context": "How does ${userProfile.state} compare on climate action?"
  },
  
  "detailed_bill_provisions": {
    "provision_by_provision_analysis": ["6-8 provisions, each with: exact text/summary, impact on THIS user, dollar amounts, example, critical assessment"],
    "which_parts_matter_most_to_you": ["4-5 ranked by relevance to this user"],
    "implementation_mechanisms": ["How will this actually be implemented?"],
    "enforcement": "How will compliance be ensured?",
    "funding_sources": ["Where does the money come from? Is it appropriated or just authorized?"],
    "funding_adequacy": "Is funding sufficient for stated goals?"
  },
  
  "eligibility_and_requirements": {
    "who_this_is_for": ["8-10 specific eligible situations"],
    "who_this_is_NOT_for": ["5-6 ineligible situations - be thorough"],
    "your_eligibility_assessment": {
      "criteria_you_meet": ["List with explanation"],
      "criteria_you_dont_meet": ["List with explanation"],
      "uncertain_criteria": ["Need more info"],
      "overall_eligibility": "Likely eligible / Possibly eligible / Likely ineligible / Definitely ineligible"
    },
    "documentation_youll_need": ["7-8 specific documents"],
    "income_requirements": "Specific limits compared to user's stated income",
    "property_requirements": ["Specific to their property type"],
    "timing_requirements": ["Deadlines, windows, sequencing"],
    "special_considerations": ["Exceptions, waivers, edge cases"]
  },
  
  "what_we_know_and_dont_know": {
    "definitely_established": ["8-10 facts clearly stated in bill"],
    "still_to_be_determined": ["6-8 things that will be decided by regulators/agencies"],
    "potential_risks_and_downsides": ["6-7 honest risks for THIS user - don't sugarcoat"],
    "questions_nobody_can_answer_yet": ["5-6 genuine unknowns"],
    "what_could_go_wrong": ["Implementation failures, funding shortfalls, etc."],
    "what_to_watch_for": ["4-5 future developments to monitor"]
  },
  
  "your_action_plan": {
    "should_you_care": "Honest assessment: Is this worth your time and attention?",
    "do_this_now": ["5-6 immediate actions - only if actually relevant"],
    "do_this_soon": ["6-7 next 3-6 months"],
    "plan_for_later": ["4-5 long-term"],
    "questions_to_ask": {
      "ask_your_utility_company": ["5-6 specific questions"],
      "ask_contractors": ["5-6 specific questions"],
      "ask_your_state_agency": ["5-6 specific questions"]
    },
    "resources_and_help": ["6-7 ${userProfile.state} resources with actual contact info/websites"],
    "decision_framework": ["4-5 key factors for deciding whether to act"],
    "if_you_do_nothing": "What happens if you ignore this bill entirely?"
  },
  
  "real_world_context": {
    "similar_programs": ["4-5 comparable programs if known"],
    "what_makes_this_different": ["3-4 distinguishing features"],
    "track_record": "How have similar policies performed elsewhere?",
    "potential_challenges": ["6-7 realistic implementation challenges"],
    "success_factors": ["5-6 what needs to go right"],
    "lessons_from_other_states": ["3-4 if applicable"],
    "political_durability": "How likely is this to survive future legislative changes?"
  },
  
  "local_and_regional_impact": {
    "cities_and_regions_affected": ["6-7 specific places in ${userProfile.state}"],
    "your_area_specifically": ["5-6 impacts near ZIP ${userProfile.zip}"],
    "urban_vs_rural": "How does impact differ by location?",
    "local_economic_impact": ["4-5 economic effects"],
    "community_benefits": ["4-5 community-level benefits"],
    "equity_considerations": "How does this affect different income levels/communities?"
  },
  
  "common_questions_answered": {
    "is_this_a_tax_increase": "Detailed answer for income ${userProfile.household_income || 'not specified'}",
    "do_i_have_to_do_anything": "Detailed answer - is action required or optional?",
    "what_if_i_rent": "Specific answer for ${userProfile.housing_status}",
    "what_if_im_low_income": "Answer with specific income thresholds",
    "what_if_i_own_a_business": "Answer for ${userProfile.own_business || 'not specified'}",
    "how_long_does_this_take": "Realistic timeline",
    "is_the_paperwork_complicated": "Honest assessment of administrative burden",
    "what_about_maintenance": "Ongoing costs and responsibilities",
    "can_i_combine_with_other_programs": "Stacking opportunities in ${userProfile.state}",
    "what_if_i_dont_qualify": "Alternatives and other options",
    "is_this_worth_my_time": "Honest cost-benefit assessment",
    "other_important_questions": ["5-6 bill-specific questions"]
  },
  
  "critical_assessment": {
    "strengths": ["What this bill does well"],
    "weaknesses": ["What this bill does poorly or leaves unaddressed"],
    "who_benefits_most": "Which groups get the most value?",
    "who_benefits_least": "Which groups are left out?",
    "implementation_grade": "A-F grade for how well this can be implemented",
    "overall_value_for_you": "Given everything, is this bill valuable FOR THIS SPECIFIC USER?"
  }
}`;

    console.log(`[ANALYZE_BILL] Sending comprehensive analysis request...`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" } as any,
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
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

    // Safe extraction with all the new fields
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
        // BACKWARD COMPATIBILITY
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
        what_could_go_wrong: Array.isArray(analysis.what_we_know_and_dont_know?.what_could_go_wrong) ? analysis.what_we_know_and_dont_know.what_could_go_wrong : [],
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
        track_record: analysis.real_world_context?.track_record || "Not assessed",
        potential_challenges: Array.isArray(analysis.real_world_context?.potential_challenges) ? analysis.real_world_context.potential_challenges : [],
        success_factors: Array.isArray(analysis.real_world_context?.success_factors) ? analysis.real_world_context.success_factors : [],
        lessons_from_other_states: Array.isArray(analysis.real_world_context?.lessons_from_other_states) ? analysis.real_world_context.lessons_from_other_states : [],
        political_durability: analysis.real_world_context?.political_durability || "Not assessed"
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
      // Include the calibrated scores
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
        description: "Rigorous scoring with precise decimal calibration. Climate scores based on tangible emissions impact while recognizing enabling effects. Financial scores calibrated to actual dollar amounts with granular precision.",
        interpretation: {
          financial: "5.5-6.9 = ~$75-175/month savings, 7.0-8.4 = $175-400/month, 8.5+ = exceptional. Negative = costs. Uses precise decimals.",
          climate: "5.2-6.7 = meaningful significant, 6.8-8.4 = major direct, 8.5+ = transformative. 2.5-3.7 = enabling. 1.5-2.4 = indirect/supportive. Uses precise decimals."
        }
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

// ============================================================================
// MAIN HANDLER
// ============================================================================

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