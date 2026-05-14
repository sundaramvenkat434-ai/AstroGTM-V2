import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FormatRequest {
  title: string;
  description: string;
  keywords: string;
  content: string;
}

interface SEOResult {
  title: string;
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  excerpt: string;
  content: string;
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

    const { data: settingRow } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "seo_format_prompt")
      .maybeSingle();

    const systemPrompt = settingRow?.value || "You are an SEO content expert. Transform the extracted content into an optimized SEO page. Return JSON with fields: title, meta_title, meta_description, focus_keyword, excerpt, content (HTML).";

    const body: FormatRequest = await req.json();
    const { title, description, keywords, content } = body;

    const userMessage = `Here is the extracted page content to transform:

TITLE: ${title || "N/A"}
DESCRIPTION: ${description || "N/A"}
KEYWORDS: ${keywords || "N/A"}

PAGE CONTENT (HTML):
${content ? content.slice(0, 15000) : "N/A"}

Please produce the SEO-optimized JSON response as instructed.`;

    const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": supabaseUrl,
        "X-Title": "SEO Page Formatter",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 3000,
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
    const rawText: string = aiData?.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    const cleaned = rawText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    let result: SEOResult;
    try {
      result = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({
          error: "The AI returned an unexpected format. Please try again.",
          raw: rawText.slice(0, 500),
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
