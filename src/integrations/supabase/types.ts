export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      apple_health_connections: {
        Row: {
          calories_enabled: boolean
          connected_at: string
          created_at: string
          disconnected_at: string | null
          id: string
          last_sync_at: string | null
          steps_enabled: boolean
          updated_at: string
          user_id: string
          workouts_enabled: boolean
        }
        Insert: {
          calories_enabled?: boolean
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          id?: string
          last_sync_at?: string | null
          steps_enabled?: boolean
          updated_at?: string
          user_id: string
          workouts_enabled?: boolean
        }
        Update: {
          calories_enabled?: boolean
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          id?: string
          last_sync_at?: string | null
          steps_enabled?: boolean
          updated_at?: string
          user_id?: string
          workouts_enabled?: boolean
        }
        Relationships: []
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string
          emoji: string | null
          id: string
          metric: string
          name: string
          period_end: string
          period_start: string
          target: number
          updated_at: string
        }
        Insert: {
          activity_type?: string
          created_at?: string
          created_by: string
          emoji?: string | null
          id?: string
          metric: string
          name: string
          period_end: string
          period_start: string
          target?: number
          updated_at?: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string
          emoji?: string | null
          id?: string
          metric?: string
          name?: string
          period_end?: string
          period_start?: string
          target?: number
          updated_at?: string
        }
        Relationships: []
      }
      child_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          emoji: string
          id: string
          name: string
          parent_user_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          emoji?: string
          id?: string
          name: string
          parent_user_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          emoji?: string
          id?: string
          name?: string
          parent_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      child_shared_access: {
        Row: {
          child_id: string
          created_at: string
          id: string
          invited_by: string
          shared_with_user_id: string
          status: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          invited_by: string
          shared_with_user_id: string
          status?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          shared_with_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_shared_access_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_notifications: {
        Row: {
          challenge_id: string | null
          created_at: string
          from_user_id: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          challenge_id?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_health_metrics: {
        Row: {
          active_calories: number | null
          created_at: string
          date: string
          id: string
          source: string
          steps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_calories?: number | null
          created_at?: string
          date: string
          id?: string
          source?: string
          steps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_calories?: number | null
          created_at?: string
          date?: string
          id?: string
          source?: string
          steps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          activity_type: string
          archived: boolean | null
          created_at: string
          custom_end: string | null
          custom_start: string | null
          id: string
          metric: string
          period: string
          repeating: boolean | null
          show_on_home: boolean | null
          sort_order: number | null
          target: number
          user_id: string
        }
        Insert: {
          activity_type?: string
          archived?: boolean | null
          created_at?: string
          custom_end?: string | null
          custom_start?: string | null
          id?: string
          metric: string
          period: string
          repeating?: boolean | null
          show_on_home?: boolean | null
          sort_order?: number | null
          target: number
          user_id: string
        }
        Update: {
          activity_type?: string
          archived?: boolean | null
          created_at?: string
          custom_end?: string | null
          custom_start?: string | null
          id?: string
          metric?: string
          period?: string
          repeating?: boolean | null
          show_on_home?: boolean | null
          sort_order?: number | null
          target?: number
          user_id?: string
        }
        Relationships: []
      }
      health_events: {
        Row: {
          created_at: string
          date_from: string
          date_to: string | null
          id: string
          notes: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_from: string
          date_to?: string | null
          id?: string
          notes?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_from?: string
          date_to?: string | null
          id?: string
          notes?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      hiking_record_shares: {
        Row: {
          created_at: string
          hiking_record_id: string
          id: string
          owner_id: string
          shared_with_user_id: string
          status: string
        }
        Insert: {
          created_at?: string
          hiking_record_id: string
          id?: string
          owner_id: string
          shared_with_user_id: string
          status?: string
        }
        Update: {
          created_at?: string
          hiking_record_id?: string
          id?: string
          owner_id?: string
          shared_with_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hiking_record_shares_hiking_record_id_fkey"
            columns: ["hiking_record_id"]
            isOneToOne: false
            referencedRelation: "hiking_records"
            referencedColumns: ["id"]
          },
        ]
      }
      hiking_records: {
        Row: {
          created_at: string
          distance: number | null
          elevation: number | null
          elevation_gain: number | null
          entries: Json
          id: string
          name: string
          route_description: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          distance?: number | null
          elevation?: number | null
          elevation_gain?: number | null
          entries?: Json
          id?: string
          name: string
          route_description?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          distance?: number | null
          elevation?: number | null
          elevation_gain?: number | null
          entries?: Json
          id?: string
          name?: string
          route_description?: string | null
          user_id?: string
        }
        Relationships: []
      }
      peak_checkins: {
        Row: {
          activity_id: string | null
          checked_in_at: string
          checked_in_by: string | null
          id: string
          image_url: string | null
          peak_id: string
          user_id: string
          verified: boolean
        }
        Insert: {
          activity_id?: string | null
          checked_in_at?: string
          checked_in_by?: string | null
          id?: string
          image_url?: string | null
          peak_id: string
          user_id: string
          verified?: boolean
        }
        Update: {
          activity_id?: string | null
          checked_in_at?: string
          checked_in_by?: string | null
          id?: string
          image_url?: string | null
          peak_id?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      peak_suggestions: {
        Row: {
          admin_comment: string | null
          comment: string | null
          created_at: string
          elevation_moh: number | null
          id: string
          latitude: number
          longitude: number
          name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          user_latitude: number | null
          user_longitude: number | null
        }
        Insert: {
          admin_comment?: string | null
          comment?: string | null
          created_at?: string
          elevation_moh?: number | null
          id?: string
          latitude: number
          longitude: number
          name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          user_latitude?: number | null
          user_longitude?: number | null
        }
        Update: {
          admin_comment?: string | null
          comment?: string | null
          created_at?: string
          elevation_moh?: number | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          user_latitude?: number | null
          user_longitude?: number | null
        }
        Relationships: []
      }
      peaks_db: {
        Row: {
          area: string
          created_at: string
          created_by: string | null
          description_no: string | null
          elevation_moh: number
          id: string
          image_url: string | null
          is_published: boolean
          latitude: number
          longitude: number
          name_no: string
          route_distance_m: number | null
          route_duration_s: number | null
          route_geojson: Json | null
          route_start_lat: number | null
          route_start_lng: number | null
          route_status: string | null
          route_updated_at: string | null
          route_updated_by: string | null
          route_waypoints: Json | null
          updated_at: string
        }
        Insert: {
          area?: string
          created_at?: string
          created_by?: string | null
          description_no?: string | null
          elevation_moh?: number
          id?: string
          image_url?: string | null
          is_published?: boolean
          latitude: number
          longitude: number
          name_no: string
          route_distance_m?: number | null
          route_duration_s?: number | null
          route_geojson?: Json | null
          route_start_lat?: number | null
          route_start_lng?: number | null
          route_status?: string | null
          route_updated_at?: string | null
          route_updated_by?: string | null
          route_waypoints?: Json | null
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          created_by?: string | null
          description_no?: string | null
          elevation_moh?: number
          id?: string
          image_url?: string | null
          is_published?: boolean
          latitude?: number
          longitude?: number
          name_no?: string
          route_distance_m?: number | null
          route_duration_s?: number | null
          route_geojson?: Json | null
          route_start_lat?: number | null
          route_start_lng?: number | null
          route_status?: string | null
          route_updated_at?: string | null
          route_updated_by?: string | null
          route_waypoints?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      primary_goal_periods: {
        Row: {
          created_at: string
          id: string
          input_period: string
          input_target: number
          user_id: string
          valid_from: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_period: string
          input_target: number
          user_id: string
          valid_from: string
        }
        Update: {
          created_at?: string
          id?: string
          input_period?: string
          input_target?: number
          user_id?: string
          valid_from?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          privacy_child_checkins: string
          privacy_child_profile: string
          privacy_goals: string
          privacy_goals_friends: Json | null
          privacy_peak_checkins: string
          privacy_peak_checkins_friends: Json | null
          privacy_stats: string
          privacy_stats_friends: Json | null
          privacy_workouts: string
          privacy_workouts_friends: Json | null
          session_type_colors: Json | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          privacy_child_checkins?: string
          privacy_child_profile?: string
          privacy_goals?: string
          privacy_goals_friends?: Json | null
          privacy_peak_checkins?: string
          privacy_peak_checkins_friends?: Json | null
          privacy_stats?: string
          privacy_stats_friends?: Json | null
          privacy_workouts?: string
          privacy_workouts_friends?: Json | null
          session_type_colors?: Json | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          privacy_child_checkins?: string
          privacy_child_profile?: string
          privacy_goals?: string
          privacy_goals_friends?: Json | null
          privacy_peak_checkins?: string
          privacy_peak_checkins_friends?: Json | null
          privacy_stats?: string
          privacy_stats_friends?: Json | null
          privacy_workouts?: string
          privacy_workouts_friends?: Json | null
          session_type_colors?: Json | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      shared_hiking_entries: {
        Row: {
          avg_heartrate: number | null
          created_at: string
          date: string
          hiking_record_id: string
          id: string
          max_heartrate: number | null
          time: string
          user_id: string
        }
        Insert: {
          avg_heartrate?: number | null
          created_at?: string
          date?: string
          hiking_record_id: string
          id?: string
          max_heartrate?: number | null
          time: string
          user_id: string
        }
        Update: {
          avg_heartrate?: number | null
          created_at?: string
          date?: string
          hiking_record_id?: string
          id?: string
          max_heartrate?: number | null
          time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_hiking_entries_hiking_record_id_fkey"
            columns: ["hiking_record_id"]
            isOneToOne: false
            referencedRelation: "hiking_records"
            referencedColumns: ["id"]
          },
        ]
      }
      strava_connections: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          strava_athlete_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          strava_athlete_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          strava_athlete_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          apple_health_workout_id: string | null
          average_heartrate: number | null
          created_at: string
          date: string
          distance: number | null
          duration_minutes: number
          elevation_gain: number | null
          id: string
          imported_at: string | null
          max_heartrate: number | null
          notes: string | null
          source_history: Json | null
          source_primary: string
          strava_activity_id: number | null
          summary_polyline: string | null
          sync_status: string | null
          title: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apple_health_workout_id?: string | null
          average_heartrate?: number | null
          created_at?: string
          date: string
          distance?: number | null
          duration_minutes: number
          elevation_gain?: number | null
          id?: string
          imported_at?: string | null
          max_heartrate?: number | null
          notes?: string | null
          source_history?: Json | null
          source_primary?: string
          strava_activity_id?: number | null
          summary_polyline?: string | null
          sync_status?: string | null
          title?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apple_health_workout_id?: string | null
          average_heartrate?: number | null
          created_at?: string
          date?: string
          distance?: number | null
          duration_minutes?: number
          elevation_gain?: number | null
          id?: string
          imported_at?: string | null
          max_heartrate?: number | null
          notes?: string | null
          source_history?: Json | null
          source_primary?: string
          strava_activity_id?: number | null
          summary_polyline?: string | null
          sync_status?: string | null
          title?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_streams: {
        Row: {
          altitude_data: Json | null
          created_at: string
          heartrate_data: Json | null
          id: string
          latlng_data: Json | null
          session_id: string
          user_id: string
        }
        Insert: {
          altitude_data?: Json | null
          created_at?: string
          heartrate_data?: Json | null
          id?: string
          latlng_data?: Json | null
          session_id: string
          user_id: string
        }
        Update: {
          altitude_data?: Json | null
          created_at?: string
          heartrate_data?: Json | null
          id?: string
          latlng_data?: Json | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_streams_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_challenge_participant: {
        Args: { _challenge_id: string; _user_id: string }
        Returns: boolean
      }
      is_parent_of: {
        Args: { _child_id: string; _parent_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
