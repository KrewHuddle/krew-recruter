/**
 * Hospitality Job Filter
 *
 * Two-pass filtering:
 * 1. quickFilter() — keyword matching (free, instant)
 * 2. aiFilter() — Claude Haiku classification (cheap, batch)
 */

const HOSPITALITY_KEYWORDS = [
  // Roles
  "cook", "chef", "sous chef", "line cook", "prep cook",
  "executive chef", "pastry chef", "dishwasher", "busser",
  "server", "waiter", "waitress", "bartender", "barback",
  "host", "hostess", "food runner", "expo",
  "restaurant manager", "general manager",
  "catering", "banquet", "event staff",
  "hotel", "front desk", "concierge", "housekeeping",
  "room service", "valet", "bellhop",
  "barista", "cafe", "coffee",
  "fast food", "fast casual", "fine dining",
  // Industries
  "restaurant", "hospitality", "food service", "foodservice",
  "food and beverage", "f&b", "culinary", "kitchen",
  "dining", "tavern", "bar", "brewery", "winery",
  "resort", "spa", "cruise", "catering company",
];

export function quickFilter(job: {
  title: string;
  description?: string | null;
  company?: string | null;
  category?: string | null;
}): boolean {
  const searchText = [
    job.title,
    job.description?.substring(0, 500),
    job.company,
    job.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return HOSPITALITY_KEYWORDS.some((kw) => searchText.includes(kw));
}

export interface AiFilterResult {
  index: number;
  isHospitality: boolean;
  confidence: number;
  category: string;
}

export async function aiFilter(
  jobs: Array<{
    title: string;
    company: string;
    description?: string;
    location: string;
  }>
): Promise<AiFilterResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[job-filter] ANTHROPIC_API_KEY not set, skipping AI filter");
    return jobs.map((_, i) => ({
      index: i,
      isHospitality: true,
      confidence: 0.5,
      category: "Other Hospitality",
    }));
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are a hospitality industry job classifier.

For each job below, determine if it is a hospitality industry job.
Hospitality includes: restaurants, bars, hotels, resorts, catering,
food service, culinary, cafes/coffee shops, event venues, cruise ships.

EXCLUDE: healthcare food service, airline catering corporate,
military food service, prison food service, retail grocery.

Return ONLY a JSON array with no markdown:
[{"index":0,"isHospitality":true,"confidence":0.95,"category":"Restaurant - BOH"}]

Categories: "Restaurant - FOH", "Restaurant - BOH",
"Restaurant - Management", "Bar/Nightlife", "Hotel/Resort",
"Catering/Events", "Cafe/Coffee", "Fast Food", "Other Hospitality"

Jobs to classify:
${jobs
  .map(
    (j, i) =>
      `${i}. "${j.title}" at "${j.company}" in ${j.location}: ${j.description?.substring(0, 150) || "No description"}`
  )
  .join("\n")}`,
          },
        ],
      }),
    });

    const data = await response.json();
    const text = (data as any).content?.[0]?.text;
    if (!text) throw new Error("No response text");

    const jsonStr = text
      .replace(/```json?\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("[job-filter] AI filter error:", error);
    // Fallback: assume all are hospitality
    return jobs.map((_, i) => ({
      index: i,
      isHospitality: true,
      confidence: 0.5,
      category: "Other Hospitality",
    }));
  }
}
