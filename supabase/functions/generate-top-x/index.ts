import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Tool {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  tags: string[];
  rating: number;
  users: string;
  features: { title: string; description: string }[];
  use_cases: string[];
  pricing: { plan: string; price: string; features: string[] }[];
}

interface GenerateRequest {
  tools: Tool[];
  category: string;
  mode: "slug" | "content";
}

const DEFAULT_SLUG_SYSTEM = `You generate SEO-friendly metadata for "Top X" comparison pages. Output ONLY valid JSON, no markdown.`;

const DEFAULT_CONTENT_SYSTEM = `You are a senior technical writer creating high-quality "Top X" comparison pages for a developer tools directory. You write in a clear, authoritative, helpful style. Output ONLY valid JSON, no markdown fences.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: GenerateRequest = await req.json();
    const { tools, category, mode } = body;

    if (!tools || tools.length < 3 || tools.length > 10) {
      return new Response(JSON.stringify({ error: "Must provide 3–10 tools" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load prompts from admin_settings with fallback to defaults
    const { data: settingsRows } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["top_x_slug_system_prompt", "top_x_content_system_prompt"]);

    const settings: Record<string, string> = {};
    for (const row of (settingsRows || []) as { key: string; value: string }[]) {
      settings[row.key] = row.value;
    }

    const categoryLabels: Record<string, string> = {
      seo: "SEO & Content",
      analytics: "Analytics",
      developer: "Developer Tools",
      marketing: "Marketing",
      security: "Security",
      design: "Design",
      infrastructure: "Infrastructure",
    };
    const categoryLabel = categoryLabels[category] || category;
    const n = tools.length;

    // Build compact tool summaries for the prompt
    const toolSummaries = tools.map((t, i) => {
      const topFeatures = (t.features || []).slice(0, 3).map(f => f.title).join(", ");
      const lowestPrice = (t.pricing || []).find(p => p.price.toLowerCase().includes("free"))
        ? "Has free plan"
        : (t.pricing || [])[0]?.price || "Paid";
      return `${i + 1}. ${t.name} (rating: ${t.rating}, users: ${t.users})
   Tagline: ${t.tagline}
   Top features: ${topFeatures || t.tags?.slice(0, 3).join(", ")}
   Pricing: ${lowestPrice}`;
    }).join("\n\n");

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === "slug") {
      systemPrompt = settings["top_x_slug_system_prompt"] || DEFAULT_SLUG_SYSTEM;
      userPrompt = `Generate metadata for a Top X comparison page for these ${categoryLabel} tools:

${toolSummaries}

Return JSON:
{
  "slug": "best-${category}-tools",
  "name": "Best ${categoryLabel} Tools in 2026",
  "tagline": "One punchy sentence describing who this list helps and what problem it solves",
  "focus_keyword": "best ${category} tools"
}

Slug rules: lowercase, hyphens only, 3-6 words, SEO-optimized (e.g. "best-seo-tools-2026")`;
    } else {
      systemPrompt = settings["top_x_content_system_prompt"] || DEFAULT_CONTENT_SYSTEM;

      userPrompt = `Create a complete Top X comparison page for these ${n} ${categoryLabel} tools:

${toolSummaries}

Return JSON with EXACTLY this structure:

{
  "slug": "best-${category}-tools",
  "name": "Best ${categoryLabel} Tools in 2026",
  "tagline": "One sentence for who this list is for and what it solves",

  "intro": "3-4 sentences. Open with the problem these tools solve. Mention the selection criteria. Be SEO-rich and helpful. Do NOT list tool names here.",

  "outro": "3-4 sentences. Summarise what to look for when picking a tool from this list. Mention different needs (budget, scale, use case). End with a call to action.",

  "entries": [
    {
      "tool_id": "${tools[0]?.id || ""}",
      "score": 95,
      "best_for": "One short phrase, e.g. 'Enterprise teams'",
      "pros": ["3-4 specific pros, each 5-10 words"],
      "cons": ["2-3 specific cons, each 5-10 words"],
      "pricing_summary": "e.g. 'Free plan · Paid from $29/mo'",
      "verdict": "1-2 sentences summarising when to choose this tool"
    }
  ],

  "comparison_table": [
    {
      "tool_id": "${tools[0]?.id || ""}",
      "tool_name": "${tools[0]?.name || ""}",
      "starting_price": "Free / $X/mo",
      "free_plan": true,
      "rating": ${tools[0]?.rating || 4.5},
      "best_for": "Short phrase",
      "key_feature": "One standout feature"
    }
  ],

  "best_for_segments": [
    { "segment": "beginners", "label": "Best for Beginners", "tool_id": "...", "reason": "1 sentence why" },
    { "segment": "free", "label": "Best Free Option", "tool_id": "...", "reason": "1 sentence why" },
    { "segment": "advanced", "label": "Best for Power Users", "tool_id": "...", "reason": "1 sentence why" }
  ],

  "faqs": [
    { "q": "Which ${categoryLabel} tool is best overall?", "a": "2-3 sentence answer naming the top pick and why." },
    { "q": "Are there free ${categoryLabel} tools?", "a": "2-3 sentence answer about free options." },
    { "q": "How do I choose the right ${categoryLabel} tool?", "a": "2-3 sentence practical answer." },
    { "q": "What features should I look for in a ${categoryLabel} tool?", "a": "2-3 sentence answer listing key criteria." }
  ],

  "meta_title": "Best ${categoryLabel} Tools | Top ${n} Compared (2026)",
  "meta_description": "Exactly 150-160 characters. Include focus keyword.",
  "focus_keyword": "best ${category} tools"
}

IMPORTANT:
- entries array must have exactly ${n} objects, one per tool, in the same order as the input
- comparison_table must have exactly ${n} objects, one per tool
- best_for_segments: pick the BEST matching tool_id from the list for each segment
- pros: 3-4 items each, specific and factual
- cons: 2-3 items each, honest and specific
- score: integer 0-100 reflecting overall quality (use rating + features as signal)
- All content must be publication-ready`;
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://toolkit.app",
        "X-Title": "ToolKit Admin",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        max_tokens: mode === "slug" ? 200 : 3000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `AI API error: ${response.status}`, detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await response.json();
    let raw = json.choices?.[0]?.message?.content || "{}";
    raw = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    const result = JSON.parse(raw);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
