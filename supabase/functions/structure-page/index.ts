import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StructureRequest {
  raw_text: string;
  prompt_variant?: 'v1' | 'v2';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterKey) {
      return new Response(
        JSON.stringify({ error: "OpenRouter API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: StructureRequest = await req.json();
    const { raw_text, prompt_variant } = body;

    const promptKey = prompt_variant === 'v2' ? 'ai_content_cleanup_prompt_v2' : 'ai_content_cleanup_prompt';

    const { data: settingRow } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", promptKey)
      .maybeSingle();

    const defaultPrompt = `You are an expert product content strategist and copywriter specializing in SaaS/tool review pages. Your task is to take raw, unstructured text — notes, bullet points, scraped content, rough ideas, or messy drafts — and transform it into a fully structured, rich tool listing that populates every field of a detailed tool page schema.

CRITICAL: You must generate a LARGE amount of high-quality, detailed content for every single field. Do not leave any field sparse or empty. Each field must be thorough and production-ready.

Given the raw text, produce a JSON response with ALL of these exact fields:

1. "name" (string): The tool/product name. Clean and properly capitalized. (1-40 characters)
2. "tagline" (string): A punchy, memorable one-liner that captures the tool's core value proposition. Must be compelling and action-oriented. (40-80 characters)
3. "description" (string): A concise 1-2 sentence description of what the tool does and who it's for. Should be SEO-friendly and scannable. (80-160 characters)
4. "longDescription" (string): A detailed 3-5 sentence paragraph explaining the tool's full capabilities, target audience, competitive advantages, and key differentiators. Write this as if for the "About" section of a product page. Be specific about technical capabilities and real-world benefits. (200-500 characters)
5. "category" (string): Exactly ONE of these categories: "seo", "analytics", "developer", "marketing", "security", "design", "infrastructure". Pick the best fit.
6. "tags" (string[]): 3 short, lowercase keyword tags relevant to the tool (e.g., ["audit", "rankings", "keywords"])
7. "badge" (string | null): One of "new", "popular", "free", or null. Set "new" if the tool was recently launched, "popular" if it has wide adoption, "free" if the core product is free, or null if none apply.
8. "rating" (number): A realistic rating between 4.0 and 5.0 with one decimal place.
9. "ratingCount" (string): An estimated review count displayed as a compact string (e.g., "1.2k", "430", "2.5k")
10. "users" (string): An estimated active user count as a compact string (e.g., "24k", "11k", "41k")
11. "features" (array of objects): Generate EXACTLY 6 features. Each feature must have:
    - "title" (string): A short, descriptive feature name (2-4 words)
    - "description" (string): A detailed explanation of the feature — what it does, how it works, and why it matters. Be specific and technical. (60-150 characters per description)
12. "useCases" (string[]): Generate EXACTLY 4 practical use cases. Each should be a specific scenario where someone would use this tool (e.g., "Agency client reporting", "Pre-launch site audits"). Keep each to 3-6 words.
13. "pricing" (array of objects): Generate EXACTLY 3 pricing tiers. Each tier must have:
    - "plan" (string): The plan name (e.g., "Free", "Starter", "Pro", "Growth", "Agency", "Enterprise", "Scale", "Business", "Team")
    - "price" (string): The price as a display string (e.g., "$0", "$49/mo", "$149/mo", "Custom", "$19/mo per user")
    - "features" (string[]): 3-6 bullet-point features included in this plan. Be specific about limits and capabilities.
    - "highlighted" (boolean): Set to true for ONE plan only — typically the mid-tier "best value" plan.
    The first tier should usually be free or cheapest, the middle should be the highlighted best value, and the third should be the premium/enterprise option.
14. "faqs" (array of objects): Generate EXACTLY 3 frequently asked questions. Each FAQ must have:
    - "q" (string): A realistic question a potential user would ask. Make it specific to this tool.
    - "a" (string): A thorough, helpful answer. 1-3 sentences with concrete details.
15. "stats" (array of objects): Generate EXACTLY 3 impressive stats/metrics. Each stat must have:
    - "label" (string): What the metric measures (e.g., "Pages analyzed", "Uptime SLA", "Languages supported")
    - "value" (string): An impressive but realistic value (e.g., "140M+", "99.99%", "28")
16. "meta_title" (string): SEO-optimized page title (50-60 characters)
17. "meta_description" (string): SEO meta description that drives clicks (120-160 characters)
18. "slug" (string): URL-friendly slug derived from the tool name (lowercase, hyphens, no special chars, max 40 chars)
19. "focus_keyword" (string): The single most important SEO keyword phrase for this tool

QUALITY REQUIREMENTS:
- Every feature description should be detailed and specific — not generic filler
- Pricing should be realistic and competitive with real SaaS products
- FAQs should address genuine concerns users would have
- Stats should be impressive but believable
- The longDescription should sell the product effectively
- All content should be professional, polished, and ready to publish
- Use active voice and strong verbs throughout

Return ONLY valid JSON. No markdown code fences, no explanation, just the JSON object.`;

    const systemPrompt = settingRow?.value || defaultPrompt;

    if (!raw_text || raw_text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No text provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userMessage = `Here is the raw, unstructured text to transform into a fully structured tool page:

---
${raw_text.slice(0, 20000)}
---

Transform this into a complete, production-ready tool listing JSON with every field fully populated. Remember: generate 6 features, 4 use cases, 3 pricing tiers, 3 FAQs, and 3 stats. Every field must be thorough and detailed.`;

    const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": supabaseUrl,
        "X-Title": "AI Content Clean-Up",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 6000,
      }),
    });

    if (openrouterRes.status === 429) {
      const retryAfter = openrouterRes.headers.get("retry-after");
      return new Response(
        JSON.stringify({
          error: "rate_limit",
          message: `The AI model is currently rate-limited. Please wait${retryAfter ? ` ${retryAfter} seconds` : " a moment"} and try again.`,
          retry_after: retryAfter ? parseInt(retryAfter) : 60,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!openrouterRes.ok) {
      const errData = await openrouterRes.json().catch(() => ({}));
      const errMsg = (errData as { error?: { message?: string } })?.error?.message || `OpenRouter error ${openrouterRes.status}`;
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await openrouterRes.json();
    const rawResponseText: string = aiData?.choices?.[0]?.message?.content || "";

    const cleaned = rawResponseText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({
          error: "The AI returned an unexpected format. Please try again.",
          raw: rawResponseText.slice(0, 500),
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
