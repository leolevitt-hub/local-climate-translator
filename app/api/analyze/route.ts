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

/**
 * Accept both legacy keys and future keys.
 */
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

  // NEW (optional)
  const local_notes = asString(body.local_notes ?? body.localNotes ?? "");

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
    local_notes,
  };
}

type LocalProfile = {
  place_name: string;
  state: string;
  latitude: string;
  longitude: string;
  source: string;
};

async function fetchWithTimeout(url: string, ms: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

// ZIP lookup (no API keys). If it fails, return empty profile.
async function lookupZip(zip: string): Promise<LocalProfile> {
  if (!zip) {
    return { place_name: "", state: "", latitude: "", longitude: "", source: "" };
  }

  try {
    const res = await fetchWithTimeout(
      `https://api.zippopotam.us/us/${encodeURIComponent(zip)}`,
      2500
    );
    if (!res.ok) {
      return { place_name: "", state: "", latitude: "", longitude: "", source: "" };
    }

    const data: any = await res.json();
    const place = Array.isArray(data?.places) ? data.places[0] : null;

    return {
      place_name: asString(place?.["place name"] ?? ""),
      state: asString(place?.["state abbreviation"] ?? data?.state ?? ""),
      latitude: asString(place?.latitude ?? ""),
      longitude: asString(place?.longitude ?? ""),
      source: "zippopotam.us",
    };
  } catch {
    return { place_name: "", state: "", latitude: "", longitude: "", source: "" };
  }
}

function normalizeResult(obj: any) {
  const safe = {
    plain_english_summary: asString(obj?.plain_english_summary ?? ""),
    economic_summary: asString(obj?.economic_summary ?? ""),
    local_context_summary: asString(obj?.local_context_summary ?? ""),

    local_profile: {
      place_name: asString(obj?.local_profile?.place_name ?? ""),
      state: asString(obj?.local_profile?.state ?? ""),
      latitude: asString(obj?.local_profile?.latitude ?? ""),
      longitude: asString(obj?.local_profile?.longitude ?? ""),
      source: asString(obj?.local_profile?.source ?? ""),
    },

    who_it_applies_to: asStringArray(obj?.who_it_applies_to),
    actions_user_can_take: asStringArray(obj?.actions_user_can_take),

    impacts: {
      upfront_costs: asStringArray(obj?.impacts?.upfront_costs),
      monthly_bills: asStringArray(obj?.impacts?.monthly_bills),
      rebates_tax_credits: asStringArray(obj?.impacts?.rebates_tax_credits),
      home_upgrades: asStringArray(obj?.impacts?.home_upgrades),
      transportation: asStringArray(obj?.impacts?.transportation),
      jobs_local_economy: asStringArray(obj?.impacts?.jobs_local_economy),
      job_impacts: asStringArray(obj?.impacts?.job_impacts),
    },

    economics_lens: {
      who_pays_who_benefits: asStringArray(obj?.economics_lens?.who_pays_who_benefits),
      timeline_and_payback_logic: asStringArray(obj?.economics_lens?.timeline_and_payback_logic),
      market_and_supply_chain_effects: asStringArray(
        obj?.economics_lens?.market_and_supply_chain_effects
      ),
      equity_distributional_notes: asStringArray(obj?.economics_lens?.equity_distributional_notes),
    },

    what_to_check_locally: asStringArray(obj?.what_to_check_locally),
    uncertainties: asStringArray(obj?.uncertainties),
    questions_to_ask: asStringArray(obj?.questions_to_ask),
  };

  return safe;
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
      return NextResponse.json({ error: "Missing ZIP or state." }, { status: 400 });
    }

    // Optional enrichment
    const zipProfile = await lookupZip(input.zip);

    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const prompt = `
You are a cautious, professional climate policy + economics translator.

Goal:
Turn the policy excerpt into:
(1) a plain-English explanation,
(2) an economics lens (who pays/who benefits, timing/payback logic without numbers, supply constraints, equity),
(3) locally-relevant guidance.

CRITICAL ACCURACY RULES:
- Do NOT invent: dollar amounts, deadlines, eligibility thresholds, program names, utility names, or local facts.
- You MAY use the ZIP lookup fields (city/state/lat/lon) provided below.
- If you need local specifics (utility territory, program availability, permitting rules, building code, local rebates), phrase as "check X" unless the user provided it in Local Notes.
- If the excerpt does not specify a detail, explain what would determine it.

User context:
- ZIP: ${input.zip}
- State (user-entered): ${input.state}
- Housing status: ${input.housing_status}
- Property type: ${input.property_type}
- Can make upgrades: ${input.can_make_upgrades}
- Vehicle preference / fuels: ${input.utility_fuels}
- Has a car: ${input.has_car}
- Next decision timeline: ${input.next_vehicle_timeline}
- Job / role: ${input.job_sector}
- Work setting: ${input.work_location}

Local profile (ZIP lookup; safe fields only):
- Place name: ${zipProfile.place_name}
- State: ${zipProfile.state}
- Latitude: ${zipProfile.latitude}
- Longitude: ${zipProfile.longitude}
- Source: ${zipProfile.source}

Local notes (user-provided; treat as ground truth if specific):
"""${input.local_notes}"""

Policy excerpt:
"""${input.policy_text}"""

Return ONLY valid JSON (no markdown, no extra text) with this exact shape:

{
  "plain_english_summary": string,
  "economic_summary": string,
  "local_context_summary": string,
  "local_profile": {
    "place_name": string,
    "state": string,
    "latitude": string,
    "longitude": string,
    "source": string
  },
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
  "economics_lens": {
    "who_pays_who_benefits": string[],
    "timeline_and_payback_logic": string[],
    "market_and_supply_chain_effects": string[],
    "equity_distributional_notes": string[]
  },
  "what_to_check_locally": string[],
  "uncertainties": string[],
  "questions_to_ask": string[]
}

STYLE REQUIREMENTS:
- Professional but understandable for an average person.
- Bullets: short, scannable, one idea per bullet.
- "economic_summary": 3–6 sentences; define jargon briefly if used.
- "local_context_summary": explicitly distinguish what is inferred from ZIP lookup vs what needs verification.
`.trim();

    let response;
    try {
      response = await client.chat.completions.create({
        model,
        temperature: 0.2,
        // Some models support this; if yours doesn't, OpenAI will throw and you'll see details.
        response_format: { type: "json_object" } as any,
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

    // Ensure parsed.local_profile is an object (model could return null/string if it goes off-rails)
    if (!parsed.local_profile || typeof parsed.local_profile !== "object") {
      parsed.local_profile = {};
    }

    // Safely inject ZIP lookup fields (do not override model values if present)
    parsed.local_profile.place_name = asString(
      parsed.local_profile.place_name ?? zipProfile.place_name
    );

    // FIX: parenthesize mixing ?? with ||
    parsed.local_profile.state = asString(
      parsed.local_profile.state ?? (zipProfile.state || input.state)
    );

    parsed.local_profile.latitude = asString(
      parsed.local_profile.latitude ?? zipProfile.latitude
    );
    parsed.local_profile.longitude = asString(
      parsed.local_profile.longitude ?? zipProfile.longitude
    );
    parsed.local_profile.source = asString(
      parsed.local_profile.source ?? zipProfile.source
    );

    const output = normalizeResult(parsed);

    return NextResponse.json({ output }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
