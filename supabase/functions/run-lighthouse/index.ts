import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LighthouseRequest {
  page_id: string;
  slug: string;
  strategy: "mobile" | "desktop";
  base_url: string;
}

interface CategoryScore {
  score: number | null;
  title: string;
}

interface AuditResult {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
  numericValue?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read API key from admin_settings, fall back to env var
    let pagespeedApiKey = "";
    const { data: keyRow } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "pagespeed_api_key")
      .maybeSingle();
    if (keyRow?.value) {
      pagespeedApiKey = keyRow.value;
    } else {
      pagespeedApiKey = Deno.env.get("PAGESPEED_API_KEY") || "";
    }

    const body: LighthouseRequest = await req.json();
    const { page_id, slug, strategy, base_url } = body;

    if (!page_id || !slug || !base_url) {
      return new Response(
        JSON.stringify({ error: "page_id, slug, and base_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUrl = `${base_url.replace(/\/$/, "")}/${slug.replace(/^\//, "")}`;

    const psiParams = new URLSearchParams({
      url: targetUrl,
      strategy: strategy.toUpperCase(),
      category: "PERFORMANCE",
    });
    ["ACCESSIBILITY", "BEST_PRACTICES", "SEO"].forEach((cat) =>
      psiParams.append("category", cat)
    );
    if (pagespeedApiKey) psiParams.set("key", pagespeedApiKey);

    const psiRes = await fetch(
      `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?${psiParams.toString()}`
    );

    if (!psiRes.ok) {
      const errBody = await psiRes.text();
      return new Response(
        JSON.stringify({ error: `PageSpeed Insights API error ${psiRes.status}`, detail: errBody.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const psiData = await psiRes.json();
    const lhr = psiData?.lighthouseResult;

    if (!lhr) {
      return new Response(
        JSON.stringify({ error: "No Lighthouse result returned. The page may not be publicly accessible." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categories = lhr.categories as Record<string, CategoryScore>;
    const audits = lhr.audits as Record<string, AuditResult>;

    const toScore = (raw: number | null | undefined) =>
      raw != null ? Math.round(raw * 100) : null;

    const performance = toScore(categories?.performance?.score);
    const accessibility = toScore(categories?.accessibility?.score);
    const bestPractices = toScore(categories?.["best-practices"]?.score);
    const seo = toScore(categories?.seo?.score);

    // Extract key audits for the report
    const keyAuditIds = [
      "first-contentful-paint",
      "largest-contentful-paint",
      "total-blocking-time",
      "cumulative-layout-shift",
      "speed-index",
      "interactive",
      "server-response-time",
      "render-blocking-resources",
      "uses-optimized-images",
      "uses-text-compression",
      "document-title",
      "meta-description",
      "link-text",
      "crawlable-anchors",
      "is-crawlable",
      "structured-data",
    ];

    const keyAudits: Record<string, { title: string; score: number | null; displayValue?: string; description: string }> = {};
    for (const auditId of keyAuditIds) {
      const audit = audits?.[auditId];
      if (audit) {
        keyAudits[auditId] = {
          title: audit.title,
          score: audit.score != null ? audit.score : null,
          displayValue: audit.displayValue,
          description: audit.description?.split(".")[0] || "",
        };
      }
    }

    const rawReport = {
      categories: Object.fromEntries(
        Object.entries(categories || {}).map(([k, v]) => [
          k,
          { title: v.title, score: toScore(v.score) },
        ])
      ),
      key_audits: keyAudits,
      fetch_time: lhr.fetchTime,
      requested_url: lhr.requestedUrl,
      final_url: lhr.finalUrl,
    };

    // Upsert into lighthouse_scores
    const { error: dbError } = await supabase
      .from("lighthouse_scores")
      .upsert(
        {
          page_id,
          strategy,
          performance,
          accessibility,
          best_practices: bestPractices,
          seo,
          raw_report: rawReport,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "page_id,strategy" }
      );

    if (dbError) {
      return new Response(
        JSON.stringify({ error: "Failed to save results: " + dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        page_id,
        strategy,
        performance,
        accessibility,
        best_practices: bestPractices,
        seo,
        raw_report: rawReport,
        fetched_at: new Date().toISOString(),
      }),
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
