import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Existing sitemap locs
    const { data: existingEntries } = await supabase
      .from("sitemap_entries")
      .select("loc");
    const existingLocs = new Set((existingEntries || []).map((e: { loc: string }) => e.loc));

    const suggestions: {
      loc: string;
      title: string;
      lastmod: string;
      changefreq: string;
      priority: number;
      page_type: string;
      source: string;
      source_table: string | null;
      source_id: string | null;
    }[] = [];

    // Homepage
    if (!existingLocs.has("/")) {
      suggestions.push({
        loc: "/",
        title: "Homepage",
        lastmod: new Date().toISOString(),
        changefreq: "daily",
        priority: 1.0,
        page_type: "homepage",
        source: "ai_suggested",
        source_table: null,
        source_id: null,
      });
    }

    // Category pages — from DB
    const { data: categories } = await supabase
      .from("categories")
      .select("slug, name")
      .order("sort_order");

    for (const cat of categories || []) {
      const path = `/category/${cat.slug}`;
      if (!existingLocs.has(path)) {
        suggestions.push({
          loc: path,
          title: `${cat.name} Tools`,
          lastmod: new Date().toISOString(),
          changefreq: "weekly",
          priority: 0.8,
          page_type: "category",
          source: "auto_category",
          source_table: "categories",
          source_id: null,
        });
      }
    }

    // Published tool pages
    const { data: toolPages } = await supabase
      .from("tool_pages")
      .select("id, slug, category, name, updated_at, noindex")
      .eq("status", "published");

    for (const tp of toolPages || []) {
      const path = `/category/${tp.category}/${tp.slug}`;
      if (!existingLocs.has(path)) {
        suggestions.push({
          loc: path,
          title: tp.name,
          lastmod: tp.updated_at,
          changefreq: "weekly",
          priority: 0.7,
          page_type: "tool",
          source: "auto_tool_pages",
          source_table: "tool_pages",
          source_id: tp.id,
        });
      }
    }

    // Published top-x pages
    const { data: topXPages } = await supabase
      .from("top_x_pages")
      .select("id, slug, category, title, updated_at, noindex")
      .eq("status", "published");

    for (const tp of topXPages || []) {
      const path = `/category/${tp.category}/${tp.slug}`;
      if (!existingLocs.has(path)) {
        suggestions.push({
          loc: path,
          title: tp.title,
          lastmod: tp.updated_at,
          changefreq: "weekly",
          priority: 0.75,
          page_type: "top-x",
          source: "auto_tool_pages",
          source_table: "top_x_pages",
          source_id: tp.id,
        });
      }
    }

    // Published content pages
    const { data: contentPages } = await supabase
      .from("pages")
      .select("id, slug, title, updated_at")
      .eq("status", "published");

    for (const p of contentPages || []) {
      const path = `/${p.slug}`;
      if (!existingLocs.has(path)) {
        suggestions.push({
          loc: path,
          title: p.title,
          lastmod: p.updated_at,
          changefreq: "monthly",
          priority: 0.6,
          page_type: "content",
          source: "auto_pages",
          source_table: "pages",
          source_id: p.id,
        });
      }
    }

    return new Response(
      JSON.stringify({
        suggestions,
        existing_count: existingEntries?.length || 0,
        new_count: suggestions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
