import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Find checkins older than 1 month with images
    const { data: oldCheckins, error: fetchErr } = await supabase
      .from("peak_checkins")
      .select("id, image_url")
      .not("image_url", "is", null)
      .lt("checked_in_at", oneMonthAgo.toISOString());

    if (fetchErr) throw fetchErr;
    if (!oldCheckins || oldCheckins.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Extract storage paths from URLs
    const filePaths = oldCheckins
      .map((c: any) => {
        if (!c.image_url) return null;
        const match = c.image_url.match(/\/peak-images\/(.+)$/);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];

    // Delete from storage
    if (filePaths.length > 0) {
      const { error: storageErr } = await supabase.storage.from("peak-images").remove(filePaths);
      if (storageErr) console.error("Storage delete error:", storageErr);
    }

    // Clear image_url on checkins
    const ids = oldCheckins.map((c: any) => c.id);
    const { error: updateErr } = await supabase
      .from("peak_checkins")
      .update({ image_url: null })
      .in("id", ids);

    if (updateErr) console.error("Update error:", updateErr);

    return new Response(
      JSON.stringify({ deleted: filePaths.length, updated: ids.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
