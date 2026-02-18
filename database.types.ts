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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ais_reports: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          confirmed_species: string | null
          created_at: string | null
          exported_to_sheet_at: string | null
          id: string
          latitude: number
          longitude: number
          notes: string | null
          photo_path: string | null
          photo_url: string | null
          public_visible: boolean | null
          species_code: string | null
          species_guess: string | null
          species_id: string | null
          species_image_url: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_species?: string | null
          created_at?: string | null
          exported_to_sheet_at?: string | null
          id?: string
          latitude: number
          longitude: number
          notes?: string | null
          photo_path?: string | null
          photo_url?: string | null
          public_visible?: boolean | null
          species_code?: string | null
          species_guess?: string | null
          species_id?: string | null
          species_image_url?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_species?: string | null
          created_at?: string | null
          exported_to_sheet_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          notes?: string | null
          photo_path?: string | null
          photo_url?: string | null
          public_visible?: boolean | null
          species_code?: string | null
          species_guess?: string | null
          species_id?: string | null
          species_image_url?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ais_reports_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
      decon_stations: {
        Row: {
          created_at: string | null
          latitude: number
          location_name: string
          longitude: number
          operational_status: string
          station_id: string
          station_name: string | null
          station_type: string
        }
        Insert: {
          created_at?: string | null
          latitude: number
          location_name?: string
          longitude: number
          operational_status?: string
          station_id: string
          station_name?: string | null
          station_type?: string
        }
        Update: {
          created_at?: string | null
          latitude?: number
          location_name?: string
          longitude?: number
          operational_status?: string
          station_id?: string
          station_name?: string | null
          station_type?: string
        }
        Relationships: []
      }
      dfo_users: {
        Row: {
          email: string | null
          id: string
          role: string | null
        }
        Insert: {
          email?: string | null
          id: string
          role?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          end: string | null
          event_id: string
          event_name: string | null
          latitude: number | null
          longitude: number | null
          organizer_id: string | null
          start: string | null
        }
        Insert: {
          end?: string | null
          event_id: string
          event_name?: string | null
          latitude?: number | null
          longitude?: number | null
          organizer_id?: string | null
          start?: string | null
        }
        Update: {
          end?: string | null
          event_id?: string
          event_name?: string | null
          latitude?: number | null
          longitude?: number | null
          organizer_id?: string | null
          start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_checkins: {
        Row: {
          created_at: string | null
          device_id: string | null
          id: string
          launch_id: string | null
          launch_name: string
          next_province: string
          next_waterbody: string
          next_waterbody_id: number | null
          prev_province: string
          prev_waterbody: string
          prev_waterbody_id: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          launch_id?: string | null
          launch_name: string
          next_province: string
          next_waterbody: string
          next_waterbody_id?: number | null
          prev_province: string
          prev_waterbody: string
          prev_waterbody_id?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          launch_id?: string | null
          launch_name?: string
          next_province?: string
          next_waterbody?: string
          next_waterbody_id?: number | null
          prev_province?: string
          prev_waterbody?: string
          prev_waterbody_id?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      launch_flows_old: {
        Row: {
          boat_launch: string | null
          id: number
          latitude: number | null
          launch_id: string | null
          longitude: number | null
          movement_type: string | null
          waterbody_lat: number | null
          waterbody_lon: number | null
          waterbody_name: string | null
        }
        Insert: {
          boat_launch?: string | null
          id?: number
          latitude?: number | null
          launch_id?: string | null
          longitude?: number | null
          movement_type?: string | null
          waterbody_lat?: number | null
          waterbody_lon?: number | null
          waterbody_name?: string | null
        }
        Update: {
          boat_launch?: string | null
          id?: number
          latitude?: number | null
          launch_id?: string | null
          longitude?: number | null
          movement_type?: string | null
          waterbody_lat?: number | null
          waterbody_lon?: number | null
          waterbody_name?: string | null
        }
        Relationships: []
      }
      launches: {
        Row: {
          created_at: string | null
          id: string
          Latitude: number
          Longitude: number
          Name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          Latitude: number
          Longitude: number
          Name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          Latitude?: number
          Longitude?: number
          Name?: string
        }
        Relationships: []
      }
      mobile_decon_stations: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          latitude: number
          longitude: number
          notes: string | null
          start_time: string
          station_name: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          latitude: number
          longitude: number
          notes?: string | null
          start_time: string
          station_name: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          latitude?: number
          longitude?: number
          notes?: string | null
          start_time?: string
          station_name?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications_with_read"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      organizers: {
        Row: {
          active: boolean | null
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          active?: boolean | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          active?: boolean | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string | null
          id: string
          token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          token?: string
          user_id?: string | null
        }
        Relationships: []
      }
      species: {
        Row: {
          active: boolean
          code: string | null
          common_name: string
          created_at: string
          id: string
          image_url: string | null
          info_url: string | null
          scientific_name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code?: string | null
          common_name: string
          created_at?: string
          id?: string
          image_url?: string | null
          info_url?: string | null
          scientific_name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string | null
          common_name?: string
          created_at?: string
          id?: string
          image_url?: string | null
          info_url?: string | null
          scientific_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      waterbodies: {
        Row: {
          id: number
          latitude: number
          longitude: number
          name_count: number | null
          region: string
          search_name: string
          search_name_norm: string | null
        }
        Insert: {
          id?: number
          latitude: number
          longitude: number
          name_count?: number | null
          region: string
          search_name: string
          search_name_norm?: string | null
        }
        Update: {
          id?: number
          latitude?: number
          longitude?: number
          name_count?: number | null
          region?: string
          search_name?: string
          search_name_norm?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      all_boater_movements: {
        Row: {
          boat_launch: string | null
          movement_type: string | null
          waterbody_lat: number | null
          waterbody_lon: number | null
          waterbody_name: string | null
        }
        Relationships: []
      }
      boater_movements: {
        Row: {
          boat_launch: string | null
          movement_type: string | null
          waterbody_lat: number | null
          waterbody_lon: number | null
          waterbody_name: string | null
        }
        Relationships: []
      }
      launch_flows_v2: {
        Row: {
          boat_launch: string | null
          checkin_id: string | null
          launch_id: string | null
          movement_type: string | null
          waterbody_id: string | null
          waterbody_lat: number | null
          waterbody_lon: number | null
          waterbody_name: string | null
        }
        Relationships: []
      }
      launches_with_activity: {
        Row: {
          has_movement: boolean | null
          id: string | null
          latitude: number | null
          longitude: number | null
          movement_count: number | null
          name: string | null
        }
        Relationships: []
      }
      launches_with_activity_real: {
        Row: {
          has_movement: boolean | null
          id: string | null
          latitude: number | null
          longitude: number | null
          movement_count: number | null
          name: string | null
        }
        Relationships: []
      }
      notifications_with_read: {
        Row: {
          body: string | null
          created_at: string | null
          id: string | null
          is_read: boolean | null
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          is_read?: never
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          is_read?: never
          title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      app_debug_whoami: { Args: never; Returns: Json }
      search_waterbodies: {
        Args: { province: string; query: string }
        Returns: {
          score: number
          search_name: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
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
