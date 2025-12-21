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

function asBoolString(v: any): "Yes" | "No" | "Not sure" {
  const s = asString(v).toLowerCase();
  if (s === "yes" || s === "true") return "Yes";
  if (s === "no" || s === "false") return "No";
  return "Not sure";
}

function normalizeResult(obj: any) {
  // Ensure missing fields don't crash UI
  const safe = {
    plain_english_summary: String(obj?.plain_english_summary ?? ""),
    who_it_applies_to: Array.isArray(obj?.who_it_applies_to)
      ? obj.who_it_applies_to.map(String)
      : [],
    actions_user_can_take: Array.isArray(obj?.actions_user_can_take)
      ? obj.actions_user_can_take.map(String)
      : [],
    impacts: {
      upfront_costs: Array.isArray(obj?.impacts?.upfront_costs)
        ? obj.impacts.upfront_costs.map(String)
        : [],
      monthly_bills: Array.isArray(obj?.impacts?.monthly_bills)
        ? obj.impacts.monthly_bills.map(String)
        : [],
      rebates_tax_credits: Array.isArray(obj?.impacts?.rebates_tax_credits)
        ? obj.impacts.rebates_tax_credits.map(String)
        : [],
      home_upgrades: Array.isArray(obj?.impacts?.home_upgrades)
        ? obj.impacts.home_upgrades.map(String)
        : [],
      transportation: Array.isArray(obj?.impacts?.transportation)
        ? obj.impacts.transportation.map(String)
        : [],
      jobs_local_economy: Array.isArray(obj?.impacts?.jobs_local_economy)
        ? obj.impacts.jobs_local_economy.map(String)
        : [],
      job_impacts: Array.isArray(obj?.impacts?.job_impacts)
        ? obj.impacts.job_impacts.map(String)
        : [],
    },
    what_to_check_locally: Array.isArray(obj?.what_to_check_locally)
      ? obj.what_to_check_locally.map(String)
      : [],
    uncertainties: Array.isArray(obj?.uncertainties)
      ? obj.uncertainties.map(String)
      : [],
    questions_to_ask: Array.isArray(obj?.questions_to_ask)
      ? obj.questions_to_ask.map(String)
      : [],
  };

  return safe;
}

/**
 * Accept both:
 * - legacy keys (zip, housing_status, property_type, etc)
 * - new keys (zipcode, housingStatus, housingType, etc)
 */
function normalizeInput(body: any) {
  const zip = asString(body.zip ?? body.zipcode ?? body.postal_code ?? "");
  const state = asString(body.state ?? "");
  const housing_status = asString(body.housing_status ?? body.housingStatus ?? "");
  const property_type = asString(body.property_type ?? body.housingType ?? "");

  const can_make_upgrades = asString(
    body.can_make_upgrades ?? body.canMakeUpgrades ?? ""
  );

  // legacy had utility_fuels; new UI had vehiclePreference etc.
  const utility_fuels = asString(body.utility_fuels ?? body.utilityFuels ?? body.vehiclePreference ?? "");

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

    // Minimal validation
    if (!input.policy_text) {
      return NextResponse.json(
        { error: "Missing policy text. Paste 1–3 paragraphs into the policy box." },
        { status: 400 }
      );
    }
    if (!input.zip || !input.state) {
      return NextResponse.json(
        { error: "Missing ZIP or state." },
        { status: 400 }
      );
    }

    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const prompt = `
You are a cautious climate policy impact translator.
Your job: turn policy excerpts into practical, locally-relevant implications for the user's everyday life.
Be specific and structured. Do NOT invent dollar amounts, deadlines, eligibility thresholds, or program names that are not explicitly in the excerpt.

User context:
- ZIP: ${input.zip}
- State: ${input.state}
- Housing status: ${input.housing_status}
- Property type: ${input.property_type}
- Can make upgrades: ${input.can_make_upgrades}
- Utility fuels / vehicle preference: ${input.utility_fuels}
- Has a car: ${input.has_car}
- Next vehicle / decision timeline: ${input.next_vehicle_timeline}
- Job / role: ${input.job_sector}
- Work setting: ${input.work_location}

Policy excerpt:
"""${input.policy_text}"""

Return ONLY valid JSON (no markdown, no extra text) with this exact shape:

{
  "plain_english_summary": string,
  "who_it_applies_to": string[],
  "actions_user_can_take": string[],
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

Rules:
- Keep bullets short, scannable, concrete (one idea per bullet).
- If something depends on eligibility (income, program rules, dates, product standards, landlord approval, utility territory, installer certification), say so explicitly.
- Avoid generic filler. Focus on what changes for the user.
- If the excerpt doesn’t specify a detail, say what would determine it.
`.trim();

    let response;
    try {
      response = await client.chat.completions.create({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are careful, structured, and you follow the output schema exactly. Output must be valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
      });
    } catch (err: any) {
      // OpenAI SDK errors can include useful fields
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

    const output = normalizeResult(parsed);

    return NextResponse.json({ output }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Server error",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
