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
      alertas: {
        Row: {
          created_at: string
          custo_anterior: number
          custo_atual: number
          fornecedor: string | null
          id: string
          lido: boolean
          part_number: string | null
          produto: string
          tipo: string
          variacao_percentual: number
        }
        Insert: {
          created_at?: string
          custo_anterior: number
          custo_atual: number
          fornecedor?: string | null
          id?: string
          lido?: boolean
          part_number?: string | null
          produto: string
          tipo: string
          variacao_percentual: number
        }
        Update: {
          created_at?: string
          custo_anterior?: number
          custo_atual?: number
          fornecedor?: string | null
          id?: string
          lido?: boolean
          part_number?: string | null
          produto?: string
          tipo?: string
          variacao_percentual?: number
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          id?: string
          updated_at?: string
          valor: string
        }
        Update: {
          chave?: string
          id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      cotacoes: {
        Row: {
          canal: string
          cotacao_grupo: string | null
          created_at: string
          custo: number
          estoque: string | null
          fornecedor: string | null
          id: string
          link: string | null
          marca: string | null
          part_number: string | null
          prazo: string | null
          preco_15: number
          preco_20: number
          produto: string
          uf: string | null
          vendedor: string
        }
        Insert: {
          canal: string
          cotacao_grupo?: string | null
          created_at?: string
          custo: number
          estoque?: string | null
          fornecedor?: string | null
          id?: string
          link?: string | null
          marca?: string | null
          part_number?: string | null
          prazo?: string | null
          preco_15: number
          preco_20: number
          produto: string
          uf?: string | null
          vendedor: string
        }
        Update: {
          canal?: string
          cotacao_grupo?: string | null
          created_at?: string
          custo?: number
          estoque?: string | null
          fornecedor?: string | null
          id?: string
          link?: string | null
          marca?: string | null
          part_number?: string | null
          prazo?: string | null
          preco_15?: number
          preco_20?: number
          produto?: string
          uf?: string | null
          vendedor?: string
        }
        Relationships: []
      }
      lista_mix: {
        Row: {
          ativo: boolean
          created_at: string
          custo: number
          fornecedor: string | null
          id: string
          link: string | null
          marca: string | null
          part_number: string | null
          preco_15: number
          preco_20: number
          produto: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          custo: number
          fornecedor?: string | null
          id?: string
          link?: string | null
          marca?: string | null
          part_number?: string | null
          preco_15: number
          preco_20: number
          produto: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          custo?: number
          fornecedor?: string | null
          id?: string
          link?: string | null
          marca?: string | null
          part_number?: string | null
          preco_15?: number
          preco_20?: number
          produto?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          id: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      promocoes: {
        Row: {
          ativo: boolean
          created_at: string
          data_fim: string | null
          data_inicio: string
          desconto_percentual: number | null
          descricao: string | null
          id: string
          imagem_url: string | null
          preco_promocional: number | null
          produto_id: string | null
          titulo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          desconto_percentual?: number | null
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          preco_promocional?: number | null
          produto_id?: string | null
          titulo: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          desconto_percentual?: number | null
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          preco_promocional?: number | null
          produto_id?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "promocoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "lista_mix"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios_semanais: {
        Row: {
          alertas_aumento: number
          alertas_queda: number
          cotacoes_por_dia: Json
          created_at: string
          data_fim: string
          data_inicio: string
          fornecedor_top: string | null
          id: string
          lista_mix_atualizados: number
          lista_mix_total: number
          ticket_medio: number
          top_marcas: Json
          top_produtos: Json
          total_cotacoes: number
          variacao_vs_anterior: number
        }
        Insert: {
          alertas_aumento?: number
          alertas_queda?: number
          cotacoes_por_dia?: Json
          created_at?: string
          data_fim: string
          data_inicio: string
          fornecedor_top?: string | null
          id?: string
          lista_mix_atualizados?: number
          lista_mix_total?: number
          ticket_medio?: number
          top_marcas?: Json
          top_produtos?: Json
          total_cotacoes?: number
          variacao_vs_anterior?: number
        }
        Update: {
          alertas_aumento?: number
          alertas_queda?: number
          cotacoes_por_dia?: Json
          created_at?: string
          data_fim?: string
          data_inicio?: string
          fornecedor_top?: string | null
          id?: string
          lista_mix_atualizados?: number
          lista_mix_total?: number
          ticket_medio?: number
          top_marcas?: Json
          top_produtos?: Json
          total_cotacoes?: number
          variacao_vs_anterior?: number
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
      vendedores: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      vendor_permissions: {
        Row: {
          can_see_lista_mix: boolean
          can_see_promocoes: boolean
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          can_see_lista_mix?: boolean
          can_see_promocoes?: boolean
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          can_see_lista_mix?: boolean
          can_see_promocoes?: boolean
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
    }
    Enums: {
      app_role: "admin" | "vendedor" | "espectador"
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
      app_role: ["admin", "vendedor", "espectador"],
    },
  },
} as const
