import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ORS_API_KEY = Deno.env.get("ORS_API_KEY");
    if (!ORS_API_KEY) {
      return new Response(JSON.stringify({ error: "ORS_API_KEY is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { coordinates } = await req.json();
    // coordinates: [[lng,lat], [lng,lat], ...]

    if (!coordinates || coordinates.length < 2) {
      return new Response(JSON.stringify({ error: "Need at least 2 coordinates" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.openrouteservice.org/v2/directions/foot-hiking/geojson", {
      method: "POST",
      headers: {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates,
        elevation: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("ORS API error:", response.status, text);
      return new Response(JSON.stringify({ error: `ORS error: ${response.status}`, detail: text }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ors-route error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
