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

function mapStravaType(sportType: string): string {
  const map: Record<string, string> = {
    Run: "løping", TrailRun: "løping", VirtualRun: "løping",
    Ride: "sykling", VirtualRide: "sykling", MountainBikeRide: "sykling",
    GravelRide: "sykling", EBikeRide: "sykling",
    Swim: "svømming", Walk: "gå", Hike: "fjelltur",
    WeightTraining: "styrke", Yoga: "yoga", Tennis: "tennis",
    Soccer: "fotball", Workout: "annet",
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
      client_id: STRAVA_CLIENT_ID, client_secret: STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token", refresh_token: connection.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const tokens = await res.json();
  await admin.from("strava_connections").update({
    access_token: tokens.access_token, refresh_token: tokens.refresh_token,
    expires_at: new Date(tokens.expires_at * 1000).toISOString(),
  }).eq("id", connection.id);
  return tokens.access_token as string;
}

async function getConnectionAndToken(userId: string) {
  const admin = adminClient();
  const { data: conn } = await admin.from("strava_connections").select("*").eq("user_id", userId).single();
  if (!conn) throw new Error("Not connected to Strava");
  const accessToken = await ensureFreshToken(conn);
  return { conn, accessToken, admin };
}

function buildActivityRow(a: any, userId: string) {
  return {
    user_id: userId,
    strava_activity_id: a.id,
    type: mapStravaType(a.sport_type || a.type),
    title: a.name || null,
    date: a.start_date,
    duration_minutes: Math.round(a.moving_time / 60),
    distance: a.distance ? Math.round(a.distance / 10) / 100 : null,
    elevation_gain: a.total_elevation_gain ? Math.round(a.total_elevation_gain) : null,
    average_heartrate: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    max_heartrate: a.max_heartrate ? Math.round(a.max_heartrate) : null,
    summary_polyline: a.map?.summary_polyline || null,
    notes: null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ===== AUTH URL =====
    if (action === "auth-url") {
      const userId = await getAuthenticatedUser(req);
      if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      const redirectUri = `${SUPABASE_URL}/functions/v1/strava?action=callback`;
      const stravaUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=read,activity:read_all&state=${userId}&approval_prompt=auto`;
      return new Response(JSON.stringify({ url: stravaUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== CALLBACK =====
    if (action === "callback") {
      const code = url.searchParams.get("code");
      const userId = url.searchParams.get("state");
      if (!code || !userId) return new Response("Missing code or state", { status: 400 });
      const tokenRes = await fetch("https://www.strava.com/oauth/token", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: STRAVA_CLIENT_ID, client_secret: STRAVA_CLIENT_SECRET, code, grant_type: "authorization_code" }),
      });
      if (!tokenRes.ok) return new Response(`Token exchange failed: ${await tokenRes.text()}`, { status: 500 });
      const tokens = await tokenRes.json();
      const admin = adminClient();
      await admin.from("strava_connections").upsert({
        user_id: userId, strava_athlete_id: tokens.athlete.id,
        access_token: tokens.access_token, refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expires_at * 1000).toISOString(),
      }, { onConflict: "user_id" });
      const appUrl = req.headers.get("referer")?.split("/").slice(0, 3).join("/") || "";
      return new Response(null, { status: 302, headers: { Location: `${appUrl}/settings?strava=connected` } });
    }

    // ===== STATUS =====
    if (action === "status") {
      const userId = await getAuthenticatedUser(req);
      if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      const admin = adminClient();
      const { data } = await admin.from("strava_connections").select("strava_athlete_id, created_at").eq("user_id", userId).single();
      return new Response(JSON.stringify({ connected: !!data, athlete_id: data?.strava_athlete_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== DISCONNECT =====
    if (action === "disconnect") {
      const userId = await getAuthenticatedUser(req);
      if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      const admin = adminClient();
      const { data: conn } = await admin.from("strava_connections").select("access_token").eq("user_id", userId).single();
      if (conn?.access_token) {
        await fetch(`https://www.strava.com/oauth/deauthorize?access_token=${conn.access_token}`, { method: "POST" }).catch(() => {});
      }
      await admin.from("strava_connections").delete().eq("user_id", userId);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== SYNC =====
    if (action === "sync") {
      const userId = await getAuthenticatedUser(req);
      if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      const { accessToken, admin } = await getConnectionAndToken(userId);
      const afterParam = url.searchParams.get("after");
      const after = afterParam ? parseInt(afterParam) : Math.floor(Date.now() / 1000) - 90 * 86400;
      const activities: any[] = [];
      let page = 1;
      while (page <= 5) {
        const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) break;
        const batch = await res.json();
        if (!batch.length) break;
        activities.push(...batch);
        page++;
      }
      const { data: existing } = await admin.from("workout_sessions").select("strava_activity_id").eq("user_id", userId).not("strava_activity_id", "is", null);
      const existingIds = new Set((existing || []).map((r: any) => r.strava_activity_id));
      const newActivities = activities.filter((a) => !existingIds.has(a.id));
      if (newActivities.length > 0) {
        const rows = newActivities.map((a) => buildActivityRow(a, userId));
        const { error } = await admin.from("workout_sessions").insert(rows);
        if (error) { console.error("Insert error:", error); return new Response(JSON.stringify({ error: "Failed to insert activities" }), { status: 500, headers: corsHeaders }); }
      }
      return new Response(JSON.stringify({ synced: newActivities.length, total: activities.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== SYNC-ALL =====
    if (action === "sync-all") {
      const userId = await getAuthenticatedUser(req);
      if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      const { accessToken, admin } = await getConnectionAndToken(userId);
      const after = Math.floor(Date.now() / 1000) - 20 * 365 * 86400;
      const activities: any[] = [];
      let page = 1;
      while (page <= 50) {
        const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200&page=${page}`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) break;
        const batch = await res.json();
        if (!batch.length) break;
        activities.push(...batch);
        page++;
      }
      const { data: existing } = await admin.from("workout_sessions").select("id, strava_activity_id, summary_polyline, average_heartrate").eq("user_id", userId).not("strava_activity_id", "is", null);
      const existingMap = new Map((existing || []).map((r: any) => [r.strava_activity_id, r]));
      const newActivities = activities.filter((a) => !existingMap.has(a.id));
      let updated = 0;

      // Insert new activities
      if (newActivities.length > 0) {
        for (let i = 0; i < newActivities.length; i += 100) {
          const batch = newActivities.slice(i, i + 100);
          const rows = batch.map((a) => buildActivityRow(a, userId));
          const { error } = await admin.from("workout_sessions").insert(rows);
          if (error) { console.error("Insert error:", error); return new Response(JSON.stringify({ error: "Failed to insert activities", synced: i }), { status: 500, headers: corsHeaders }); }
        }
      }

      // Update existing activities missing map/heartrate data
      for (const a of activities) {
        const existingRow = existingMap.get(a.id);
        if (!existingRow) continue;
        const needsUpdate = !existingRow.summary_polyline && a.map?.summary_polyline
          || !existingRow.average_heartrate && a.average_heartrate;
        if (needsUpdate) {
          const updateObj: any = {};
          if (!existingRow.summary_polyline && a.map?.summary_polyline) updateObj.summary_polyline = a.map.summary_polyline;
          if (!existingRow.average_heartrate && a.average_heartrate) {
            updateObj.average_heartrate = Math.round(a.average_heartrate);
            updateObj.max_heartrate = a.max_heartrate ? Math.round(a.max_heartrate) : null;
          }
          await admin.from("workout_sessions").update(updateObj).eq("id", existingRow.id);
          updated++;
        }
      }

      return new Response(JSON.stringify({ synced: newActivities.length, updated, total: activities.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== FETCH-STREAMS: get detailed streams for one activity =====
    if (action === "fetch-streams") {
      const userId = await getAuthenticatedUser(req);
      if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

      const sessionId = url.searchParams.get("session_id");
      const stravaActivityId = url.searchParams.get("strava_activity_id");
      if (!sessionId || !stravaActivityId) {
        return new Response(JSON.stringify({ error: "Missing session_id or strava_activity_id" }), { status: 400, headers: corsHeaders });
      }

      const admin = adminClient();

      // Check cache first
      const { data: cached } = await admin.from("workout_streams").select("*").eq("session_id", sessionId).single();
      if (cached) {
        return new Response(JSON.stringify({
          heartrateData: cached.heartrate_data,
          altitudeData: cached.altitude_data,
          latlngData: cached.latlng_data,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { accessToken } = await getConnectionAndToken(userId);

      // Fetch streams from Strava
      const streamsRes = await fetch(
        `https://www.strava.com/api/v3/activities/${stravaActivityId}/streams?keys=heartrate,altitude,distance,time,latlng&key_by_type=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!streamsRes.ok) {
        const errText = await streamsRes.text();
        console.error("Strava streams error:", errText);
        return new Response(JSON.stringify({ error: "Failed to fetch streams from Strava" }), { status: 500, headers: corsHeaders });
      }

      const streamsData = await streamsRes.json();

      // Process streams into our format
      const timeArr = streamsData.time?.data || [];
      const hrArr = streamsData.heartrate?.data || [];
      const altArr = streamsData.altitude?.data || [];
      const distArr = streamsData.distance?.data || [];
      const latlngArr = streamsData.latlng?.data || [];

      const heartrateData = hrArr.length > 0 ? hrArr.map((v: number, i: number) => ({ time: timeArr[i] || i, value: v })) : null;
      const altitudeData = altArr.length > 0 ? altArr.map((v: number, i: number) => ({ distance: distArr[i] || i, value: v })) : null;
      const latlngData = latlngArr.length > 0 ? latlngArr : null;

      // Cache in database
      await admin.from("workout_streams").insert({
        session_id: sessionId,
        user_id: userId,
        heartrate_data: heartrateData,
        altitude_data: altitudeData,
        latlng_data: latlngData,
      });

      return new Response(JSON.stringify({ heartrateData: heartrateData, altitudeData: altitudeData, latlngData: latlngData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Strava function error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
