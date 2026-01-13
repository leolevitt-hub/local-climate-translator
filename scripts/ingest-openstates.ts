/* scripts/ingest-openstates.ts
   OpenStates → Postgres ingestion (Prisma 7.2.x, adapter-based).
   Filters to only ingest bills from 2025.
*/

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";

// ---------- REQUIRED ENV ----------
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing at runtime (.env / .env.local not loaded)");
}
if (!process.env.OPENSTATES_API_KEY) {
  throw new Error("OPENSTATES_API_KEY is missing at runtime (.env / .env.local not loaded)");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// ---------- CONFIG ----------
const OPENSTATES_BASE = "https://v3.openstates.org";

const JURISDICTIONS: string[] = (process.env.INGEST_JURISDICTIONS ?? "CT")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const MAX_PAGES = Number(process.env.INGEST_PAGES ?? "2");
const DETAIL_DELAY_MS = Number(process.env.INGEST_DELAY_MS ?? "6500");
const INCLUDE_UNCLEAR = String(process.env.INGEST_INCLUDE_UNCLEAR ?? "false").toLowerCase() === "true";

// NEW: Use session string directly (e.g., "2025" for CT, "20252026" for CA)
const SESSION = process.env.INGEST_SESSION ?? "2025";

// ---------- HELPERS ----------
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function toDateOrNull(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeStatus(latestActionDesc?: string): string {
  const d = (latestActionDesc ?? "").toLowerCase();
  if (d.includes("veto")) return "vetoed";
  if (d.includes("signed") || d.includes("enacted") || d.includes("chapter")) return "enacted";
  if (d.includes("passed")) return "passed";
  return "proposed";
}

function normText(...parts: Array<string | null | undefined>): string {
  return parts
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .join(" ")
    .toLowerCase();
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function normalizeUrls(urls: Array<string | null | undefined>): string[] {
  return uniq(
    urls
      .map((u) => (typeof u === "string" ? u.trim() : ""))
      .filter((u): u is string => typeof u === "string" && u.length > 0)
  );
}

// ---------- RELEVANCE + TAGGING ----------
type Relevance = "direct" | "indirect" | "unclear" | "irrelevant";

function classifyRelevance(title?: string | null, abstract?: string | null): Relevance {
  const t = normText(title, abstract);

  const direct = [
    "climate",
    "greenhouse",
    "ghg",
    "emission",
    "emissions",
    "carbon",
    "renewable",
    "clean energy",
    "solar",
    "wind",
    "energy storage",
    "battery",
    "electric vehicle",
    "ev ",
    "charging",
    "heat pump",
    "weatherization",
    "energy efficiency",
    "efficiency",
    "building code",
    "energy code",
    "iecc",
    "decarbon",
    "cap and trade",
    "renewable portfolio",
    "rps",
    "net zero",
    "resilience",
    "flood",
    "wildfire",
    "sea level",
    "environmental justice",
    "air quality",
    "methane",
  ];

  const indirect = [
    "oil",
    "gas",
    "natural gas",
    "coal",
    "pipeline",
    "lng",
    "refinery",
    "drilling",
    "fracking",
    "subsidy",
    "tax credit",
    "abatement",
    "royalty",
    "severance tax",
    "fuel tax",
    "gas tax",
    "highway",
    "road expansion",
    "transportation funding",
    "transit",
    "rail",
    "zoning",
    "land use",
    "parking",
    "permitting",
    "siting",
    "interconnection",
    "transmission",
    "utility",
    "public utilities",
    "industrial",
    "cement",
    "steel",
    "fertilizer",
    "agriculture",
    "forestry",
    "logging",
    "conservation",
    "hazard mitigation",
    "stormwater",
  ];

  const weak = ["energy", "environment", "infrastructure", "sustainability"];

  if (direct.some((k) => t.includes(k))) return "direct";
  if (indirect.some((k) => t.includes(k))) return "indirect";
  if (weak.some((k) => t.includes(k))) return "unclear";
  return "irrelevant";
}

function autoTags(title?: string | null, abstract?: string | null): string[] {
  const t = normText(title, abstract);
  const tags: string[] = [];

  if (t.includes("climate") || t.includes("greenhouse") || t.includes("emission") || t.includes("carbon"))
    tags.push("emissions");
  if (t.includes("environmental justice")) tags.push("environmental_justice");
  if (t.includes("resilience") || t.includes("flood") || t.includes("wildfire") || t.includes("sea level"))
    tags.push("resilience");
  if (t.includes("methane")) tags.push("methane");

  if (t.includes("solar")) tags.push("solar");
  if (t.includes("wind")) tags.push("wind");
  if (t.includes("renewable") || t.includes("clean energy") || t.includes("rps")) tags.push("renewables");
  if (t.includes("storage") || t.includes("battery")) tags.push("storage");
  if (t.includes("grid") || t.includes("transmission") || t.includes("interconnection")) tags.push("grid");

  if (t.includes("heat pump")) tags.push("heat_pump");
  if (t.includes("weatherization") || t.includes("efficiency")) tags.push("efficiency");
  if (t.includes("building") || t.includes("energy code") || t.includes("building code") || t.includes("iecc"))
    tags.push("buildings");

  if (t.includes("electric vehicle") || t.includes("ev ") || t.includes("charging")) tags.push("ev");
  if (t.includes("transit") || t.includes("rail") || t.includes("bus")) tags.push("transit");
  if (t.includes("highway") || t.includes("road expansion")) tags.push("roads");

  if (t.includes("oil") || t.includes("gas") || t.includes("pipeline") || t.includes("lng") || t.includes("coal") || t.includes("refinery"))
    tags.push("fossil");
  if (t.includes("subsidy") || t.includes("tax credit") || t.includes("abatement") || t.includes("royalty") || t.includes("severance tax"))
    tags.push("subsidies_taxes");
  if (t.includes("permitting") || t.includes("siting")) tags.push("permitting");

  return uniq(tags);
}

// ---------- OPENSTATES API SCHEMAS ----------
const BillListItemSchema = z.object({
  id: z.string(),
  identifier: z.string().optional(),
  title: z.string().optional(),
  latest_action_description: z.string().optional(),
  jurisdiction: z.object({ name: z.string().optional() }).optional(),
});

const BillDetailSchema = z.object({
  id: z.string(),
  identifier: z.string().optional(),
  title: z.string().optional(),
  abstract: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  openstates_url: z.string().optional(),
  sources: z.array(z.object({ url: z.string().optional(), note: z.string().optional() })).optional(),
});

// ---------- OPENSTATES FETCH ----------
async function osFetch(path: string, params: Record<string, string | number | undefined> = {}, attempt = 0) {
  const url = new URL(OPENSTATES_BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      "X-API-KEY": process.env.OPENSTATES_API_KEY as string,
      Accept: "application/json",
    },
  });

  if (res.status === 429) {
    const body = await res.text().catch(() => "");
    if (attempt >= 3) {
      throw new Error(`OpenStates 429 ${url}\n${body}`);
    }
    const waitMs = 65_000;
    console.warn(`OpenStates 429 rate limit. Waiting ${waitMs}ms then retrying...`);
    await sleep(waitMs);
    return osFetch(path, params, attempt + 1);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenStates ${res.status} ${url}\n${body}`);
  }

  return res.json();
}

async function listBills(jurisdiction: string, page: number) {
  const data = await osFetch("/bills", {
    jurisdiction,
    page,
    per_page: 20,
    sort: "updated_desc",
    session: SESSION,
  });

  const results = Array.isArray((data as any)?.results) ? (data as any).results : [];
  const parsed = results.map((r: unknown) => BillListItemSchema.safeParse(r));

  const ok = parsed.filter(
    (p: unknown): p is z.ZodSafeParseSuccess<z.infer<typeof BillListItemSchema>> => (p as any).success
  );

  return ok.map((p: z.ZodSafeParseSuccess<z.infer<typeof BillListItemSchema>>) => p.data);
}

async function getBillDetail(id: string) {
  const data = await osFetch(`/bills/${id}`);
  return BillDetailSchema.parse(data);
}

// ---------- DB UPSERT ----------
async function upsertFromBill(
  jurisdictionCode: string,
  jurisdictionName: string,
  latestActionDescription: string | undefined,
  bill: z.infer<typeof BillDetailSchema>
) {
  const title = bill.title || bill.identifier || "Untitled bill";
  const summary: string | undefined = bill.abstract ?? undefined;

  const relevance = classifyRelevance(title, bill.abstract ?? null);
  const tags = autoTags(title, bill.abstract ?? null);

  const status = normalizeStatus(latestActionDescription);
  const dateIntroduced = toDateOrNull(bill.created_at);

  const sourceUrls = normalizeUrls([bill.openstates_url, ...(bill.sources ?? []).map((s) => s.url)]);

  const existing = await prisma.policySource.findFirst({
    where: { sourceType: "openstates", externalId: bill.id },
    select: { policyId: true },
  });

  const policyId = existing
    ? (
        await prisma.policy.update({
          where: { id: existing.policyId },
          data: {
            title,
            summary,
            jurisdictionCode,
            jurisdictionName,
            level: "state",
            status,
            dateIntroduced,
            policyType: relevance,
          },
          select: { id: true },
        })
      ).id
    : (
        await prisma.policy.create({
          data: {
            title,
            summary,
            jurisdictionCode,
            jurisdictionName,
            level: "state",
            status,
            dateIntroduced,
            policyType: relevance,
            sources: {
              create: [
                {
                  sourceType: "openstates",
                  name: "OpenStates",
                  externalId: bill.id,
                  url: bill.openstates_url || "",
                },
              ],
            },
          },
          select: { id: true },
        })
      ).id;

  for (const srcUrl of sourceUrls) {
    const existsUrl = await prisma.policySource.findFirst({
      where: { policyId, sourceType: "official", url: srcUrl },
      select: { id: true },
    });

    if (!existsUrl) {
      await prisma.policySource.create({
        data: {
          policyId,
          sourceType: "official",
          name: null,
          url: srcUrl,
          externalId: null,
        },
      });
    }
  }

  for (const tag of tags) {
    await prisma.policyTag.upsert({
      where: { policyId_tag: { policyId, tag } },
      update: {},
      create: { policyId, tag },
    });
  }

  return { policyId, relevance, tagsCount: tags.length, sourcesCount: sourceUrls.length };
}

// ---------- MAIN ----------
async function ingestJurisdiction(code: string) {
  console.log(`\n=== Ingesting ${code} session=${SESSION} pages=${MAX_PAGES} delayMs=${DETAIL_DELAY_MS} includeUnclear=${INCLUDE_UNCLEAR} ===`);

  let ingested = 0;
  let skipped = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const bills = await listBills(code, page);
    if (bills.length === 0) break;

    for (const b of bills) {
      await sleep(DETAIL_DELAY_MS);

      const d = await getBillDetail(b.id);

      const relevance = classifyRelevance(d.title ?? b.title ?? "", d.abstract ?? null);
      const shouldIngest =
        relevance === "direct" ||
        relevance === "indirect" ||
        (INCLUDE_UNCLEAR && relevance === "unclear");

      if (!shouldIngest) {
        skipped++;
        continue;
      }

      const out = await upsertFromBill(code, b.jurisdiction?.name ?? code, b.latest_action_description, d);

      ingested++;
      console.log(
        `+ ${d.identifier ?? d.id} (${out.relevance}) -> policy=${out.policyId} tags=${out.tagsCount} sources=${out.sourcesCount}`
      );
    }
  }

  console.log(`Done ${code}: ingested=${ingested} skipped=${skipped}`);
}

async function main() {
  console.log("INGEST START");
  console.log("DATABASE_URL set?", Boolean(process.env.DATABASE_URL));
  console.log("OPENSTATES_API_KEY set?", Boolean(process.env.OPENSTATES_API_KEY));
  console.log("SESSION:", SESSION);

  for (const code of JURISDICTIONS) {
    await ingestJurisdiction(code);
  }
}

main()
  .catch((e) => {
    console.error("\nINGEST FAILED:");
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });