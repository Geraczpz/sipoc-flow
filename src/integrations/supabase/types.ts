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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contratos: {
        Row: {
          created_at: string
          descripcion: string | null
          estatus_contrato_id: number | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nombre_real: string | null
          sipoc_id: number | null
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          estatus_contrato_id?: number | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre_real?: string | null
          sipoc_id?: number | null
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          estatus_contrato_id?: number | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre_real?: string | null
          sipoc_id?: number | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_estatus_contrato_id_fkey"
            columns: ["estatus_contrato_id"]
            isOneToOne: false
            referencedRelation: "estatus_contrato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_sipoc_id_fkey"
            columns: ["sipoc_id"]
            isOneToOne: false
            referencedRelation: "sipoc"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_proyectos: {
        Row: {
          contrato_id: string
          proyecto_id: string
        }
        Insert: {
          contrato_id: string
          proyecto_id: string
        }
        Update: {
          contrato_id?: string
          proyecto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_proyectos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_proyectos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      estatus_contrato: {
        Row: {
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          descripcion?: string | null
          id?: number
          nombre: string
        }
        Update: {
          descripcion?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      estatus_proyecto: {
        Row: {
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          descripcion?: string | null
          id?: number
          nombre: string
        }
        Update: {
          descripcion?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          correo_electronico: string
          created_at: string
          id: string
          nombre: string
          puesto: string | null
          updated_at: string
        }
        Insert: {
          correo_electronico: string
          created_at?: string
          id: string
          nombre: string
          puesto?: string | null
          updated_at?: string
        }
        Update: {
          correo_electronico?: string
          created_at?: string
          id?: string
          nombre?: string
          puesto?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      progreso: {
        Row: {
          bloqueadores: string | null
          created_at: string
          explicacion_progreso: string | null
          fecha_registro: string
          id: string
          porcentaje_progreso: number
          proyecto_id: string
          registrado_por_usuario_id: string | null
          riesgo: boolean
        }
        Insert: {
          bloqueadores?: string | null
          created_at?: string
          explicacion_progreso?: string | null
          fecha_registro?: string
          id?: string
          porcentaje_progreso: number
          proyecto_id: string
          registrado_por_usuario_id?: string | null
          riesgo?: boolean
        }
        Update: {
          bloqueadores?: string | null
          created_at?: string
          explicacion_progreso?: string | null
          fecha_registro?: string
          id?: string
          porcentaje_progreso?: number
          proyecto_id?: string
          registrado_por_usuario_id?: string | null
          riesgo?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "progreso_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progreso_registrado_por_usuario_id_fkey"
            columns: ["registrado_por_usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proyectos: {
        Row: {
          created_at: string
          descripcion: string | null
          estatus_proyecto_id: number | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          owner_usuario_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          estatus_proyecto_id?: number | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          owner_usuario_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          estatus_proyecto_id?: number | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          owner_usuario_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_estatus_proyecto_id_fkey"
            columns: ["estatus_proyecto_id"]
            isOneToOne: false
            referencedRelation: "estatus_proyecto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_owner_usuario_id_fkey"
            columns: ["owner_usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sipoc: {
        Row: {
          descripcion: string | null
          id: number
          orden: number
          paso: string
        }
        Insert: {
          descripcion?: string | null
          id?: number
          orden?: number
          paso: string
        }
        Update: {
          descripcion?: string | null
          id?: number
          orden?: number
          paso?: string
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
