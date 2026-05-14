import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EeatRequest {
  page_id?: string;
  title: string;
  content: string;
  meta_description?: string;
  focus_keyword?: string;
}

interface EeatResult {
  overall_score: number;
  experience_score: number;
  expertise_score: number;
  authoritativeness_score: number;
  trustworthiness_score: number;
  strengths: string[];
  weaknesses: string[];
  missing_signals: string[];
  improvements: string[];
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

    const body: EeatRequest = await req.json();
    const { page_id, title, content, meta_description, focus_keyword } = body;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert SEO analyst specializing in Google's E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) framework. Analyze the provided page content and return a strict JSON object with no markdown, no code fences.

Return ONLY valid JSON with this exact structure:
{
  "overall_score": <integer 0-100>,
  "experience_score": <integer 0-25>,
  "expertise_score": <integer 0-25>,
  "authoritativeness_score": <integer 0-25>,
  "trustworthiness_score": <integer 0-25>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "missing_signals": ["<missing signal 1>", "<missing signal 2>", "<missing signal 3>"],
  "improvements": ["<exact improvement 1>", "<exact improvement 2>", "<exact improvement 3>"]
}

Scoring criteria:
- Experience (0-25): First-hand experience signals, case studies, personal examples, real use cases
- Expertise (0-25): Subject matter depth, accurate terminology, comprehensive coverage, author credentials
- Authoritativeness (0-25): External citations, statistics with sources, expert quotes, industry references
- Trustworthiness (0-25): Accurate facts, balanced perspective, clear sourcing, transparency, no misleading claims
- Overall = sum of the four sub-scores

Strengths: 3 specific content elements that demonstrate E-E-A-T well
Weaknesses: 3 specific gaps or issues hurting E-E-A-T
Missing signals: 3 trust/credibility elements absent from the content
Improvements: 3 exact, actionable changes with specific text to add or modify`;

    const userMessage = `Analyze this page for E-E-A-T:

TITLE: ${title || "N/A"}
META DESCRIPTION: ${meta_description || "N/A"}
FOCUS KEYWORD: ${focus_keyword || "N/A"}

CONTENT (HTML):
${content.slice(0, 12000)}`;

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": supabaseUrl,
        "X-Title": "E-E-A-T Analyzer",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 1200,
      }),
    });

    if (aiRes.status === 429) {
      const retryAfter = aiRes.headers.get("retry-after");
      return new Response(
        JSON.stringify({
          error: "rate_limit",
          message: `AI model rate-limited. Please wait${retryAfter ? ` ${retryAfter} seconds` : " a moment"} and try again.`,
          retry_after: retryAfter ? parseInt(retryAfter) : 60,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!aiRes.ok) {
      const errData = await aiRes.json().catch(() => ({}));
      const errMsg = (errData as { error?: { message?: string } })?.error?.message || `OpenRouter error ${aiRes.status}`;
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiRes.json();
    const rawText: string = aiData?.choices?.[0]?.message?.content || "";
    const cleaned = rawText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    let result: EeatResult;
    try {
      result = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI returned unexpected format. Please try again.", raw: rawText.slice(0, 300) }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clamp scores
    result.overall_score = Math.min(100, Math.max(0, result.overall_score));
    result.experience_score = Math.min(25, Math.max(0, result.experience_score));
    result.expertise_score = Math.min(25, Math.max(0, result.expertise_score));
    result.authoritativeness_score = Math.min(25, Math.max(0, result.authoritativeness_score));
    result.trustworthiness_score = Math.min(25, Math.max(0, result.trustworthiness_score));

    const analyzed_at = new Date().toISOString();

    if (page_id) {
      const { error: dbError } = await supabase
        .from("eeat_scores")
        .upsert(
          {
            page_id,
            ...result,
            analyzed_at,
          },
          { onConflict: "page_id" }
        );

      if (dbError) {
        return new Response(
          JSON.stringify({ error: "Failed to save results: " + dbError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ ...(page_id ? { page_id } : {}), ...result, analyzed_at }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
