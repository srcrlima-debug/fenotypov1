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
      avaliacoes: {
        Row: {
          created_at: string
          faixa_etaria: string | null
          foto_id: number
          genero: string | null
          id: string
          is_admin_vote: boolean
          regiao: string | null
          resposta: string
          session_id: string
          tempo_gasto: number
          training_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          faixa_etaria?: string | null
          foto_id: number
          genero?: string | null
          id?: string
          is_admin_vote?: boolean
          regiao?: string | null
          resposta: string
          session_id: string
          tempo_gasto: number
          training_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          faixa_etaria?: string | null
          foto_id?: number
          genero?: string | null
          id?: string
          is_admin_vote?: boolean
          regiao?: string | null
          resposta?: string
          session_id?: string
          tempo_gasto?: number
          training_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          estado: string
          experiencia_bancas: string | null
          faixa_etaria: string
          genero: string
          id: string
          pertencimento_racial: string | null
          regiao: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          estado: string
          experiencia_bancas?: string | null
          faixa_etaria: string
          genero: string
          id?: string
          pertencimento_racial?: string | null
          regiao?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          estado?: string
          experiencia_bancas?: string | null
          faixa_etaria?: string
          genero?: string
          id?: string
          pertencimento_racial?: string | null
          regiao?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          created_by: string
          current_photo: number | null
          data: string
          id: string
          nome: string
          photo_duration: number | null
          photo_start_time: string | null
          session_status: string | null
          training_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_photo?: number | null
          data: string
          id?: string
          nome: string
          photo_duration?: number | null
          photo_start_time?: string | null
          session_status?: string | null
          training_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_photo?: number | null
          data?: string
          id?: string
          nome?: string
          photo_duration?: number | null
          photo_start_time?: string | null
          session_status?: string | null
          training_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_participants: {
        Row: {
          created_at: string
          email: string
          estado: string
          experiencia_bancas: string | null
          faixa_etaria: string
          genero: string
          id: string
          pertencimento_racial: string | null
          regiao: string | null
          training_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          estado: string
          experiencia_bancas?: string | null
          faixa_etaria: string
          genero: string
          id?: string
          pertencimento_racial?: string | null
          regiao?: string | null
          training_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          estado?: string
          experiencia_bancas?: string | null
          faixa_etaria?: string
          genero?: string
          id?: string
          pertencimento_racial?: string | null
          regiao?: string | null
          training_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_participants_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          created_at: string
          created_by: string
          data: string
          descricao: string | null
          id: string
          nome: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          data: string
          descricao?: string | null
          id?: string
          nome: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          data?: string
          descricao?: string | null
          id?: string
          nome?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      sessions_public: {
        Row: {
          created_at: string | null
          current_photo: number | null
          data: string | null
          id: string | null
          nome: string | null
          photo_duration: number | null
          photo_start_time: string | null
          session_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_photo?: number | null
          data?: string | null
          id?: string | null
          nome?: string | null
          photo_duration?: number | null
          photo_start_time?: string | null
          session_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_photo?: number | null
          data?: string | null
          id?: string | null
          nome?: string | null
          photo_duration?: number | null
          photo_start_time?: string | null
          session_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_session_active: { Args: { _session_id: string }; Returns: boolean }
      is_session_creator: {
        Args: { _session_id: string; _user_id: string }
        Returns: boolean
      }
      is_training_participant: {
        Args: { _training_id: string; _user_id: string }
        Returns: boolean
      }
      next_photo: { Args: { session_id_param: string }; Returns: undefined }
      restart_current_photo: {
        Args: { session_id_param: string }
        Returns: undefined
      }
      show_results: { Args: { session_id_param: string }; Returns: undefined }
      start_session: { Args: { session_id_param: string }; Returns: undefined }
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
