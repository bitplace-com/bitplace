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
      alliance_invites: {
        Row: {
          alliance_id: string
          created_at: string | null
          id: string
          invited_by_user_id: string
          invited_user_id: string
          status: string
        }
        Insert: {
          alliance_id: string
          created_at?: string | null
          id?: string
          invited_by_user_id: string
          invited_user_id: string
          status?: string
        }
        Update: {
          alliance_id?: string
          created_at?: string | null
          id?: string
          invited_by_user_id?: string
          invited_user_id?: string
          status?: string
        }
        Relationships: []
      }
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
            foreignKeyName: "alliance_members_alliance_id_fkey"
            columns: ["alliance_id"]
            isOneToOne: false
            referencedRelation: "public_alliances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliance_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_pixel_owner_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliance_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_profiles"
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
          image_url: string | null
          name: string
          tag: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          image_url?: string | null
          name: string
          tag: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          image_url?: string | null
          name?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "alliances_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_pixel_owner_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliances_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
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
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean
          meta: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean
          meta?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean
          meta?: Json | null
          title?: string
          type?: string
          user_id?: string
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
            referencedRelation: "public_pixel_owner_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paint_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "public_pixel_owner_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
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
          atk_total: number
          color: string
          created_at: string | null
          def_total: number
          id: number
          owner_stake_pe: number
          owner_user_id: string | null
          pixel_id: number | null
          tile_x: number | null
          tile_y: number | null
          updated_at: string | null
          x: number
          y: number
        }
        Insert: {
          atk_total?: number
          color: string
          created_at?: string | null
          def_total?: number
          id?: number
          owner_stake_pe?: number
          owner_user_id?: string | null
          pixel_id?: number | null
          tile_x?: number | null
          tile_y?: number | null
          updated_at?: string | null
          x: number
          y: number
        }
        Update: {
          atk_total?: number
          color?: string
          created_at?: string | null
          def_total?: number
          id?: number
          owner_stake_pe?: number
          owner_user_id?: string | null
          pixel_id?: number | null
          tile_x?: number | null
          tile_y?: number | null
          updated_at?: string | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "pixels_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "public_pixel_owner_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixels_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixels_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      place_likes: {
        Row: {
          created_at: string
          place_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          place_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          place_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_likes_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_pixel_owner_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      place_saves: {
        Row: {
          created_at: string
          place_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          place_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          place_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_saves_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_pixel_owner_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          bbox_xmax: number | null
          bbox_xmin: number | null
          bbox_ymax: number | null
          bbox_ymin: number | null
          center_x: number | null
          center_y: number | null
          created_at: string
          creator_user_id: string
          description: string | null
          id: string
          is_public: boolean
          lat: number
          likes_count: number
          lng: number
          saves_count: number
          snapshot_url: string | null
          title: string
          updated_at: string
          zoom: number
        }
        Insert: {
          bbox_xmax?: number | null
          bbox_xmin?: number | null
          bbox_ymax?: number | null
          bbox_ymin?: number | null
          center_x?: number | null
          center_y?: number | null
          created_at?: string
          creator_user_id: string
          description?: string | null
          id?: string
          is_public?: boolean
          lat: number
          likes_count?: number
          lng: number
          saves_count?: number
          snapshot_url?: string | null
          title: string
          updated_at?: string
          zoom?: number
        }
        Update: {
          bbox_xmax?: number | null
          bbox_xmin?: number | null
          bbox_ymax?: number | null
          bbox_ymin?: number | null
          center_x?: number | null
          center_y?: number | null
          created_at?: string
          creator_user_id?: string
          description?: string | null
          id?: string
          is_public?: boolean
          lat?: number
          likes_count?: number
          lng?: number
          saves_count?: number
          snapshot_url?: string | null
          title?: string
          updated_at?: string
          zoom?: number
        }
        Relationships: [
          {
            foreignKeyName: "places_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "public_pixel_owner_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "places_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "places_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string | null
          followed_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          followed_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          followed_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: []
      }
      user_pins: {
        Row: {
          created_at: string | null
          id: string
          label: string
          lat: number
          lng: number
          user_id: string
          zoom: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          lat: number
          lng: number
          user_id: string
          zoom?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          lat?: number
          lng?: number
          user_id?: string
          zoom?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_pins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_pixel_owner_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_pins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_pins_user_id_fkey"
            columns: ["user_id"]
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
          bio: string | null
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
          paint_cooldown_until: string | null
          pe_total_pe: number
          pe_used_pe: number
          pixels_painted_total: number
          rebalance_active: boolean
          rebalance_ends_at: string | null
          rebalance_started_at: string | null
          rebalance_target_multiplier: number | null
          social_discord: string | null
          social_instagram: string | null
          social_website: string | null
          social_x: string | null
          sol_cluster: string | null
          takeover_atk_pe_total: number
          takeover_def_pe_total: number
          usd_price: number | null
          wallet_address: string | null
          wallet_usd: number | null
          xp: number
        }
        Insert: {
          alliance_tag?: string | null
          avatar_url?: string | null
          bio?: string | null
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
          paint_cooldown_until?: string | null
          pe_total_pe?: number
          pe_used_pe?: number
          pixels_painted_total?: number
          rebalance_active?: boolean
          rebalance_ends_at?: string | null
          rebalance_started_at?: string | null
          rebalance_target_multiplier?: number | null
          social_discord?: string | null
          social_instagram?: string | null
          social_website?: string | null
          social_x?: string | null
          sol_cluster?: string | null
          takeover_atk_pe_total?: number
          takeover_def_pe_total?: number
          usd_price?: number | null
          wallet_address?: string | null
          wallet_usd?: number | null
          xp?: number
        }
        Update: {
          alliance_tag?: string | null
          avatar_url?: string | null
          bio?: string | null
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
          paint_cooldown_until?: string | null
          pe_total_pe?: number
          pe_used_pe?: number
          pixels_painted_total?: number
          rebalance_active?: boolean
          rebalance_ends_at?: string | null
          rebalance_started_at?: string | null
          rebalance_target_multiplier?: number | null
          social_discord?: string | null
          social_instagram?: string | null
          social_website?: string | null
          social_x?: string | null
          sol_cluster?: string | null
          takeover_atk_pe_total?: number
          takeover_def_pe_total?: number
          usd_price?: number | null
          wallet_address?: string | null
          wallet_usd?: number | null
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      public_alliances: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string | null
          name: string | null
          tag: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          name?: string | null
          tag?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          name?: string | null
          tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alliances_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_pixel_owner_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliances_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliances_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      public_pixel_owner_info: {
        Row: {
          alliance_tag: string | null
          avatar_url: string | null
          bio: string | null
          country_code: string | null
          display_name: string | null
          id: string | null
          level: number | null
          owner_health_multiplier: number | null
          pixels_painted_total: number | null
          rebalance_active: boolean | null
          rebalance_ends_at: string | null
          rebalance_started_at: string | null
          rebalance_target_multiplier: number | null
          social_discord: string | null
          social_instagram: string | null
          social_website: string | null
          social_x: string | null
          wallet_short: string | null
        }
        Insert: {
          alliance_tag?: string | null
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          display_name?: string | null
          id?: string | null
          level?: number | null
          owner_health_multiplier?: number | null
          pixels_painted_total?: number | null
          rebalance_active?: boolean | null
          rebalance_ends_at?: string | null
          rebalance_started_at?: string | null
          rebalance_target_multiplier?: number | null
          social_discord?: string | null
          social_instagram?: string | null
          social_website?: string | null
          social_x?: string | null
          wallet_short?: never
        }
        Update: {
          alliance_tag?: string | null
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          display_name?: string | null
          id?: string | null
          level?: number | null
          owner_health_multiplier?: number | null
          pixels_painted_total?: number | null
          rebalance_active?: boolean | null
          rebalance_ends_at?: string | null
          rebalance_started_at?: string | null
          rebalance_target_multiplier?: number | null
          social_discord?: string | null
          social_instagram?: string | null
          social_website?: string | null
          social_x?: string | null
          wallet_short?: never
        }
        Relationships: []
      }
      public_user_profiles: {
        Row: {
          alliance_tag: string | null
          avatar_url: string | null
          country_code: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          level: number | null
          pe_used_pe: number | null
          pixels_painted_total: number | null
          wallet_address: string | null
          wallet_short: string | null
          xp: number | null
        }
        Insert: {
          alliance_tag?: string | null
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          level?: number | null
          pe_used_pe?: number | null
          pixels_painted_total?: number | null
          wallet_address?: string | null
          wallet_short?: never
          xp?: number | null
        }
        Update: {
          alliance_tag?: string | null
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          level?: number | null
          pe_used_pe?: number | null
          pixels_painted_total?: number | null
          wallet_address?: string | null
          wallet_short?: never
          xp?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      fetch_pixels_by_coords: {
        Args: { coords: Json }
        Returns: {
          atk_total: number
          color: string
          def_total: number
          id: number
          owner_stake_pe: number
          owner_user_id: string
          pixel_id: number
          x: number
          y: number
        }[]
      }
      get_alliance_stats_by_tag: {
        Args: { tag_input: string }
        Returns: {
          member_count: number
          name: string
          tag: string
          total_pe_staked: number
          total_pixels: number
        }[]
      }
      get_pixels_by_tiles: {
        Args: { tile_x_list: number[]; tile_y_list: number[] }
        Returns: {
          color: string
          id: number
          tile_x: number
          tile_y: number
          x: number
          y: number
        }[]
      }
      get_user_total_staked_pe: {
        Args: { uid: string }
        Returns: {
          contribution_total: number
          pixel_stake_total: number
        }[]
      }
      leaderboard_top_attackers: {
        Args: { lim?: number }
        Returns: {
          alliance_tag: string
          avatar_url: string
          bio: string
          country_code: string
          display_name: string
          social_instagram: string
          social_website: string
          social_x: string
          total_pe: number
          user_id: string
          wallet_address: string
        }[]
      }
      leaderboard_top_defenders: {
        Args: { lim?: number }
        Returns: {
          alliance_tag: string
          avatar_url: string
          bio: string
          country_code: string
          display_name: string
          social_instagram: string
          social_website: string
          social_x: string
          total_pe: number
          user_id: string
          wallet_address: string
        }[]
      }
      leaderboard_top_investors: {
        Args: { lim?: number }
        Returns: {
          alliance_tag: string
          avatar_url: string
          bio: string
          country_code: string
          display_name: string
          social_instagram: string
          social_website: string
          social_x: string
          total_pe: number
          user_id: string
          wallet_address: string
        }[]
      }
      recalc_user_pe_used: { Args: { target_user_id: string }; Returns: number }
      sum_owner_stake_in_bbox: {
        Args: {
          p_owner_id: string
          p_xmax: number
          p_xmin: number
          p_ymax: number
          p_ymin: number
        }
        Returns: number
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
