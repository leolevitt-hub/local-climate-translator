// app/api/analyze/route.ts
// Climate Impact Compass
// Created by Leo Levitt - Bringing analytical rigor to climate action
// 
// Philosophy: Climate policy matters, but only if it's practical and measurable.
// This system uses data-driven scoring to help people make informed decisions
// about climate policies that affect both their finances and the planet.
//
// Dual-Score Approach:
// - Personal Impact (0-10): Quantifies financial benefits based on your situation
// - Climate Impact (0-10): Measures emissions reduction and clean energy gains
// Both scores: Higher = More positive impact

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient();


export const runtime = "nodejs";

// ============================================================================
// DATABASE & AI SETUP
// ============================================================================

let prismaInstance: PrismaClient | null = null;

function getDatabaseClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is missing");
  }
  
  if (!prismaInstance) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    
    prismaInstance = new PrismaClient({ 
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    
    console.log("✓ Prisma client initialized");
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
    timeout: 30000,
  });
}

// ============================================================================
// TYPES
// ============================================================================

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

type ScoreResult = {
  score: number;
  label: string;
  direction: string;
  reasons: string[];
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

function getScoreLabel(score: number, type: "personal" | "climate"): { label: string; direction: string } {
  if (type === "personal") {
    // Personal: Higher = More savings/benefits for you
    if (score >= 8) return { label: "Major savings opportunity", direction: "positive" };
    if (score >= 6) return { label: "Good savings potential", direction: "positive" };
    if (score >= 4) return { label: "Moderate benefit", direction: "neutral" };
    if (score >= 2) return { label: "Limited benefit", direction: "neutral" };
    return { label: "Minimal personal impact", direction: "neutral" };
  } else {
    // Climate: Higher = Better for climate, Lower = Worse for climate
    if (score >= 8) return { label: "Major climate benefit", direction: "positive" };
    if (score >= 6) return { label: "Strong climate benefit", direction: "positive" };
    if (score >= 4) return { label: "Modest climate benefit", direction: "neutral" };
    if (score >= 2) return { label: "Minimal climate impact", direction: "neutral" };
    return { label: "Harmful to climate", direction: "negative" };
  }
}

// ============================================================================
// CLIMATE IMPACT SCORING
// Analytical framework for measuring environmental benefit
// Scale: 0-10 where 10 = maximum positive climate impact
// ============================================================================

function calculateClimateScore(
  billText: string,
  tags: string[]
): ScoreResult {
  const text = billText.toLowerCase();
  const reasons: string[] = [];
  let score = 5.0; // Neutral baseline

  // POSITIVE CLIMATE IMPACT (increases score toward 10)
  
  // Direct renewable energy expansion (+2.5)
  // Rationale: Clean energy directly displaces fossil fuels
  if (
    tags.some((t) => ["solar", "wind", "renewables"].includes(t)) ||
    text.includes("renewable") ||
    text.includes("solar") ||
    text.includes("wind energy")
  ) {
    score += 2.5;
    reasons.push("Expands clean renewable energy generation capacity");
  }

  // Greenhouse gas emissions reduction (+2.0)
  // Rationale: Direct GHG reduction is the primary climate objective
  if (
    tags.includes("emissions") ||
    text.includes("greenhouse gas") ||
    text.includes("carbon reduction") ||
    text.includes("emissions reduction")
  ) {
    score += 2.0;
    reasons.push("Directly targets greenhouse gas emissions reduction");
  }

  // Zero-emission vehicle adoption (+1.5)
  // Rationale: Transportation is ~27% of US emissions
  if (tags.includes("ev") || text.includes("electric vehicle")) {
    score += 1.5;
    reasons.push("Accelerates transition to zero-emission transportation");
  }

  // Energy efficiency improvements (+1.5)
  // Rationale: Efficiency reduces demand, avoiding new generation
  if (
    tags.includes("efficiency") ||
    text.includes("energy efficiency") ||
    text.includes("weatherization")
  ) {
    score += 1.5;
    reasons.push("Reduces energy waste and total consumption");
  }

  // Climate resilience & adaptation (+1.0)
  // Rationale: Prepares infrastructure for unavoidable climate impacts
  if (
    tags.includes("resilience") ||
    text.includes("climate resilience") ||
    text.includes("adaptation")
  ) {
    score += 1.0;
    reasons.push("Builds resilience to climate change impacts");
  }

  // Environmental justice (+0.8)
  // Rationale: Protects vulnerable communities, ensures equitable transition
  if (tags.includes("environmental_justice") || text.includes("environmental justice")) {
    score += 0.8;
    reasons.push("Protects vulnerable communities from climate impacts");
  }

  // Energy storage (+1.2)
  // Rationale: Enables higher renewable penetration on the grid
  if (tags.includes("storage") || text.includes("battery storage")) {
    score += 1.2;
    reasons.push("Enables greater renewable energy grid integration");
  }

  // NEGATIVE CLIMATE IMPACT (decreases score toward 0)
  
  // Fossil fuel infrastructure expansion (-3.0)
  // Rationale: Locks in decades of emissions, contradicts climate goals
  if (
    (tags.includes("fossil") && (text.includes("expand") || text.includes("new"))) ||
    text.includes("oil drilling") ||
    text.includes("gas pipeline expansion") ||
    text.includes("new coal")
  ) {
    score -= 3.0;
    reasons.push("⚠️ Expands fossil fuel infrastructure, locking in emissions");
  }

  // Fossil fuel subsidies (-2.0)
  // Rationale: Public funds should support clean energy, not fossil fuels
  if (
    tags.includes("subsidies_taxes") &&
    (text.includes("oil subsidy") || text.includes("gas subsidy") || text.includes("fossil fuel tax break"))
  ) {
    score -= 2.0;
    reasons.push("⚠️ Provides taxpayer subsidies to fossil fuel industry");
  }

  // Car-dependent infrastructure without clean alternatives (-1.5)
  // Rationale: Highway expansion increases vehicle miles traveled
  if (
    (tags.includes("roads") || text.includes("highway expansion")) &&
    !text.includes("transit") &&
    !text.includes("ev")
  ) {
    score -= 1.5;
    reasons.push("⚠️ Expands car-dependent infrastructure without clean alternatives");
  }

  // Environmental protection rollbacks (-1.5)
  // Rationale: Weakening safeguards enables more pollution
  if (text.includes("rollback") || (text.includes("weaken") && text.includes("environmental"))) {
    score -= 1.5;
    reasons.push("⚠️ Weakens environmental protections");
  }

  // Constrain to 0-10 scale
  score = Math.max(0, Math.min(10, score));

  const { label, direction } = getScoreLabel(score, "climate");

  return {
    score,
    label,
    direction,
    reasons: reasons.slice(0, 6),
  };
}

// ============================================================================
// PERSONAL IMPACT SCORING
// Evidence-based framework for quantifying financial benefit
// Scale: 0-10 where 10 = maximum personal financial benefit
// ============================================================================

function calculatePersonalScore(
  billText: string,
  tags: string[],
  userProfile: UserProfile
): ScoreResult {
  const text = billText.toLowerCase();
  const reasons: string[] = [];
  let score = 0; // Zero baseline (no assumed benefit)

  // DIRECT FINANCIAL INCENTIVES (+3.5)
  // These directly reduce consumer costs via rebates, tax credits, subsidies
  if (
    text.includes("rebate") ||
    text.includes("tax credit") ||
    text.includes("incentive") ||
    text.includes("subsidy")
  ) {
    score += 3.5;
    reasons.push("💰 Direct financial incentives reduce upfront costs");
  }

  // TRANSPORTATION COST SAVINGS (+2.0 base)
  // EVs have lower fuel and maintenance costs than gas vehicles
  const isEVRelated =
    tags.some((t) => ["ev", "transit"].includes(t)) ||
    text.includes("electric vehicle") ||
    text.includes("charging");

  if (isEVRelated) {
    score += 2.0;
    reasons.push("🚗 Electric vehicles significantly reduce fuel and maintenance costs");
    
    // Commute distance bonus (longer commute = more fuel savings)
    const commute = userProfile.commute_distance.toLowerCase();
    if (commute.includes("25-50")) {
      score += 0.8;
      reasons.push("🛣️ Your 25-50 mile commute creates substantial EV fuel savings");
    } else if (commute.includes("more than 50")) {
      score += 1.2;
      reasons.push("🛣️ Your 50+ mile commute maximizes EV cost savings potential");
    } else if (commute.includes("10-25")) {
      score += 0.4;
    }
  }

  // HOME ENERGY COST SAVINGS (+2.0 base)
  // Efficiency improvements and clean energy reduce utility bills
  const isHomeRelated =
    tags.some((t) =>
      ["heat_pump", "efficiency", "buildings", "solar", "renewables"].includes(t)
    ) ||
    text.includes("heat pump") ||
    text.includes("solar") ||
    text.includes("efficiency");

  if (isHomeRelated) {
    score += 2.0;
    reasons.push("🏠 Energy upgrades lower utility bills and increase comfort");
    
    // Home age bonus (older homes have more efficiency improvement potential)
    const homeAge = userProfile.home_age.toLowerCase();
    if (homeAge.includes("30-50")) {
      score += 0.6;
      reasons.push("🏚️ Older home (30-50 years) has higher efficiency upgrade potential");
    } else if (homeAge.includes("more than 50")) {
      score += 0.9;
      reasons.push("🏚️ Historic home (50+ years) could see major efficiency gains");
    }
    
    // Heating system bonus (fossil fuel heating = bigger heat pump savings)
    const heating = userProfile.current_heating.toLowerCase();
    if (heating.includes("oil")) {
      score += 1.2;
      reasons.push("🔥 Switching from oil heat to heat pump offers maximum savings");
    } else if (heating.includes("propane")) {
      score += 1.0;
      reasons.push("🔥 Switching from propane to heat pump provides significant savings");
    } else if (heating.includes("natural gas")) {
      score += 0.7;
      reasons.push("🔥 Heat pump upgrade from gas can reduce heating costs");
    } else if (heating.includes("electric resistance")) {
      score += 0.8;
      reasons.push("🔥 Heat pump is 3x more efficient than electric resistance");
    }
  }

  // SOLAR INTEREST MULTIPLIER
  if (text.includes("solar") || tags.includes("solar")) {
    const solarInterest = userProfile.interested_in_solar.toLowerCase();
    if (solarInterest.includes("yes, very interested")) {
      score += 1.5;
      reasons.push("☀️ High solar interest aligns with available solar incentives");
    } else if (solarInterest.includes("maybe")) {
      score += 0.5;
    }
  }

  // USER CONTEXT ADJUSTMENTS
  
  // Homeownership enables direct action without landlord approval
  const housing = userProfile.housing_status.toLowerCase();
  if (housing.includes("owner") && isHomeRelated) {
    score += 1.5;
    reasons.push("✅ Homeowner status enables direct implementation");
  } else if (housing.includes("renter") && isHomeRelated) {
    score += 0.3;
    reasons.push("⚠️ Benefits may require landlord cooperation");
  }

  // Upgrade capability determines implementation feasibility
  const canUpgrade = userProfile.can_make_upgrades.toLowerCase();
  if (canUpgrade.includes("yes") && isHomeRelated) {
    score += 1.0;
    reasons.push("✅ Ready to implement upgrades");
  } else if (canUpgrade.includes("no") && isHomeRelated) {
    score -= 0.5;
    reasons.push("⚠️ Limited upgrade capability reduces immediate benefits");
  }

  // Vehicle ownership creates EV savings opportunity
  if (userProfile.has_car.toLowerCase().includes("yes") && isEVRelated) {
    score += 1.2;
    reasons.push("✅ Vehicle ownership creates fuel savings opportunity");
  }

  // Decision timeline affects actionability
  const timeline = userProfile.next_vehicle_timeline.toLowerCase();
  if (timeline.includes("0-12") && isEVRelated) {
    score += 1.5;
    reasons.push("⏰ Near-term vehicle purchase makes benefits immediately accessible");
  } else if (timeline.includes("1-3") && isEVRelated) {
    score += 0.8;
    reasons.push("📅 Medium-term timeline allows strategic EV planning");
  } else if (timeline.includes("10+") && isEVRelated) {
    score -= 0.4;
  }

  // Property type constraints
  const property = userProfile.property_type.toLowerCase();
  if (property.includes("apartment") && isHomeRelated) {
    score -= 0.3;
    reasons.push("⚠️ Apartment living may limit certain upgrades (e.g., solar panels)");
  } else if (property.includes("single-family") && isHomeRelated) {
    score += 0.5;
    reasons.push("✅ Single-family home ideal for comprehensive upgrades");
  }

  // Income-based incentive eligibility
  const income = userProfile.household_income.toLowerCase();
  if (income.includes("under $50,000") || income.includes("$50,000 - $100,000")) {
    if (text.includes("income") && (text.includes("limit") || text.includes("qualified"))) {
      score += 1.0;
      reasons.push("💵 May qualify for additional income-based incentives");
    }
  }

  // Business ownership for commercial incentives
  if (userProfile.own_business.toLowerCase().includes("yes")) {
    if (text.includes("commercial") || text.includes("business")) {
      score += 0.8;
      reasons.push("💼 Business ownership may unlock commercial incentives");
    }
  }

  // Economic opportunity and job creation
  if (text.includes("job") || text.includes("workforce") || text.includes("training")) {
    score += 0.5;
    reasons.push("💼 Creates local job and economic opportunities");
  }

  // NEGATIVE PERSONAL IMPACT
  // Costs without offsetting benefits reduce personal score
  if (
    (text.includes("fee") || text.includes("tax increase")) &&
    !text.includes("credit") &&
    !text.includes("rebate")
  ) {
    score -= 1.0;
    reasons.push("⚠️ May increase costs without direct offsetting benefits");
  }

  const finalScore = Math.max(0, Math.min(10, score));
  const { label, direction } = getScoreLabel(finalScore, "personal");

  return {
    score: finalScore,
    label,
    direction,
    reasons: reasons.slice(0, 6),
  };
}

// ============================================================================
// MODE 1: FIND RELEVANT BILLS
// ============================================================================

async function findRelevantBills(userProfile: UserProfile): Promise<NextResponse> {
  console.log(`\n[FIND_BILLS] Starting for state: ${userProfile.state}`);

  if (!userProfile.state) {
    return NextResponse.json({ error: "State is required" }, { status: 400 });
  }

  try {
    const db = getDatabaseClient();

    const totalCount = await db.policy.count();
    console.log(`[FIND_BILLS] Total policies in DB: ${totalCount}`);

    if (totalCount === 0) {
      return NextResponse.json({
        bills: [],
        total: 0,
        message: "No policies in database. Run ingestion script first.",
      });
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
      take: 100,
    });

    console.log(`[FIND_BILLS] Found ${bills.length} bills for ${userProfile.state}`);

    if (bills.length === 0) {
      return NextResponse.json({
        bills: [],
        total: 0,
        message: `No bills found for state: ${userProfile.state}`,
      });
    }

    const scoredBills = bills.map((bill) => {
      const billText = joinLowercase(bill.title, bill.summary);
      const tagList = bill.tags.map((t) => t.tag);
      
      const personalResult = calculatePersonalScore(billText, tagList, userProfile);
      const climateResult = calculateClimateScore(billText, tagList);

      const identifierMatch = bill.title.match(/^([A-Z]{1,3}\s*\d+)/);
      const identifier = identifierMatch
        ? identifierMatch[1]
        : bill.title.substring(0, 10);

      return {
        id: bill.id,
        identifier,
        title: bill.title,
        summary: bill.summary || "No summary available",
        personalScore: personalResult.score,
        personalLabel: personalResult.label,
        personalDirection: personalResult.direction,
        personalReasons: personalResult.reasons,
        climateScore: climateResult.score,
        climateLabel: climateResult.label,
        climateDirection: climateResult.direction,
        climateReasons: climateResult.reasons,
        jurisdictionName: bill.jurisdictionName,
        status: bill.status,
        dateIntroduced: bill.dateIntroduced?.toISOString() || null,
        tags: tagList,
        sources: bill.sources.map((s) => ({ url: s.url, name: s.name })),
      };
    });

    // Filter: Include if either score is meaningful
    // Sort: Primary by personal impact (what helps you), secondary by climate impact
    const relevantBills = scoredBills
      .filter((b) => b.personalScore >= 3.0 || b.climateScore >= 6.0)
      .sort((a, b) => {
        if (Math.abs(b.personalScore - a.personalScore) > 0.5) {
          return b.personalScore - a.personalScore;
        }
        return b.climateScore - a.climateScore;
      })
      .slice(0, 20);

    console.log(`[FIND_BILLS] Returning ${relevantBills.length} relevant bills\n`);

    return NextResponse.json({
      bills: relevantBills,
      total: relevantBills.length,
      scoringExplanation: {
        methodology: "Evidence-based dual-impact scoring system",
        personalScore: "Quantifies financial benefit based on available incentives, your housing situation, upgrade capability, commute distance, current heating system, and decision timeline. Higher scores indicate greater potential savings.",
        climateScore: "Measures environmental impact based on emissions reduction, renewable energy expansion, and climate resilience. Higher scores indicate stronger climate benefits. Lower scores may indicate policies that expand fossil fuel infrastructure or weaken environmental protections.",
        scale: "Both metrics use a 0-10 scale where 10 represents maximum positive impact",
        developer: "Created by Leo Levitt using analytical frameworks to make climate policy actionable"
      }
    });
  } catch (error: any) {
    console.error("[FIND_BILLS] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills", details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// MODE 2: ANALYZE SPECIFIC BILL
// ============================================================================

async function analyzeBill(
  billId: string,
  userProfile: UserProfile
): Promise<NextResponse> {
  console.log(`\n[ANALYZE_BILL] Starting for bill: ${billId}`);

  try {
    const db = getDatabaseClient();

    const bill = await db.policy.findUnique({
      where: { id: billId },
      include: { tags: { select: { tag: true } } },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    console.log(`[ANALYZE_BILL] Found: ${bill.title}`);

    const openai = getOpenAIClient();
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const systemPrompt = `You are Climate Impact Compass, an analytical policy tool created by Leo Levitt.

Your purpose: Help people make informed decisions about climate policies using data and evidence.

Core principles:
1. Be precise and analytical - use specific numbers when available
2. Distinguish between what's certain vs. what depends on implementation
3. Explain both financial benefits (personal) and environmental benefits (climate)
4. Be honest about trade-offs, costs, and uncertainties
5. Focus on actionable information over generic advice

Your tone: Knowledgeable, warm, and straightforward. Like a well-informed friend who's done the research.`;

    const userPrompt = `Analyze this climate bill with analytical rigor and practical focus.

USER PROFILE:
- Location: ${userProfile.zip}, ${userProfile.state}
- Housing: ${userProfile.housing_status} in ${userProfile.property_type}
- Home age: ${userProfile.home_age}
- Current heating: ${userProfile.current_heating}
- Upgrade capability: ${userProfile.can_make_upgrades}
- Solar interest: ${userProfile.interested_in_solar}
- Transportation: ${userProfile.has_car ? `Owns car, prefers ${userProfile.utility_fuels}` : 'No car'}
- Commute distance: ${userProfile.commute_distance}
- Decision timeline: ${userProfile.next_vehicle_timeline}
- Household income: ${userProfile.household_income}
- Household size: ${userProfile.household_size}
- Business owner: ${userProfile.own_business}
- Occupation: ${userProfile.job_sector || 'Not specified'}

BILL DETAILS:
Title: ${bill.title}
Status: ${bill.status}
Summary: ${bill.summary || "No summary provided"}
Policy areas: ${bill.tags.map((t) => t.tag).join(", ")}
Jurisdiction: ${bill.jurisdictionName}

Provide detailed analysis in JSON format:
{
  "plain_english_summary": "2-3 clear sentences explaining what this does and why it matters",
  "personal_benefits": ["Specific financial benefits - mention dollar amounts if inferable from bill text"],
  "climate_benefits": ["Specific environmental benefits - quantify emissions reductions or clean energy capacity if possible"],
  "potential_downsides": ["Honest assessment of costs, limitations, or challenges"],
  "actions": {
    "do_now": ["3 specific, low-effort immediate actions"],
    "do_later": ["3 medium-term planning steps"],
    "ignore_for_now": ["2 things that don't require attention yet"]
  },
  "who_qualifies": ["Specific eligibility criteria - income limits, property requirements, etc."],
  "money_details": {
    "upfront_costs": ["What you'd need to spend initially"],
    "monthly_savings": ["Estimated monthly cost reductions"],
    "payback_timeline": ["When savings offset costs - be specific if possible"],
    "available_help": ["Specific rebates, tax credits, or financing programs"]
  },
  "climate_details": {
    "emissions_impact": ["Quantified GHG reductions if possible, or qualitative assessment"],
    "clean_energy_added": ["Renewable capacity additions or efficiency gains"],
    "resilience_benefits": ["How this prepares for climate impacts"]
  },
  "next_steps": ["Concrete step-by-step actions to benefit from this policy"],
  "local_checks": ["What to verify with city, utility, or county"],
  "open_questions": ["What depends on future regulations or funding availability"],
  "questions_for_pros": ["Specific questions for contractors, utilities, or officials"]
}

Be analytical and evidence-based. Distinguish between what's certain and what's uncertain.`;

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
      if (start !== -1 && end !== -1) {
        analysis = JSON.parse(rawContent.slice(start, end + 1));
      }
    }

    if (!analysis) {
      return NextResponse.json({ error: "AI returned invalid response" }, { status: 502 });
    }

    console.log(`[ANALYZE_BILL] Analysis complete\n`);

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error("[ANALYZE_BILL] Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze bill", details: error.message },
      { status: 500 }
    );
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
      response = await analyzeBill(body.billId, userProfile);
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