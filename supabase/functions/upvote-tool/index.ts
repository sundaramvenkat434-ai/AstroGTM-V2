import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { tool_id, fingerprint } = await req.json();
    if (!tool_id || !fingerprint) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Insert vote (unique constraint prevents duplicates)
    const { error: voteErr } = await supabase.from("tool_upvotes").insert({ tool_id, fingerprint });

    if (voteErr) {
      // Already voted — return current count
      const { data } = await supabase.from("tool_pages").select("upvotes").eq("id", tool_id).single();
      return new Response(JSON.stringify({ upvotes: data?.upvotes ?? 0, already_voted: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Increment counter
    const { data } = await supabase.rpc("increment_upvotes", { p_tool_id: tool_id });
    return new Response(JSON.stringify({ upvotes: data ?? 0, already_voted: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
