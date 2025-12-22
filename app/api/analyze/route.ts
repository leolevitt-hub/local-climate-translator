// app/api/analyze/route.ts
// Climate Impact Compass - Enhanced Scoring System (V3.2+ visibility + slightly more generous personal shaping)
// Created by Leo Levitt
//
// RULES FROM USER:
// - Do not change the climate impact part at all (kept EXACTLY as previously loved).
// - Personal benefit: more generous but still rigorous.
// - Personal benefit must have a true 0.00 minimum (neutral/no benefit).
// - Keep same scoring metrics/system; make more bills show up; make personal a bit more extreme/generous.

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export const runtime = "nodejs";

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
  score: number; // 0.00 - 10.00 (neutral must be 0.00)
  label: string;
  direction: "positive" | "negative" | "neutral";
  reasons: string[];
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

/**
 * Climate stretching (unchanged usage)
 */
function stretchScore(x: number, gamma = 0.72): number {
  const clamped = Math.max(0, Math.min(10, x));
  if (clamped === 0) return 0;
  const y = 10 * Math.pow(clamped / 10, gamma);
  return Math.max(0, Math.min(10, y));
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/**
 * Personal shaping:
 * - Minimum 0.00
 * - Slightly more generous/extreme than your current V3.2
 * - Still capped and still monotonic (same "system", just tuned knobs)
 */
function shapePersonalScore(raw0to10: number): number {
  const raw = Math.max(0, Math.min(10, raw0to10));
  if (raw === 0) return 0;

  const PERSONAL_MAX = 10.0;
  // Knob 1: lower gamma pushes mid/high upward (more "extreme/generous")
  const gamma = 0.80;

  let scaled = PERSONAL_MAX * Math.pow(raw / 10, gamma);

  // Knob 2: tiny uplift for any nonzero signal so weak-but-real doesn't get stuck too low
  // (still capped at PERSONAL_MAX)
  scaled = Math.min(PERSONAL_MAX, scaled * 1.05);

  return Math.max(0, Math.min(PERSONAL_MAX, scaled));
}

function getPersonalScoreLabel(score: number): string {
  if (score >= 8.2) return "Major savings opportunity";
  if (score >= 7.2) return "Strong savings potential";
  if (score >= 6.2) return "Good savings potential";
  if (score >= 5.0) return "Moderate benefit";
  if (score >= 3.6) return "Some benefit possible";
  if (score >= 2.2) return "Limited benefit";
  if (score >= 1.0) return "Minor benefit";
  if (score > 0) return "Minimal direct benefit";
  return "No direct personal benefit";
}

function getClimateScoreLabel(score: number, direction: "positive" | "negative" | "neutral"): string {
  if (direction === "positive") {
    if (score >= 9.0) return "Transformative climate benefit";
    if (score >= 8.0) return "Major climate benefit";
    if (score >= 7.0) return "Strong climate benefit";
    if (score >= 6.0) return "Good climate benefit";
    if (score >= 5.0) return "Meaningful climate benefit";
    if (score >= 4.0) return "Moderate climate benefit";
    if (score >= 3.0) return "Some climate benefit";
    if (score > 0) return "Minor climate benefit";
    return "Neutral climate impact";
  } else if (direction === "negative") {
    if (score >= 9.0) return "Severely harmful to climate";
    if (score >= 8.0) return "Major climate harm";
    if (score >= 7.0) return "Significant climate harm";
    if (score >= 6.0) return "Considerable climate harm";
    if (score >= 5.0) return "Moderate climate harm";
    if (score >= 4.0) return "Some climate harm";
    if (score >= 3.0) return "Minor climate harm";
    if (score > 0) return "Minimal climate harm";
    return "Neutral climate impact";
  }
  return "Neutral climate impact";
}

function countMatches(text: string, keywords: string[]): number {
  let count = 0;
  const lowerText = text.toLowerCase();
  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) count++;
  }
  return count;
}

function assessPolicySpecificity(text: string): number {
  let spec = 1.0;

  const specific = [
    /\$[\d,]+/g,
    /\d+%/g,
    /\d+\s*(mw|gw|kwh|mwh|metric tons)/gi,
    /by\s+20\d{2}/gi,
    /within\s+\d+\s*(year|month)/gi,
    /up to \$[\d,]+/gi,
  ];

  for (const p of specific) {
    spec += ((text.match(p) || []).length * 0.08);
  }

  const vague = [/may\s+consider/gi, /as\s+appropriate/gi];
  for (const p of vague) {
    spec -= ((text.match(p) || []).length * 0.05);
  }

  return Math.max(0.9, Math.min(1.4, spec));
}

