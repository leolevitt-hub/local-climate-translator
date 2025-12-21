// app/api/analyze/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractFirstJsonObject(text: string): any | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

function asString(v: any, fallback = ""): string {
  if (typeof v === "string") return v.trim();
  if (v === null || v === undefined) return fallback;
  return String(v).trim();
}

function asStringArray(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeInput(body: any) {
  const zip = asString(body.zip ?? body.zipcode ?? body.postal_code ?? "");
  const state = asString(body.state ?? "");

  const housing_status = asString(body.housing_status ?? body.housingStatus ?? "");
  const property_type = asString(body.property_type ?? body.housingType ?? "");

  const can_make_upgrades = asString(body.can_make_upgrades ?? body.canMakeUpgrades ?? "");

  const utility_fuels = asString(
    body.utility_fuels ?? body.utilityFuels ?? body.vehiclePreference ?? ""
  );

  const has_car = asString(body.has_car ?? body.hasCar ?? "");
  const next_vehicle_timeline = asString(
    body.next_vehicle_timeline ?? body.timeHorizon ?? body.nextVehicleTimeline ?? ""
  );

  const job_sector = asString(body.job_sector ?? body.job ?? body.jobRole ?? "");
  const work_location = asString(body.work_location ?? body.workSetting ?? "");

  const policy_text = asString(body.policy_text ?? body.policyText ?? "");

  return {
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
  };
}

/**
 * Deterministic relevance scoring:
 * - Combine user context + simple keyword detection in the excerpt.
 * - No GPT.
 */
function computeRelevance(input: ReturnType<typeof normalizeInput>) {
  const t = (input.policy_text || "").toLowerCase();

  const hits = (keywords: string[]) =>
    keywords.some((k) => t.includes(k.toLowerCase()));

  const reasons: string[] = [];
  let score = 0;

  // Policy text signals (largest effect)
  if (hits(["rebate", "rebates", "tax credit", "tax credits", "incentive", "incentives"])) {
    score += 3.0;
    reasons.push("The excerpt includes consumer-facing incentives (rebates / tax credits), which can change real purchasing decisions.");
  }

  if (hits(["electric vehicle", "ev ", "evs", "charging", "plug-in"])) {
    score += 1.5;
    reasons.push("The excerpt touches transportation (EVs/charging), which matters if you own or plan to buy a car.");
  }

  if (hits(["heat pump", "insulation", "weatherization", "efficiency", "energy efficiency", "home energy"])) {
    score += 1.5;
    reasons.push("The excerpt addresses home energy upgrades (efficiency/heat pumps), which can affect bills and comfort.");
  }

  if (hits(["manufacturing", "domestic content", "supply chain", "factory", "production"])) {
    score += 1.0;
    reasons.push("The excerpt includes industrial/manufacturing provisions, which can affect local jobs and availability of equipment.");
  }

  if (hits(["low-income", "disadvantaged", "equity", "community", "environmental justice"])) {
    score += 0.8;
    reasons.push("The excerpt references targeting rules (e.g., low-income/disadvantaged), which can change eligibility and access.");
  }

  // User context signals (moderate effect)
  const hs = input.housing_status.toLowerCase();
  if (hs.includes("owner")) {
    score += 1.0;
    reasons.push("Homeowners can directly act on home upgrade/solar provisions without landlord approval.");
  } else if (hs.includes("renter")) {
    score += 0.4;
    reasons.push("Renters may still benefit, but landlord approval and building constraints can limit what you can do.");
  }

  const upgrades = input.can_make_upgrades.toLowerCase();
  if (upgrades.includes("yes")) {
    score += 0.8;
    reasons.push("You indicated you can make upgrades, increasing the chance the policy affects you directly.");
  } else if (upgrades.includes("no")) {
    score -= 0.4;
    reasons.push("You indicated you can’t make upgrades right now, which may reduce immediate relevance.");
  }

  const car = input.has_car.toLowerCase();
  if (car.includes("yes") && hits(["electric vehicle", "ev ", "charging"])) {
    score += 0.8;
    reasons.push("You have a car and the policy mentions EV-related items, increasing relevance.");
  }

  // Time horizon: near-term decisions -> more relevant
  const horizon = input.next_vehicle_timeline.toLowerCase();
  if (horizon.includes("0–12") || horizon.includes("0-12")) {
    score += 1.0;
    reasons.push("Your timeline is near-term, so incentives/eligibility changes may matter sooner.");
  } else if (horizon.includes("1–3") || horizon.includes("1-3")) {
    score += 0.6;
    reasons.push("Your decision timeline is within a few years, so it’s worth tracking program details.");
  } else if (horizon.includes("10+")) {
    score -= 0.3;
    reasons.push("Your timeline is far out, so today’s program details may change before you act.");
  }

  // Property type nuance (small)
  const pt = input.property_type.toLowerCase();
  if (pt.includes("apartment")) {
    score -= 0.2;
    reasons.push("Apartment living often limits upgrades like rooftop solar or panel upgrades, lowering direct impact.");
  }

  score = clamp(score, 0, 10);

  let tier: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (score >= 7.0) tier = "HIGH";
  else if (score >= 4.0) tier = "MEDIUM";

  const whatItMeans =
    tier === "HIGH"
      ? "This policy is likely to change a real decision you could make (costs, eligibility, or timing)."
      : tier === "MEDIUM"
      ? "This policy may matter depending on eligibility and local program details—worth a quick check if you're making a decision soon."
      : "This policy is unlikely to change your decisions right now, but could be worth revisiting if your situation changes.";

  return {
    score_0_to_10: score,
    tier,
    reasons: reasons.slice(0, 6), // keep it scannable
    what_it_means: whatItMeans,
  };
}

function normalizeResult(obj: any, relevance: ReturnType<typeof computeRelevance>) {
  return {
    relevance,

    plain_english_summary: asString(obj?.plain_english_summary ?? ""),

    actions: {
      do_now: asStringArray(obj?.actions?.do_now),
      do_later: asStringArray(obj?.actions?.do_later),
      ignore_for_now: asStringArray(obj?.actions?.ignore_for_now),
    },

    who_it_applies_to: asStringArray(obj?.who_it_applies_to),

    impacts: {
      upfront_costs: asStringArray(obj?.impacts?.upfront_costs),
      monthly_bills: asStringArray(obj?.impacts?.monthly_bills),
      rebates_tax_credits: asStringArray(obj?.impacts?.rebates_tax_credits),
      home_upgrades: asStringArray(obj?.impacts?.home_upgrades),
      transportation: asStringArray(obj?.impacts?.transportation),
      jobs_local_economy: asStringArray(obj?.impacts?.jobs_local_economy),
      job_impacts: asStringArray(obj?.impacts?.job_impacts),
    },

    what_to_check_locally: asStringArray(obj?.what_to_check_locally),
    uncertainties: asStringArray(obj?.uncertainties),
    questions_to_ask: asStringArray(obj?.questions_to_ask),
  };
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in your environment (.env.local)." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const input = normalizeInput(body);

    if (!input.policy_text) {
      return NextResponse.json(
        { error: "Missing policy text. Paste 1–3 paragraphs into the policy box." },
        { status: 400 }
      );
    }
    if (!input.zip || !input.state) {
      return NextResponse.json({ error: "Missing ZIP or state." }, { status: 400 });
    }

    // (3) Deterministic relevance score (non-AI)
    const relevance = computeRelevance(input);

    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const prompt = `
You are a practical climate policy translator for ordinary people.

You will be given:
- user context
- a policy excerpt
- a deterministic relevance score + reasons (computed outside the model)

Your job:
1) Provide a plain-English summary (short, concrete).
2) Provide prioritized actions in EXACTLY these buckets:
   - do_now (max 3 bullets)
   - do_later (max 3 bullets)
   - ignore_for_now (max 3 bullets)
   These should reflect the user's situation. If relevance is LOW, "ignore_for_now" should be populated.
3) Keep it professional and understandable.
4) Do NOT invent dollar amounts, deadlines, eligibility thresholds, or program names not in the excerpt.

User context:
- ZIP: ${input.zip}
- State: ${input.state}
- Housing: ${input.housing_status}
- Home type: ${input.property_type}
- Can make upgrades: ${input.can_make_upgrades}
- Has a car: ${input.has_car}
- Vehicle preference: ${input.utility_fuels}
- Decision timeline: ${input.next_vehicle_timeline}
- Job/role: ${input.job_sector}
- Work setting: ${input.work_location}

Deterministic relevance score (ground truth):
- Score (0–10): ${relevance.score_0_to_10.toFixed(1)}
- Tier: ${relevance.tier}
- Reasons:
${relevance.reasons.map((r) => `- ${r}`).join("\n")}

Policy excerpt:
"""${input.policy_text}"""

Return ONLY valid JSON with this exact shape (no markdown, no extra keys):

{
  "plain_english_summary": string,
  "actions": {
    "do_now": string[],
    "do_later": string[],
    "ignore_for_now": string[]
  },
  "who_it_applies_to": string[],
  "impacts": {
    "upfront_costs": string[],
    "monthly_bills": string[],
    "rebates_tax_credits": string[],
    "home_upgrades": string[],
    "transportation": string[],
    "jobs_local_economy": string[],
    "job_impacts": string[]
  },
  "what_to_check_locally": string[],
  "uncertainties": string[],
  "questions_to_ask": string[]
}

Bullet rules:
- One idea per bullet. No fluff.
- If something depends on eligibility, dates, product standards, landlord approval, utility territory, permitting, or installer availability: say so.
- Keep "do_now" genuinely immediate and low-friction when possible.
`.trim();

    let response;
    try {
      response = await client.chat.completions.create({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" } as any,
        messages: [
          {
            role: "system",
            content:
              "Follow the schema exactly. Output must be valid JSON only. Do not invent specifics not in the excerpt.",
          },
          { role: "user", content: prompt },
        ],
      });
    } catch (err: any) {
      return NextResponse.json(
        {
          error: "OpenAI request failed",
          details: err?.message ?? String(err),
          status: err?.status,
          code: err?.code,
          type: err?.type,
        },
        { status: 502 }
      );
    }

    const raw = response.choices?.[0]?.message?.content ?? "";

    let parsed: any | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = extractFirstJsonObject(raw);
    }

    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "Model did not return valid JSON. Try shortening the excerpt or removing formatting.",
          raw,
        },
        { status: 502 }
      );
    }

    const output = normalizeResult(parsed, relevance);

    return NextResponse.json({ output }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
