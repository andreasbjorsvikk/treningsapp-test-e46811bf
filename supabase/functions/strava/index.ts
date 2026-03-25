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
    Run: "løping", TrailRun: "løping", VirtualRun: "tredemølle",
    Ride: "sykling", VirtualRide: "sykling", MountainBikeRide: "sykling",
    GravelRide: "sykling", EBikeRide: "sykling",
    Swim: "svømming", Walk: "gå", Hike: "fjelltur",
    WeightTraining: "styrke", Yoga: "yoga", Tennis: "tennis",
    Soccer: "fotball", Workout: "annet",
    Rowing: "roing", Canoeing: "kajakk", Kayaking: "kajakk",
  };
  return map[sportType] || "annet";
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
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

function isWithin(a: number, b: number, pct: number): boolean {
  if (a === 0 && b === 0) return true;
  if (a === 0 || b === 0) return false;
  return Math.abs(a - b) / Math.max(a, b) <= pct;
}

function isDuplicate(row: any, manualSessions: any[]): boolean {
  const rowDate = new Date(row.date);
  for (const m of manualSessions) {
    if (m.type !== row.type) continue;
    const mDate = new Date(m.date);
    // Same calendar day
    if (rowDate.toISOString().slice(0, 10) !== mDate.toISOString().slice(0, 10)) continue;
    // Duration within 5%
    if (!isWithin(row.duration_minutes, m.duration_minutes, 0.05)) continue;
    // At least one of distance or elevation matches within 5% (if both exist)
    const distMatch = row.distance && m.distance ? isWithin(row.distance, m.distance, 0.05) : false;
    const elevMatch = row.elevation_gain && m.elevation_gain ? isWithin(row.elevation_gain, m.elevation_gain, 0.05) : false;
    if (distMatch || elevMatch || (!row.distance && !row.elevation_gain)) return true;
  }
  return false;
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
      const after = afterParam ? parseInt(afterParam) : Math.floor(Date.now() / 1000) - 180 * 86400;
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
      // Get existing strava_activity_ids for this user to count only truly new ones
      const existingIds = new Set<number>();
      const { data: existingRows } = await admin.from("workout_sessions")
        .select("strava_activity_id")
        .eq("user_id", userId)
        .not("strava_activity_id", "is", null);
      if (existingRows) {
        for (const r of existingRows) {
          if (r.strava_activity_id) existingIds.add(Number(r.strava_activity_id));
        }
      }
      const newCount = activities.filter((a: any) => !existingIds.has(a.id)).length;

      // Upsert all activities – the unique constraint prevents duplicates
      for (let i = 0; i < activities.length; i += 100) {
        const batch = activities.slice(i, i + 100);
        const rows = batch.map((a) => buildActivityRow(a, userId));
        const { error } = await admin.from("workout_sessions")
          .upsert(rows, { onConflict: "user_id,strava_activity_id", ignoreDuplicates: false })
          .select("id");
        if (error) { console.error("Upsert error:", error); return new Response(JSON.stringify({ error: "Failed to upsert activities" }), { status: 500, headers: corsHeaders }); }
      }
      return new Response(JSON.stringify({ synced: newCount, total: activities.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      // Upsert all activities – the unique index on (user_id, strava_activity_id) prevents duplicates
      let synced = 0;
      for (let i = 0; i < activities.length; i += 100) {
        const batch = activities.slice(i, i + 100);
        const rows = batch.map((a) => buildActivityRow(a, userId));
        const { data: upserted, error } = await admin.from("workout_sessions")
          .upsert(rows, { onConflict: "user_id,strava_activity_id", ignoreDuplicates: false })
          .select("id");
        if (error) { console.error("Upsert error:", error); return new Response(JSON.stringify({ error: "Failed to upsert activities", synced: i }), { status: 500, headers: corsHeaders }); }
        synced += (upserted || []).length;
      }

      return new Response(JSON.stringify({ synced, total: activities.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    // ===== DELETE-ALL: delete all Strava-imported sessions =====
    if (action === "delete-all") {
      const userId = await getAuthenticatedUser(req);
      if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      const admin = adminClient();
      // First delete cached streams for strava sessions
      const { data: stravaSessions } = await admin.from("workout_sessions").select("id").eq("user_id", userId).not("strava_activity_id", "is", null);
      if (stravaSessions && stravaSessions.length > 0) {
        const ids = stravaSessions.map((s: any) => s.id);
        await admin.from("workout_streams").delete().in("session_id", ids);
      }
      const { data, error } = await admin.from("workout_sessions").delete().eq("user_id", userId).not("strava_activity_id", "is", null).select("id");
      if (error) return new Response(JSON.stringify({ error: "Delete failed" }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ deleted: data?.length || 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Strava function error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