// ============================================================================
// CLIMATE SCORING (UNCHANGED — DO NOT MODIFY)
// ============================================================================

function calculateClimateScoreHeuristic(billText: string, tags: string[]): ScoreResult {
  const text = billText.toLowerCase();
  const reasons: string[] = [];
  let pos = 0,
    neg = 0;
  const cats = new Set<string>();

  // TIER 1: Transformative
  const mandates = [
    "renewable portfolio standard",
    "rps",
    "clean energy standard",
    "100% clean",
    "100% renewable",
    "zero-emission electricity",
    "carbon-free",
  ];
  if (countMatches(text, mandates) >= 1) {
    pos += 6.2;
    reasons.push("Establishes binding clean energy requirements");
    cats.add("mandate");
  }

  if (
    (text.includes("emissions cap") || text.includes("carbon cap")) &&
    (text.includes("penalty") || text.includes("enforce") || text.includes("binding"))
  ) {
    pos += 5.8;
    reasons.push("Binding emissions cap with enforcement");
    cats.add("cap");
  }

  const phaseOut = ["phase out", "phase-out", "retire", "ban", "prohibition"];
  const fossil = ["coal", "fossil", "natural gas", "gas plant", "oil"];
  if (countMatches(text, phaseOut) >= 1 && countMatches(text, fossil) >= 1) {
    pos += 5.2;
    reasons.push("Phases out fossil fuel infrastructure");
    cats.add("phaseout");
  }

  // TIER 2: Significant
  const hasRenTag = tags.some((t) => ["solar", "wind", "renewables"].includes(t));
  const renew = ["solar", "wind", "renewable", "clean energy", "geothermal"];
  const renCnt = countMatches(text, renew);

  if (!cats.has("mandate") && (hasRenTag || renCnt >= 1)) {
    if (text.includes("mandate") || text.includes("requirement") || text.includes("shall")) {
      pos += 4.9;
      reasons.push("Mandates renewable energy deployment");
    } else if (text.includes("incentive") || text.includes("rebate") || text.includes("credit")) {
      pos += 4.1;
      reasons.push("Incentivizes renewable energy adoption");
    } else if (text.includes("target") || text.includes("goal")) {
      pos += 3.5;
      reasons.push("Sets renewable energy targets");
    } else if (renCnt >= 2 || hasRenTag) {
      pos += 2.8;
      reasons.push("Addresses renewable energy development");
    } else {
      pos += 2.1;
      reasons.push("Supports renewable energy");
    }
    cats.add("renewable");
  }

  const emiss = ["greenhouse gas", "ghg", "carbon reduction", "emission", "co2"];
  if (!cats.has("cap") && (tags.includes("emissions") || countMatches(text, emiss) >= 1)) {
    if (text.match(/\d+%/) && (text.includes("reduction") || text.includes("reduce"))) {
      pos += 4.4;
      reasons.push("Sets specific emissions reduction targets");
    } else if (text.includes("reduction") || text.includes("limit") || text.includes("standard")) {
      pos += 3.2;
      reasons.push("Targets emissions reduction");
    } else {
      pos += 2.1;
      reasons.push("Addresses greenhouse gas emissions");
    }
    cats.add("emissions");
  }

  const evTerms = ["electric vehicle", "ev ", "evs ", "zero-emission vehicle", "zev"];
  if (tags.includes("ev") || countMatches(text, evTerms) >= 1) {
    if (text.includes("mandate") || text.includes("standard") || text.includes("require")) {
      pos += 4.7;
      reasons.push("Mandates electric vehicle adoption");
    } else if (text.includes("rebate") || text.includes("incentive") || text.includes("credit")) {
      pos += 4.0;
      reasons.push("Incentivizes electric vehicle adoption");
    } else if (text.includes("charging") || text.includes("infrastructure")) {
      pos += 3.3;
      reasons.push("Builds EV charging infrastructure");
    } else {
      pos += 2.5;
      reasons.push("Supports electric vehicle transition");
    }
    cats.add("ev");
  }

  const bldg = ["energy efficiency", "heat pump", "weatherization", "building code"];
  if (tags.includes("efficiency") || tags.includes("buildings") || countMatches(text, bldg) >= 1) {
    if (text.includes("standard") || text.includes("requirement") || text.includes("code")) {
      pos += 3.9;
      reasons.push("Establishes building efficiency standards");
    } else if (text.includes("rebate") || text.includes("incentive") || text.includes("credit")) {
      pos += 3.3;
      reasons.push("Provides building efficiency incentives");
    } else {
      pos += 2.6;
      reasons.push("Addresses building energy efficiency");
    }
    cats.add("buildings");
  }

  const storage = ["battery storage", "energy storage", "grid storage"];
  if (tags.includes("storage") || countMatches(text, storage) >= 1) {
    pos += 3.2;
    reasons.push("Supports energy storage deployment");
    cats.add("storage");
  }

  // TIER 3: Moderate
  const transit = ["public transit", "mass transit", "bus", "rail", "train"];
  if (tags.includes("transit") || countMatches(text, transit) >= 1) {
    if (text.includes("expansion") || text.includes("new") || text.includes("build")) {
      pos += 3.5;
      reasons.push("Expands public transit infrastructure");
    } else if (text.includes("electrif") || text.includes("zero-emission")) {
      pos += 3.1;
      reasons.push("Supports clean transit technology");
    } else {
      pos += 2.5;
      reasons.push("Supports public transportation");
    }
    cats.add("transit");
  }

  const resil = ["climate resilience", "adaptation", "flood", "extreme weather"];
  if (tags.includes("resilience") || countMatches(text, resil) >= 1) {
    pos += 2.4;
    reasons.push("Addresses climate resilience");
    cats.add("resilience");
  }

  const ej = ["environmental justice", "frontline", "disadvantaged", "equity"];
  if (tags.includes("environmental_justice") || countMatches(text, ej) >= 1) {
    pos += 2.0;
    reasons.push("Incorporates environmental justice");
    cats.add("justice");
  }

  const grid = ["grid modernization", "smart grid", "transmission", "microgrid"];
  if (countMatches(text, grid) >= 1) {
    pos += 2.4;
    reasons.push("Supports grid modernization");
    cats.add("grid");
  }

  const price = ["carbon tax", "carbon price", "cap and trade", "carbon fee"];
  if (countMatches(text, price) >= 1) {
    pos += 3.8;
    reasons.push("Implements carbon pricing");
    cats.add("pricing");
  }

  const ind = ["industrial", "manufacturing", "cement", "steel"];
  if (countMatches(text, ind) >= 1 && (text.includes("decarboniz") || text.includes("clean"))) {
    pos += 2.8;
    reasons.push("Supports industrial decarbonization");
    cats.add("industrial");
  }

  // TIER 4: Supporting
  const plan = ["study", "report", "task force", "plan", "roadmap"];
  const climate = ["climate", "emission", "clean energy", "renewable"];
  if (countMatches(text, plan) >= 1 && countMatches(text, climate) >= 1) {
    pos += 1.7;
    reasons.push("Climate planning and research");
    cats.add("planning");
  }

  if (
    (text.includes("clean energy") || text.includes("green")) &&
    (text.includes("job") || text.includes("workforce") || text.includes("training"))
  ) {
    pos += 1.7;
    reasons.push("Supports clean energy workforce");
    cats.add("workforce");
  }

  const finance = ["green bank", "clean energy fund", "green bond", "climate fund"];
  if (countMatches(text, finance) >= 1) {
    pos += 2.2;
    reasons.push("Creates clean energy financing");
    cats.add("finance");
  }

  const ag = ["agriculture", "farming", "forestry", "carbon sequestration"];
  if (countMatches(text, ag) >= 1 && (text.includes("climate") || text.includes("sustainable"))) {
    pos += 2.2;
    reasons.push("Supports climate-smart agriculture");
    cats.add("agriculture");
  }

  if (text.includes("water") && (text.includes("conserv") || text.includes("efficiency"))) {
    pos += 1.7;
    reasons.push("Promotes water conservation");
    cats.add("water");
  }

  // NEGATIVE FACTORS
  const fossilExp = ["new pipeline", "lng terminal", "new gas plant", "fracking"];
  if (countMatches(text, fossilExp) >= 1) {
    neg += 5.3;
    reasons.push("⚠️ Expands fossil fuel infrastructure");
  }

  if (
    (text.includes("subsidy") || text.includes("tax break")) &&
    (text.includes("oil") || text.includes("gas") || text.includes("coal"))
  ) {
    neg += 4.2;
    reasons.push("⚠️ Subsidizes fossil fuel industry");
  }

  if (
    (text.includes("rollback") || text.includes("repeal")) &&
    (text.includes("environmental") || text.includes("climate"))
  ) {
    neg += 3.8;
    reasons.push("⚠️ Weakens environmental protections");
  }

  // BONUSES
  if (cats.size >= 4) {
    pos *= 1.2;
    reasons.push("✨ Comprehensive multi-sector approach");
  } else if (cats.size >= 3) {
    pos *= 1.12;
  }

  if (cats.has("justice") && cats.size >= 2) pos *= 1.08;
  if (text.includes("funding") && text.match(/\$[\d,]+/)) pos *= 1.15;

  const spec = assessPolicySpecificity(text);
  pos *= spec;
  neg *= spec;

  // Direction + neutral logic
  let dir: "positive" | "negative" | "neutral" = "neutral";
  let magnitude = 0;

  const delta = pos - neg;
  const NEUTRAL_BAND = 0.9;

  if (Math.abs(delta) < NEUTRAL_BAND) {
    dir = "neutral";
    magnitude = 0;
  } else if (delta > 0) {
    dir = "positive";
    magnitude = Math.max(0, pos - neg * 0.55);
  } else {
    dir = "negative";
    magnitude = Math.max(0, neg - pos * 0.55);
  }

  magnitude = Math.min(10, magnitude);

  const stretched = dir === "neutral" ? 0 : stretchScore(magnitude, 0.72);
  const rounded = round2(stretched);

  return {
    score: rounded,
    label: getClimateScoreLabel(rounded, dir),
    direction: dir,
    reasons: reasons.slice(0, 6),
  };
}

