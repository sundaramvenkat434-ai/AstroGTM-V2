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
  tools: [Tool, Tool];
  category: string;
  mode: "slug" | "content";
}

const DEFAULT_SLUG_SYSTEM = `You generate SEO-friendly metadata for tool comparison pages. Output ONLY valid JSON, no markdown.`;

const DEFAULT_CONTENT_SYSTEM = `You are a senior technical writer creating authoritative, balanced, head-to-head tool comparison pages for a developer tools directory. Write in a clear, objective, helpful style. Be specific with data and evidence. Output ONLY valid JSON, no markdown fences.`;

const CATEGORY_LABELS: Record<string, string> = {
  seo: "SEO & Content",
  analytics: "Analytics",
  developer: "Developer Tools",
  marketing: "Marketing",
  security: "Security",
  design: "Design",
  infrastructure: "Infrastructure",
};

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

    if (!tools || tools.length !== 2) {
      return new Response(JSON.stringify({ error: "Must provide exactly 2 tools" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [toolA, toolB] = tools;

    // Load prompts from admin_settings
    const { data: settingsRows } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["comparison_slug_system_prompt", "comparison_content_system_prompt"]);

    const settings: Record<string, string> = {};
    for (const row of (settingsRows || []) as { key: string; value: string }[]) {
      settings[row.key] = row.value;
    }

    const categoryLabel = CATEGORY_LABELS[category] || category;

    function summarizeTool(t: Tool) {
      const topFeatures = (t.features || []).slice(0, 4).map(f => f.title).join(", ");
      const hasFree = (t.pricing || []).some(p => p.price.toLowerCase().includes("free"));
      const lowestPaid = (t.pricing || []).find(p => !p.price.toLowerCase().includes("free"))?.price || "";
      const pricing = hasFree ? `Free plan available${lowestPaid ? ` · Paid from ${lowestPaid}` : ""}` : lowestPaid || "Paid";
      return `${t.name} (rating: ${t.rating}, users: ${t.users})
  Tagline: ${t.tagline}
  Description: ${t.description?.slice(0, 200) || ""}
  Top features: ${topFeatures || t.tags?.slice(0, 4).join(", ")}
  Use cases: ${(t.use_cases || []).slice(0, 4).join(", ")}
  Pricing: ${pricing}`;
    }

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === "slug") {
      systemPrompt = settings["comparison_slug_system_prompt"] || DEFAULT_SLUG_SYSTEM;
      userPrompt = `Generate SEO metadata for a head-to-head comparison page between these two ${categoryLabel} tools:

Tool A: ${summarizeTool(toolA)}

Tool B: ${summarizeTool(toolB)}

Return JSON:
{
  "slug": "${toolA.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-vs-${toolB.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}",
  "name": "${toolA.name} vs ${toolB.name}: Which Is Better in 2026?",
  "tagline": "One sentence describing who this comparison helps and what it answers",
  "focus_keyword": "${toolA.name.toLowerCase()} vs ${toolB.name.toLowerCase()}"
}

Slug rules: lowercase, hyphens only, must follow pattern "tool-a-vs-tool-b", e.g. "semrush-vs-ahrefs"`;
    } else {
      systemPrompt = settings["comparison_content_system_prompt"] || DEFAULT_CONTENT_SYSTEM;
      userPrompt = `Create a complete, balanced head-to-head comparison page for these two ${categoryLabel} tools:

Tool A (ID: ${toolA.id}):
${summarizeTool(toolA)}

Tool B (ID: ${toolB.id}):
${summarizeTool(toolB)}

Return JSON with EXACTLY this structure:

{
  "slug": "${toolA.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-vs-${toolB.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}",
  "name": "${toolA.name} vs ${toolB.name}: Which Is Better in 2026?",
  "tagline": "One sentence describing who this helps",
  "focus_keyword": "${toolA.name.toLowerCase()} vs ${toolB.name.toLowerCase()}",

  "intro": "3-4 sentences. Open with the specific decision users are trying to make. Briefly describe both tools. Do NOT declare a winner yet. Be SEO-rich.",

  "verdict": "2-3 sentences. Give a clear, evidence-based verdict. Recommend the best for most users and when to choose the other. Be direct.",

  "outro": "2-3 sentences. Summarize the key differentiator. Include a call to action to try both free plans or check pricing.",

  "sections": [
    {
      "title": "Ease of Use",
      "dimension": "ease_of_use",
      "tool_a_value": "2-3 sentence assessment for ${toolA.name}",
      "tool_b_value": "2-3 sentence assessment for ${toolB.name}",
      "winner_id": "${toolA.id}",
      "notes": "One sentence explaining why this tool wins this dimension"
    }
  ],

  "feature_matrix": [
    {
      "feature": "Feature name, e.g. 'Keyword Research'",
      "tool_a": "How ${toolA.name} handles this (1 sentence)",
      "tool_b": "How ${toolB.name} handles this (1 sentence)",
      "winner_id": "${toolA.id} or ${toolB.id} or null if tie"
    }
  ],

  "tool_a_entry": {
    "tool_id": "${toolA.id}",
    "score": 88,
    "best_for": "Short phrase, e.g. 'Enterprise SEO teams'",
    "pros": ["3-4 specific pros, each 5-10 words"],
    "cons": ["2-3 specific cons, each 5-10 words"],
    "pricing_summary": "e.g. 'Free trial · Paid from $119/mo'",
    "verdict": "1-2 sentences on when to choose ${toolA.name}"
  },

  "tool_b_entry": {
    "tool_id": "${toolB.id}",
    "score": 85,
    "best_for": "Short phrase",
    "pros": ["3-4 specific pros"],
    "cons": ["2-3 specific cons"],
    "pricing_summary": "Pricing summary for ${toolB.name}",
    "verdict": "1-2 sentences on when to choose ${toolB.name}"
  },

  "use_case_winners": [
    { "use_case": "Best for beginners", "winner_id": "${toolA.id} or ${toolB.id}", "reason": "1 sentence why" },
    { "use_case": "Best value for money", "winner_id": "...", "reason": "..." },
    { "use_case": "Best for enterprises", "winner_id": "...", "reason": "..." },
    { "use_case": "Best free option", "winner_id": "...", "reason": "..." }
  ],

  "faqs": [
    { "q": "Is ${toolA.name} better than ${toolB.name}?", "a": "2-3 sentence answer with nuance." },
    { "q": "Which is cheaper, ${toolA.name} or ${toolB.name}?", "a": "2-3 sentence pricing comparison." },
    { "q": "Can I use both ${toolA.name} and ${toolB.name} together?", "a": "2-3 sentence answer." },
    { "q": "Which ${categoryLabel} tool is better for small businesses?", "a": "2-3 sentence answer." }
  ],

  "meta_title": "${toolA.name} vs ${toolB.name} (2026): Full Comparison",
  "meta_description": "Exactly 150-160 characters. Include focus keyword '${toolA.name.toLowerCase()} vs ${toolB.name.toLowerCase()}'."
}

IMPORTANT:
- sections: cover 5-7 key dimensions (e.g. Ease of Use, Features, Pricing, Integrations, Support, Performance, Reporting)
- feature_matrix: 8-12 specific features relevant to ${categoryLabel}
- Be balanced and objective. Acknowledge each tool's strengths.
- winner_id must be exactly one of: "${toolA.id}", "${toolB.id}", or null for a tie
- scores: integer 0-100
- All content must be publication-ready and factual`;
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
        max_tokens: mode === "slug" ? 300 : 4000,
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
