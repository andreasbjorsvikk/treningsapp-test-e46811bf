import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;
const STRAVA_WEBHOOK_VERIFY_TOKEN = Deno.env.get("STRAVA_WEBHOOK_VERIFY_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // ===== GET: Webhook subscription validation =====
    // Strava sends a GET with hub.mode, hub.verify_token, hub.challenge
    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === STRAVA_WEBHOOK_VERIFY_TOKEN) {
        console.log("Webhook validation successful");
        return new Response(JSON.stringify({ "hub.challenge": challenge }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    // ===== POST: Incoming webhook event =====
    if (req.method === "POST") {
      const event = await req.json();
      console.log("Webhook event received:", JSON.stringify(event));

      const { object_type, aspect_type, object_id, owner_id } = event;

      // We only care about activity events
      if (object_type !== "activity") {
        return new Response("OK", { status: 200, headers: corsHeaders });
      }

      const admin = adminClient();

      // Find the user by strava_athlete_id
      const { data: conn } = await admin
        .from("strava_connections")
        .select("*")
        .eq("strava_athlete_id", owner_id)
        .single();

      if (!conn) {
        console.log(`No connection found for athlete ${owner_id}`);
        return new Response("OK", { status: 200, headers: corsHeaders });
      }

      const userId = conn.user_id;

      // Handle DELETE
      if (aspect_type === "delete") {
        // Delete the workout session and any cached streams
        const { data: session } = await admin
          .from("workout_sessions")
          .select("id")
          .eq("user_id", userId)
          .eq("strava_activity_id", object_id)
          .single();

        if (session) {
          await admin.from("workout_streams").delete().eq("session_id", session.id);
          await admin.from("workout_sessions").delete().eq("id", session.id);
          console.log(`Deleted activity ${object_id} for user ${userId}`);
        }
        return new Response("OK", { status: 200, headers: corsHeaders });
      }

      // Handle CREATE and UPDATE — fetch the activity from Strava API
      if (aspect_type === "create" || aspect_type === "update") {
        const accessToken = await ensureFreshToken(conn);

        const activityRes = await fetch(
          `https://www.strava.com/api/v3/activities/${object_id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!activityRes.ok) {
          console.error(`Failed to fetch activity ${object_id}: ${activityRes.status}`);
          return new Response("OK", { status: 200, headers: corsHeaders });
        }

        const a = await activityRes.json();

        const row = {
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
          source_primary: 'strava',
          sync_status: 'synced',
          imported_at: new Date().toISOString(),
        };

        // For CREATE: check for matching non-strava sessions to merge
        if (aspect_type === "create") {
          const { data: nonStravaSessions } = await admin.from("workout_sessions")
            .select("id, type, date, duration_minutes, distance, elevation_gain, source_primary")
            .eq("user_id", userId)
            .is("strava_activity_id", null);

          const rowTime = new Date(row.date).getTime();
          const rowGroup = getActivityGroup(row.type);
          let matchId: string | null = null;

          for (const m of (nonStravaSessions || [])) {
            const mTime = new Date(m.date).getTime();
            if (Math.abs(rowTime - mTime) > 15 * 60 * 1000) continue;
            const mGroup = getActivityGroup(m.type);
            if (rowGroup !== mGroup) continue;
            if (rowGroup === 'other' && mGroup === 'other') continue;

            // Check 2/3 metrics
            const checks: (boolean | null)[] = [];
            if (row.duration_minutes > 0 && m.duration_minutes > 0) {
              const diff = Math.abs(row.duration_minutes - m.duration_minutes);
              checks.push(diff / Math.max(row.duration_minutes, m.duration_minutes) <= 0.20);
            } else checks.push(null);
            if (row.distance && m.distance) {
              const diff = Math.abs(row.distance - m.distance);
              checks.push(diff / Math.max(row.distance, m.distance) <= 0.20);
            } else checks.push(null);
            if (row.elevation_gain && m.elevation_gain) {
              const diff = Math.abs(row.elevation_gain - m.elevation_gain);
              checks.push(diff / Math.max(row.elevation_gain, m.elevation_gain) <= 0.20);
            } else checks.push(null);

            const matchCount = checks.filter(c => c === true).length;
            const conclusiveCount = checks.filter(c => c !== null).length;
            if (matchCount >= 2 || (conclusiveCount === 1 && matchCount === 1)) {
              matchId = m.id;
              break;
            }
          }

          if (matchId) {
            // Merge: update existing session with strava link
            await admin.from("workout_sessions").update({
              strava_activity_id: a.id,
              source_primary: 'strava',
              sync_status: 'matched',
              source_history: [{ source: 'merged_via_webhook', linked_at: new Date().toISOString() }],
            }).eq("id", matchId);
            console.log(`Merged activity ${a.id} with existing session ${matchId} for user ${userId}`);
            return new Response("OK", { status: 200, headers: corsHeaders });
          }
        }

        const { error } = await admin
          .from("workout_sessions")
          .upsert(row, { onConflict: "user_id,strava_activity_id", ignoreDuplicates: false });

        if (error) {
          console.error("Upsert error:", error);
        } else {
          console.log(`Upserted activity ${a.id} (${aspect_type}) for user ${userId}`);
        }

        // If it's an update, clear cached streams so they get re-fetched
        if (aspect_type === "update") {
          const { data: session } = await admin
            .from("workout_sessions")
            .select("id")
            .eq("user_id", userId)
            .eq("strava_activity_id", object_id)
            .single();
          if (session) {
            await admin.from("workout_streams").delete().eq("session_id", session.id);
          }
        }

        return new Response("OK", { status: 200, headers: corsHeaders });
      }

      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (err) {
    console.error("Webhook error:", err);
    // Always return 200 to Strava to prevent retries on our errors
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});