// ============================================================================
// PERSONAL SCORING (same system; slightly more generous via shaping + spec boost)
// ============================================================================

function calculatePersonalScoreHeuristic(
  billText: string,
  tags: string[],
  userProfile: UserProfile
): ScoreResult {
  const text = billText.toLowerCase();
  const reasons: string[] = [];

  const isOwner = userProfile.housing_status.toLowerCase().includes("owner");
  const isRenter = userProfile.housing_status.toLowerCase().includes("renter");
  const canUpgrade = userProfile.can_make_upgrades.toLowerCase().includes("yes");
  const hasCar = userProfile.has_car.toLowerCase().includes("yes");
  const ownsBusiness = userProfile.own_business.toLowerCase().includes("yes");

  const income = userProfile.household_income.toLowerCase();
  const isLowIncome = income.includes("under $50,000");
  const isMidIncome = income.includes("$50,000 - $100,000");

  const spec = assessPolicySpecificity(text);
  const hasDollars = /\$[\d,]+/.test(text);
  const hasPercent = /\d+%/.test(text);

  // Mechanisms (money + access)
  const hasRebate = text.includes("rebate") || text.includes("cash back") || text.includes("instant discount");
  const hasTaxCredit = text.includes("tax credit") || text.includes("tax deduction") || text.includes("tax incentive");
  const hasGrant = text.includes("grant") || text.includes("voucher") || text.includes("direct payment");
  const hasBillRelief =
    text.includes("bill credit") || text.includes("bill assistance") || text.includes("rate reduction") || text.includes("lower rate");
  const hasFinancing =
    text.includes("low-interest") ||
    text.includes("zero-interest") ||
    text.includes("loan program") ||
    text.includes("financing program") ||
    text.includes("on-bill financing");

  const hasEligibility =
    text.includes("eligible") ||
    text.includes("eligibility") ||
    text.includes("income-qualified") ||
    text.includes("income eligible") ||
    text.includes("low-income") ||
    text.includes("moderate-income") ||
    text.includes("renter") ||
    text.includes("tenant") ||
    text.includes("homeowner") ||
    text.includes("multifamily") ||
    text.includes("community solar");

  const mechanismCount =
    (hasRebate ? 1 : 0) +
    (hasTaxCredit ? 1 : 0) +
    (hasGrant ? 1 : 0) +
    (hasBillRelief ? 1 : 0) +
    (hasFinancing ? 1 : 0);

  // Domain relevance
  const evRelated =
    tags.includes("ev") || text.includes("electric vehicle") || text.includes("charging") || text.includes("zev") || text.includes("ev ");

  const homeRelated =
    tags.some((t) => ["heat_pump", "efficiency", "buildings", "solar", "renewables"].includes(t)) ||
    text.includes("heat pump") ||
    text.includes("weatherization") ||
    text.includes("insulation") ||
    text.includes("efficiency") ||
    text.includes("solar") ||
    text.includes("community solar");

  const transitRelated =
    tags.includes("transit") || countMatches(text, ["public transit", "mass transit", "bus", "rail", "train", "subway"]) >= 1;

  const workforceRelated = countMatches(text, ["workforce", "job training", "apprentice", "career"]) >= 1;

  // Start at 0. True neutral.
  let raw = 0;

  // A) Core mechanism points
  if (hasRebate) {
    raw += hasDollars ? 4.2 : 3.2;
    reasons.push(hasDollars ? "💰 Rebates with stated amounts" : "💰 Rebates mentioned");
  }
  if (hasTaxCredit) {
    raw += (hasDollars || hasPercent) ? 3.8 : 2.8;
    reasons.push((hasDollars || hasPercent) ? "💵 Tax incentives with stated value" : "💵 Tax incentives mentioned");
  }
  if (hasGrant) {
    raw += hasDollars ? 3.6 : 2.6;
    reasons.push(hasDollars ? "💰 Grants/direct payments with stated amounts" : "💰 Grants/direct payments mentioned");
  }
  if (hasBillRelief) {
    raw += 3.0;
    reasons.push("📊 Utility bill relief mentioned");
  }
  if (hasFinancing) {
    raw += 2.0;
    reasons.push("🏦 Preferential financing mentioned");
  }

  // B) Domain add-ons
  if (evRelated) {
    let ev = 1.2;
    if (hasCar) {
      const timeline = userProfile.next_vehicle_timeline.toLowerCase();
      if (timeline.includes("0-12")) ev += 1.5;
      else if (timeline.includes("1-3")) ev += 1.0;
      else if (timeline.includes("3-10")) ev += 0.5;

      const commute = userProfile.commute_distance.toLowerCase();
      if (commute.includes("more than 50")) ev += 0.9;
      else if (commute.includes("25-50")) ev += 0.6;
      else if (commute.includes("10-25")) ev += 0.3;
    } else {
      ev *= 0.35;
    }

    if (mechanismCount >= 1) ev += 0.8;
    if (mechanismCount >= 2) ev += 0.5;

    raw += ev;
    reasons.push(mechanismCount ? "🚗 EV policy + financial pathway" : "🚗 EV policy likely affects costs over time");
  }

  if (homeRelated) {
    let home = 1.3;
    if (isOwner) {
      home += 1.2;
      if (canUpgrade) home += 0.6;

      const heating = userProfile.current_heating.toLowerCase();
      if (heating.includes("oil")) home += 1.0;
      else if (heating.includes("propane")) home += 0.8;
      else if (heating.includes("electric resistance")) home += 0.7;
      else if (heating.includes("natural gas")) home += 0.3;

      reasons.push("🏠 Home energy policy fits homeowner upgrade potential");
    } else if (isRenter) {
      const renterAccess = countMatches(text, ["renter", "tenant", "multifamily", "community solar", "landlord"]) >= 1;
      home += renterAccess ? 0.9 : 0.2;
      reasons.push(renterAccess ? "🏢 Renter-accessible pathway mentioned" : "🏢 Renter benefit may depend on landlord");
    }

    if (text.includes("community solar")) home += 0.8;
    if (mechanismCount >= 1) home += 0.7;
    if (mechanismCount >= 2) home += 0.4;

    raw += home;
  }

  if (transitRelated) {
    let tr = 1.0;
    if (countMatches(text, ["fare", "reduced fare", "free fare", "pass", "voucher"]) >= 1) tr += 1.2;
    if (!hasCar) tr += 0.6;
    raw += tr;
    reasons.push("🚌 Transit improvements can reduce transportation costs");
  }

  // C) Eligibility boosts
  if (hasEligibility) {
    raw += 0.9;
    reasons.push("✅ Eligibility/access language increases likelihood you can use it");
  }

  // D) Income-qualified tuning
  if (countMatches(text, ["low-income", "income-qualified", "income eligible", "moderate-income"]) >= 1) {
    if (isLowIncome) raw += 1.3;
    else if (isMidIncome) raw += 0.8;
    else raw += 0.3;
    reasons.push("💵 Income-targeted programs may increase financial benefit");
  }

  // E) Business programs
  if (ownsBusiness && countMatches(text, ["small business", "commercial", "business", "enterprise"]) >= 1) {
    raw += 1.0;
    reasons.push("💼 Commercial incentives may apply to your business");
  }

  // F) Workforce (small financial relevance)
  if (workforceRelated) {
    raw += 0.6;
    reasons.push("💼 Workforce programs can improve earnings opportunities");
  }

  // G) Mild penalties only if clearly adding costs without offsets
  const addsFee = text.includes("fee") || text.includes("surcharge");
  const offsetsFee = hasRebate || hasTaxCredit || hasGrant || hasBillRelief;
  if (addsFee && !offsetsFee) {
    raw -= 0.8;
    reasons.push("⚠️ Mentions fees/surcharges without clear offsets");
  }
  if (text.includes("rate increase") && !offsetsFee) {
    raw -= 0.7;
    reasons.push("⚠️ Mentions rate increases without clear offsets");
  }

  // H) Specificity multiplier (slightly more generous cap)
  // Knob: cap 0.18 -> 0.24 so "has numbers/funding" lifts more.
  const specBoost = 1 + Math.min(0.24, Math.max(0, spec - 1) * 0.85);
  raw *= specBoost;

  // I) If there's literally no domain relevance and no mechanisms, stay at 0
  const anySignal = mechanismCount > 0 || evRelated || homeRelated || transitRelated || workforceRelated;
  if (!anySignal) raw = 0;

  raw = Math.max(0, Math.min(10, raw));
  const shaped = round2(shapePersonalScore(raw));
  const dir: "positive" | "neutral" = shaped > 0 ? "positive" : "neutral";

  const dedupedReasons = Array.from(new Set(reasons)).slice(0, 6);

  return {
    score: shaped,
    label: getPersonalScoreLabel(shaped),
    direction: dir,
    reasons: dedupedReasons,
  };
}

