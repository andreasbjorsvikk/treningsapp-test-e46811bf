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
        Relationships: [
          {
            foreignKeyName: "community_notifications_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string
          custom_end: string | null
          custom_start: string | null
          id: string
          metric: string
          period: string
          show_on_home: boolean | null
          sort_order: number | null
          target: number
          user_id: string
        }
        Insert: {
          activity_type?: string
          created_at?: string
          custom_end?: string | null
          custom_start?: string | null
          id?: string
          metric: string
          period: string
          show_on_home?: boolean | null
          sort_order?: number | null
          target: number
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          custom_end?: string | null
          custom_start?: string | null
          id?: string
          metric?: string
          period?: string
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
          session_type_colors: Json | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          session_type_colors?: Json | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          session_type_colors?: Json | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
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
      workout_sessions: {
        Row: {
          average_heartrate: number | null
          created_at: string
          date: string
          distance: number | null
          duration_minutes: number
          elevation_gain: number | null
          id: string
          max_heartrate: number | null
          notes: string | null
          strava_activity_id: number | null
          summary_polyline: string | null
          title: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          average_heartrate?: number | null
          created_at?: string
          date: string
          distance?: number | null
          duration_minutes: number
          elevation_gain?: number | null
          id?: string
          max_heartrate?: number | null
          notes?: string | null
          strava_activity_id?: number | null
          summary_polyline?: string | null
          title?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          average_heartrate?: number | null
          created_at?: string
          date?: string
          distance?: number | null
          duration_minutes?: number
          elevation_gain?: number | null
          id?: string
          max_heartrate?: number | null
          notes?: string | null
          strava_activity_id?: number | null
          summary_polyline?: string | null
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
      is_challenge_participant: {
        Args: { _challenge_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
