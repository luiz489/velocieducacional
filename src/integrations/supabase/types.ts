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
      alunos: {
        Row: {
          cpf: string
          created_at: string
          data_nascimento: string
          email_responsavel: string | null
          endereco: string | null
          id: string
          nome: string
          responsavel_financeiro: string
          status: string
          telefone_responsavel: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cpf: string
          created_at?: string
          data_nascimento: string
          email_responsavel?: string | null
          endereco?: string | null
          id?: string
          nome: string
          responsavel_financeiro: string
          status?: string
          telefone_responsavel?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cpf?: string
          created_at?: string
          data_nascimento?: string
          email_responsavel?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          responsavel_financeiro?: string
          status?: string
          telefone_responsavel?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      aprovadores: {
        Row: {
          ativo: boolean
          cargo: string
          created_at: string
          email: string | null
          id: string
          nome: string
          updated_at: string
          valor_max_aprovacao: number
        }
        Insert: {
          ativo?: boolean
          cargo: string
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          updated_at?: string
          valor_max_aprovacao?: number
        }
        Update: {
          ativo?: boolean
          cargo?: string
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          updated_at?: string
          valor_max_aprovacao?: number
        }
        Relationships: []
      }
      contas_a_pagar: {
        Row: {
          categoria: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          fornecedor: string
          id: string
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          fornecedor: string
          id?: string
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          fornecedor?: string
          id?: string
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      contratos: {
        Row: {
          categoria: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string
          dia_vencimento: number
          fornecedor: string
          id: string
          observacoes: string | null
          status: string
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao: string
          dia_vencimento?: number
          fornecedor: string
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_mensal: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string
          dia_vencimento?: number
          fornecedor?: string
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: []
      }
      cotacoes: {
        Row: {
          condicao_pagamento: string | null
          created_at: string
          fornecedor: string
          id: string
          observacoes: string | null
          prazo_entrega: string | null
          quantidade: number
          selecionada: boolean
          solicitacao_id: string
          updated_at: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          condicao_pagamento?: string | null
          created_at?: string
          fornecedor: string
          id?: string
          observacoes?: string | null
          prazo_entrega?: string | null
          quantidade?: number
          selecionada?: boolean
          solicitacao_id: string
          updated_at?: string
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          condicao_pagamento?: string | null
          created_at?: string
          fornecedor?: string
          id?: string
          observacoes?: string | null
          prazo_entrega?: string | null
          quantidade?: number
          selecionada?: boolean
          solicitacao_id?: string
          updated_at?: string
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinas: {
        Row: {
          ativo: boolean
          carga_horaria: number
          codigo: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          carga_horaria?: number
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          carga_horaria?: number
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      financeiro: {
        Row: {
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          id: string
          matricula_id: string
          status: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          id?: string
          matricula_id: string
          status?: string
          tipo?: string
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          id?: string
          matricula_id?: string
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculas: {
        Row: {
          aluno_id: string
          created_at: string
          data_ingresso: string
          id: string
          status_pagamento: string
          turma_id: string
          updated_at: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data_ingresso?: string
          id?: string
          status_pagamento?: string
          turma_id: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data_ingresso?: string
          id?: string
          status_pagamento?: string
          turma_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      matriz_disciplinas: {
        Row: {
          carga_horaria: number
          created_at: string
          disciplina_id: string
          id: string
          matriz_id: string
          ordem: number
        }
        Insert: {
          carga_horaria?: number
          created_at?: string
          disciplina_id: string
          id?: string
          matriz_id: string
          ordem?: number
        }
        Update: {
          carga_horaria?: number
          created_at?: string
          disciplina_id?: string
          id?: string
          matriz_id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "matriz_disciplinas_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriz_disciplinas_matriz_id_fkey"
            columns: ["matriz_id"]
            isOneToOne: false
            referencedRelation: "matrizes_curriculares"
            referencedColumns: ["id"]
          },
        ]
      }
      matrizes_curriculares: {
        Row: {
          ano_letivo: number
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          serie: string
          turno: string
          updated_at: string
        }
        Insert: {
          ano_letivo: number
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          serie: string
          turno?: string
          updated_at?: string
        }
        Update: {
          ano_letivo?: number
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          serie?: string
          turno?: string
          updated_at?: string
        }
        Relationships: []
      }
      ocorrencias: {
        Row: {
          aluno_id: string
          created_at: string
          data_ocorrencia: string
          descricao: string
          id: string
          registrado_por: string | null
          tipo: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data_ocorrencia?: string
          descricao: string
          id?: string
          registrado_por?: string | null
          tipo?: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data_ocorrencia?: string
          descricao?: string
          id?: string
          registrado_por?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      parceiros: {
        Row: {
          ativo: boolean
          categoria: string
          cidade: string
          created_at: string
          descricao: string | null
          email: string | null
          endereco: string | null
          estado: string
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          telefone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          cidade: string
          created_at?: string
          descricao?: string | null
          email?: string | null
          endereco?: string | null
          estado: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          telefone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string
          cidade?: string
          created_at?: string
          descricao?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          telefone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      pedagogico: {
        Row: {
          av1: number | null
          av2: number | null
          created_at: string
          disciplina: string
          frequencia_percentual: number | null
          id: string
          matricula_id: string
          recuperacao: number | null
          updated_at: string
        }
        Insert: {
          av1?: number | null
          av2?: number | null
          created_at?: string
          disciplina: string
          frequencia_percentual?: number | null
          id?: string
          matricula_id: string
          recuperacao?: number | null
          updated_at?: string
        }
        Update: {
          av1?: number | null
          av2?: number | null
          created_at?: string
          disciplina?: string
          frequencia_percentual?: number | null
          id?: string
          matricula_id?: string
          recuperacao?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedagogico_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      solicitacoes_compra: {
        Row: {
          aprovador_id: string | null
          created_at: string
          data_aprovacao: string | null
          data_necessidade: string | null
          departamento: string
          descricao: string
          id: string
          justificativa: string | null
          motivo_rejeicao: string | null
          numero_solicitacao: number
          observacoes: string | null
          solicitante: string
          status: string
          updated_at: string
          urgencia: string
          valor_estimado: number
        }
        Insert: {
          aprovador_id?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_necessidade?: string | null
          departamento?: string
          descricao: string
          id?: string
          justificativa?: string | null
          motivo_rejeicao?: string | null
          numero_solicitacao?: number
          observacoes?: string | null
          solicitante: string
          status?: string
          updated_at?: string
          urgencia?: string
          valor_estimado?: number
        }
        Update: {
          aprovador_id?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_necessidade?: string | null
          departamento?: string
          descricao?: string
          id?: string
          justificativa?: string | null
          motivo_rejeicao?: string | null
          numero_solicitacao?: number
          observacoes?: string | null
          solicitante?: string
          status?: string
          updated_at?: string
          urgencia?: string
          valor_estimado?: number
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_compra_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "aprovadores"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          ano_letivo: number
          created_at: string
          id: string
          nome: string
          sala: string | null
          turno: string
          updated_at: string
          vagas_totais: number
        }
        Insert: {
          ano_letivo: number
          created_at?: string
          id?: string
          nome: string
          sala?: string | null
          turno: string
          updated_at?: string
          vagas_totais?: number
        }
        Update: {
          ano_letivo?: number
          created_at?: string
          id?: string
          nome?: string
          sala?: string | null
          turno?: string
          updated_at?: string
          vagas_totais?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff"
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
      app_role: ["admin", "staff"],
    },
  },
} as const
