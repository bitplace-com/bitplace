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
      alliance_members: {
        Row: {
          alliance_id: string
          id: string
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          alliance_id: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          alliance_id?: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alliance_members_alliance_id_fkey"
            columns: ["alliance_id"]
            isOneToOne: false
            referencedRelation: "alliances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliance_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alliances: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          invite_code: string
          name: string
          tag: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          invite_code: string
          name: string
          tag: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          invite_code?: string
          name?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "alliances_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_nonces: {
        Row: {
          created_at: string | null
          id: string
          nonce: string
          used_at: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nonce: string
          used_at?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nonce?: string
          used_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      paint_events: {
        Row: {
          action_type: string
          bbox: Json | null
          created_at: string | null
          details: Json | null
          id: number
          pixel_count: number | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          bbox?: Json | null
          created_at?: string | null
          details?: Json | null
          id?: number
          pixel_count?: number | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          bbox?: Json | null
          created_at?: string | null
          details?: Json | null
          id?: number
          pixel_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paint_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pixel_contributions: {
        Row: {
          amount_pe: number
          id: number
          pixel_id: number
          side: string
          user_id: string
        }
        Insert: {
          amount_pe: number
          id?: number
          pixel_id: number
          side: string
          user_id: string
        }
        Update: {
          amount_pe?: number
          id?: number
          pixel_id?: number
          side?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pixel_contributions_pixel_id_fkey"
            columns: ["pixel_id"]
            isOneToOne: false
            referencedRelation: "pixels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pixels: {
        Row: {
          color: string
          created_at: string | null
          id: number
          owner_stake_pe: number
          owner_user_id: string | null
          updated_at: string | null
          x: number
          y: number
        }
        Insert: {
          color: string
          created_at?: string | null
          id?: number
          owner_stake_pe?: number
          owner_user_id?: string | null
          updated_at?: string | null
          x: number
          y: number
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: number
          owner_stake_pe?: number
          owner_user_id?: string | null
          updated_at?: string | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "pixels_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          alliance_tag: string | null
          avatar_url: string | null
          country_code: string | null
          created_at: string | null
          display_name: string | null
          energy_asset: string | null
          id: string
          last_energy_sync_at: string | null
          level: number
          native_balance: number | null
          native_symbol: string | null
          owner_health_multiplier: number
          pe_total_pe: number
          rebalance_active: boolean
          rebalance_ends_at: string | null
          rebalance_started_at: string | null
          rebalance_target_multiplier: number | null
          usd_price: number | null
          wallet_address: string | null
          wallet_usd: number | null
          xp: number
        }
        Insert: {
          alliance_tag?: string | null
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string | null
          display_name?: string | null
          energy_asset?: string | null
          id?: string
          last_energy_sync_at?: string | null
          level?: number
          native_balance?: number | null
          native_symbol?: string | null
          owner_health_multiplier?: number
          pe_total_pe?: number
          rebalance_active?: boolean
          rebalance_ends_at?: string | null
          rebalance_started_at?: string | null
          rebalance_target_multiplier?: number | null
          usd_price?: number | null
          wallet_address?: string | null
          wallet_usd?: number | null
          xp?: number
        }
        Update: {
          alliance_tag?: string | null
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string | null
          display_name?: string | null
          energy_asset?: string | null
          id?: string
          last_energy_sync_at?: string | null
          level?: number
          native_balance?: number | null
          native_symbol?: string | null
          owner_health_multiplier?: number
          pe_total_pe?: number
          rebalance_active?: boolean
          rebalance_ends_at?: string | null
          rebalance_started_at?: string | null
          rebalance_target_multiplier?: number | null
          usd_price?: number | null
          wallet_address?: string | null
          wallet_usd?: number | null
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
