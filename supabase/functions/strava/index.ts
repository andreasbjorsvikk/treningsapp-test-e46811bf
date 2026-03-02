import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Map Strava sport_type to our SessionType
function mapStravaType(sportType: string): string {
  const map: Record<string, string> = {
    Run: "løping",
    TrailRun: "løping",
    VirtualRun: "løping",
    Ride: "sykling",
    VirtualRide: "sykling",
    MountainBikeRide: "sykling",
    GravelRide: "sykling",
    EBikeRide: "sykling",
    Swim: "svømming",
    Walk: "gå",
    Hike: "fjelltur",
    WeightTraining: "styrke",
    Yoga: "yoga",
    Tennis: "tennis",
    Workout: "annet",
  };
  return map[sportType] || "annet";
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return data.claims.sub as string;
}

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Refresh Strava token if expired
async function ensureFreshToken(connection: any) {
  const admin = adminClient();
  const expiresAt = new Date(connection.expires_at);
  if (expiresAt > new Date(Date.now() + 60_000)) {
    return connection.access_token;
  }

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const tokens = await res.json();

  await admin
    .from("strava_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    })
    .eq("id", connection.id);

  return tokens.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ===== AUTH URL: returns the Strava OAuth URL =====
    if (action === "auth-url") {
      const userId = await getAuthenticatedUser(req);
      if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

      const redirectUri = `${SUPABASE_URL}/functions/v1/strava?action=callback`;
      const stravaUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=read,activity:read_all&state=${userId}&approval_prompt=auto`;

      return new Response(JSON.stringify({ url: stravaUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== CALLBACK: Strava redirects here after user approves =====
    if (action === "callback") {
      const code = url.searchParams.get("code");
      const userId = url.searchParams.get("state");
      if (!code || !userId) {
        return new Response("Missing code or state", { status: 400 });
      }

      // Exchange code for tokens
      const tokenRes = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        return new Response(`Token exchange failed: ${err}`, { status: 500 });
      }

      const tokens = await tokenRes.json();
      const admin = adminClient();

      // Upsert connection
      await admin.from("strava_connections").upsert(
        {
          user_id: userId,
          strava_athlete_id: tokens.athlete.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(tokens.expires_at * 1000).toISOString(),
        },
        { onConflict: "user_id" }
      );

      // Redirect user back to app settings
      const appUrl = req.headers.get("referer")?.split("/").slice(0, 3).join("/") || "";
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/settings?strava=connected` },
      });
    }

    // ===== STATUS: check if user has Strava connected =====
    if (action === "status") {
      const userId = await getAuthenticatedUser(req);
      if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

      const admin = adminClient();
      const { data } = await admin
        .from("strava_connections")
        .select("strava_athlete_id, created_at")
        .eq("user_id", userId)
        .single();

      return new Response(JSON.stringify({ connected: !!data, athlete_id: data?.strava_athlete_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== DISCONNECT: remove Strava connection =====
    if (action === "disconnect") {
      const userId = await getAuthenticatedUser(req);
      if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

      const admin = adminClient();
      
      // Optionally revoke Strava token
      const { data: conn } = await admin
        .from("strava_connections")
        .select("access_token")
        .eq("user_id", userId)
        .single();

      if (conn?.access_token) {
        await fetch(`https://www.strava.com/oauth/deauthorize?access_token=${conn.access_token}`, {
          method: "POST",
        }).catch(() => {});
      }

      await admin.from("strava_connections").delete().eq("user_id", userId);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== SYNC: fetch recent activities from Strava =====
    if (action === "sync") {
      const userId = await getAuthenticatedUser(req);
      if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

      const admin = adminClient();
      const { data: conn } = await admin
        .from("strava_connections")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!conn) {
        return new Response(JSON.stringify({ error: "Not connected to Strava" }), { status: 400, headers: corsHeaders });
      }

      const accessToken = await ensureFreshToken(conn);

      // Fetch last 90 days of activities
      const after = Math.floor(Date.now() / 1000) - 90 * 86400;
      const activities: any[] = [];
      let page = 1;

      while (page <= 5) {
        const res = await fetch(
          `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) break;
        const batch = await res.json();
        if (!batch.length) break;
        activities.push(...batch);
        page++;
      }

      // Get existing strava IDs
      const { data: existing } = await admin
        .from("workout_sessions")
        .select("strava_activity_id")
        .eq("user_id", userId)
        .not("strava_activity_id", "is", null);

      const existingIds = new Set((existing || []).map((r: any) => r.strava_activity_id));
      const newActivities = activities.filter((a) => !existingIds.has(a.id));

      if (newActivities.length > 0) {
        const rows = newActivities.map((a) => ({
          user_id: userId,
          strava_activity_id: a.id,
          type: mapStravaType(a.sport_type || a.type),
          title: a.name || null,
          date: a.start_date,
          duration_minutes: Math.round(a.moving_time / 60),
          distance: a.distance ? Math.round(a.distance / 10) / 100 : null, // meters to km
          elevation_gain: a.total_elevation_gain ? Math.round(a.total_elevation_gain) : null,
          notes: null,
        }));

        const { error } = await admin.from("workout_sessions").insert(rows);
        if (error) {
          console.error("Insert error:", error);
          return new Response(JSON.stringify({ error: "Failed to insert activities" }), {
            status: 500,
            headers: corsHeaders,
          });
        }
      }

      return new Response(
        JSON.stringify({ synced: newActivities.length, total: activities.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Strava function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