// ============================================================================
// AI RESCORING (semantic, calibrated)
// ============================================================================

type AIScoredBill = {
  id: string;
  personalScore: number; // 0-10 (we shape/cap)
  personalReasons: string[];
  climateScore: number; // 0-10 magnitude
  climateDirection: "positive" | "negative" | "neutral";
  climateReasons: string[];
};

function safeArray(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string").slice(0, 6);
}

function clamp01to10(x: any): number {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

function normalizeDirection(d: any): "positive" | "negative" | "neutral" {
  if (d === "positive" || d === "negative" || d === "neutral") return d;
  return "neutral";
}

async function aiRescoreBillsBatch(
  openai: OpenAI,
  model: string,
  userProfile: UserProfile,
  bills: Array<{ id: string; title: string; summary: string; tags: string[] }>
): Promise<Record<string, AIScoredBill>> {
  const system = `You are a intelligent and optimistic but strict scoring engine for a climate policy recommender.

Return JSON only. No prose outside JSON.

Scoring rules:
- personalScore: 0.00 to 10.00 (financial/direct practical benefit to THIS user).
- climateScore: 0.00 to 10.00 (magnitude of climate impact), plus climateDirection: positive/negative/neutral.
- Neutral impact MUST be exactly 0.00 AND climateDirection = "neutral".
- Use 2 decimal precision.
- Don't punish for missing dollar amounts if the mechanism is clear.
- Mean personalScore across shortlist should be ~4.7 (slightly optimistic calibration).
- If bill mentions appropriation, funding amounts, program budget, or dedicated funds to the personal or climate benefit, increase confidence (score +0.5-1.5).
- Do punish if language is discretionary or vague.
- personalScore should be 0.00 when there is no plausible user-accessible financial pathway.
- Be willing to give mid scores (4–7) when the policy likely affects household costs even if $ amounts are not stated.
- Give high personal scores (8–10) only when there are clear incentive mechanisms OR strong, user-specific cost-savings pathways with concrete details.

Also output short bullet reasons (max 4 each).`;

  const user = {
    userProfile,
    bills: bills.map((b) => ({
      id: b.id,
      title: b.title,
      summary: b.summary,
      tags: b.tags,
    })),
    outputFormat: {
      results: [
        {
          id: "string",
          personalScore: "number (0.00-10.00)",
          personalReasons: ["string", "string"],
          climateDirection: '"positive" | "negative" | "neutral"',
          climateScore: "number (0.00-10.00)",
          climateReasons: ["string", "string"],
        },
      ],
    },
  };

  const resp = await openai.chat.completions.create({
    model,
    temperature: 0.15,
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

  const out: Record<string, AIScoredBill> = {};
  const results = parsed?.results;
  if (!Array.isArray(results)) return out;

  for (const r of results) {
    const id = String(r?.id ?? "");
    if (!id) continue;

    let personalScore = round2(clamp01to10(r?.personalScore));
    let climateScore = round2(clamp01to10(r?.climateScore));
    let climateDirection = normalizeDirection(r?.climateDirection);

    // Enforce neutrality rule (climate)
    if (climateDirection === "neutral") climateScore = 0.0;
    if (climateScore === 0) climateDirection = "neutral";

    // Climate stretching unchanged
    climateScore = climateScore === 0 ? 0 : round2(stretchScore(climateScore, 0.70));

    // Personal shaping (slightly more generous but still 0 min)
    personalScore = personalScore === 0 ? 0 : round2(shapePersonalScore(personalScore));

    out[id] = {
      id,
      personalScore,
      personalReasons: safeArray(r?.personalReasons).slice(0, 4),
      climateDirection,
      climateScore,
      climateReasons: safeArray(r?.climateReasons).slice(0, 4),
    };
  }

  return out;
}

async function aiRescoreTopBills(
  openai: OpenAI,
  model: string,
  userProfile: UserProfile,
  bills: Array<{ id: string; title: string; summary: string; tags: string[] }>,
  batchSize = 10
): Promise<Record<string, AIScoredBill>> {
  const all: Record<string, AIScoredBill> = {};
  for (let i = 0; i < bills.length; i += batchSize) {
    const chunk = bills.slice(i, i + batchSize);
    const scored = await aiRescoreBillsBatch(openai, model, userProfile, chunk);
    Object.assign(all, scored);
  }
  return all;
}

// ============================================================================
// MODE 1: FIND RELEVANT BILLS (AI-calibrated)
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

    // Knob: pull more candidates from DB to avoid empty output.
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
      take: 220, // was 120
    });

    console.log(`[FIND_BILLS] Found ${bills.length} bills for ${userProfile.state}`);

    if (bills.length === 0) {
      return NextResponse.json({
        bills: [],
        total: 0,
        message: `No bills found for state: ${userProfile.state}`,
      });
    }

    // 1) Heuristic pass (fast)
    const heurScored = bills.map((bill) => {
      const billText = joinLowercase(bill.title, bill.summary);
      const tagList = bill.tags.map((t) => t.tag);

      const personal = calculatePersonalScoreHeuristic(billText, tagList, userProfile);
      const climate = calculateClimateScoreHeuristic(billText, tagList); // unchanged

      const identifierMatch = bill.title.match(/^([A-Z]{1,3}\s*\d+)/);
      const identifier = identifierMatch ? identifierMatch[1] : bill.title.substring(0, 10);

      // Keep shortlist weight high so we don't miss personal-heavy bills
      const total = personal.score * 1.8 + climate.score;

      return {
        raw: bill,
        id: bill.id,
        identifier,
        title: bill.title,
        summary: bill.summary || "No summary available",
        tags: tagList,
        sources: bill.sources.map((s) => ({ url: s.url, name: s.name })),
        jurisdictionName: bill.jurisdictionName,
        status: bill.status,
        dateIntroduced: bill.dateIntroduced?.toISOString() || null,
        heurPersonal: personal,
        heurClimate: climate,
        heurTotal: total,
      };
    });

    // 2) Shortlist for OpenAI rescoring
    const TOP_K = 60; // was 40 (more AI-scored candidates => more nonzero outcomes)
    const shortlist = heurScored
      .slice()
      .sort((a, b) => b.heurTotal - a.heurTotal)
      .slice(0, TOP_K)
      .map((x) => ({
        id: x.id,
        title: x.title,
        summary: x.summary,
        tags: x.tags,
      }));

    // 3) OpenAI rescoring
    const openai = getOpenAIClient();
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    let aiMap: Record<string, AIScoredBill> = {};
    try {
      aiMap = await aiRescoreTopBills(openai, model, userProfile, shortlist, 10);
    } catch (e: any) {
      console.warn("[FIND_BILLS] AI rescoring failed, falling back to heuristics:", e?.message || e);
      aiMap = {};
    }

    // 4) Combine (prefer AI when available)
    const combined = heurScored.map((x) => {
      const ai = aiMap[x.id];

      const personalScore = ai ? ai.personalScore : x.heurPersonal.score;
      const personalReasons = ai ? ai.personalReasons : x.heurPersonal.reasons;
      const personalDirection = personalScore > 0 ? "positive" : "neutral";
      const personalLabel = getPersonalScoreLabel(personalScore);

      const climateScore = ai ? ai.climateScore : x.heurClimate.score;
      const climateDirection = ai ? ai.climateDirection : x.heurClimate.direction;
      const climateReasons = ai ? ai.climateReasons : x.heurClimate.reasons;
      const climateLabel = getClimateScoreLabel(climateScore, climateDirection);

      const total = personalScore * 1.25 + climateScore;

      return {
        id: x.id,
        identifier: x.identifier,
        title: x.title,
        summary: x.summary,
        personalScore,
        personalLabel,
        personalDirection,
        personalReasons,
        climateScore,
        climateLabel,
        climateDirection,
        climateReasons,
        jurisdictionName: x.jurisdictionName,
        status: x.status,
        dateIntroduced: x.dateIntroduced,
        tags: x.tags,
        sources: x.sources,
        _rank: total,
        _scoredBy: ai ? "openai+shape" : "heuristic+shape",
      };
    });

    // ===== Visibility fix =====
    // Return more bills even if many are 0/0 (fillers), instead of filtering them all out.
    const RETURN_N = 45; // was effectively 30 after filter
    const sorted = combined.slice().sort((a, b) => b._rank - a._rank);

    const nonZero = sorted.filter((b) => b.personalScore > 0 || b.climateScore > 0);
    const zeroZero = sorted.filter((b) => b.personalScore === 0 && b.climateScore === 0);

    const filled = nonZero.length >= RETURN_N
      ? nonZero.slice(0, RETURN_N)
      : nonZero.concat(zeroZero.slice(0, RETURN_N - nonZero.length));

    const relevantBills = filled
      .slice(0, RETURN_N)
      .map(({ _rank, _scoredBy, ...rest }) => rest);

    console.log(`[FIND_BILLS] Returning ${relevantBills.length} bills (nonZero=${nonZero.length}, fillers=${Math.max(0, RETURN_N - nonZero.length)})\n`);

    return NextResponse.json({
      bills: relevantBills,
      total: relevantBills.length,
      scoringExplanation: {
        methodology:
          "Two-stage scoring: heuristic shortlist + OpenAI semantic rescoring. Climate unchanged; personal is balanced & slightly more generous via shaping.",
        neutralRule: "Neutral impact is exactly 0.00.",
        personalScore: "Direct financial/practical benefit to the user (0.00–10.00, shaped).",
        climateScore: "Magnitude of climate impact (0.00–10.00) with direction positive/negative/neutral.",
        visibilityRule:
          "If fewer than the target count have nonzero scores, the list is filled with top-ranked remaining bills (may be 0.00/0.00) so you can still browse more policies.",
        developer: "Created by Leo Levitt",
      },
    });
  } catch (error: any) {
    console.error("[FIND_BILLS] Error:", error);
    return NextResponse.json({ error: "Failed to fetch bills", details: error.message }, { status: 500 });
  }
}

// ============================================================================
// MODE 2: ANALYZE SPECIFIC BILL (unchanged)
// ============================================================================

async function analyzeBill(billId: string, userProfile: UserProfile): Promise<NextResponse> {
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

Output strict JSON only.`;

    const userPrompt = `Analyze this climate bill with analytical rigor and practical focus.

USER PROFILE:
- Location: ${userProfile.zip}, ${userProfile.state}
- Housing: ${userProfile.housing_status} in ${userProfile.property_type}
- Home age: ${userProfile.home_age}
- Current heating: ${userProfile.current_heating}
- Upgrade capability: ${userProfile.can_make_upgrades}
- Solar interest: ${userProfile.interested_in_solar}
- Transportation: ${userProfile.has_car ? `Owns car, prefers ${userProfile.utility_fuels}` : "No car"}
- Commute distance: ${userProfile.commute_distance}
- Decision timeline: ${userProfile.next_vehicle_timeline}
- Household income: ${userProfile.household_income}
- Household size: ${userProfile.household_size}
- Business owner: ${userProfile.own_business}
- Occupation: ${userProfile.job_sector || "Not specified"}

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
    return NextResponse.json({ error: "Failed to analyze bill", details: error.message }, { status: 500 });
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
