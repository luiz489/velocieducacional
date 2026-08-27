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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      aluno_contratantes: {
        Row: {
          aluno_id: string
          contratante_id: string
          escola_id: string
          id: string
          principal: boolean
        }
        Insert: {
          aluno_id: string
          contratante_id: string
          escola_id: string
          id?: string
          principal?: boolean
        }
        Update: {
          aluno_id?: string
          contratante_id?: string
          escola_id?: string
          id?: string
          principal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "aluno_contratantes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_contratantes_contratante_id_fkey"
            columns: ["contratante_id"]
            isOneToOne: false
            referencedRelation: "contratantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_contratantes_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_contratantes_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "aluno_contratantes_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      aluno_saude: {
        Row: {
          alergico: boolean | null
          alergico_qual: string | null
          aluno_id: string
          atualizado_em: string
          contato_emergencia_nome: string | null
          contato_emergencia_telefone: string | null
          escola_id: string
          id: string
          medicamento_qual: string | null
          observacoes: string | null
          portador_problema_saude: boolean | null
          problema_saude_qual: string | null
          usa_medicamento_controlado: boolean | null
        }
        Insert: {
          alergico?: boolean | null
          alergico_qual?: string | null
          aluno_id: string
          atualizado_em?: string
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          escola_id: string
          id?: string
          medicamento_qual?: string | null
          observacoes?: string | null
          portador_problema_saude?: boolean | null
          problema_saude_qual?: string | null
          usa_medicamento_controlado?: boolean | null
        }
        Update: {
          alergico?: boolean | null
          alergico_qual?: string | null
          aluno_id?: string
          atualizado_em?: string
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          escola_id?: string
          id?: string
          medicamento_qual?: string | null
          observacoes?: string | null
          portador_problema_saude?: boolean | null
          problema_saude_qual?: string | null
          usa_medicamento_controlado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "aluno_saude_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: true
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_saude_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_saude_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "aluno_saude_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      alunos: {
        Row: {
          cor_raca: string | null
          cpf: string
          created_at: string
          data_nascimento: string
          email_responsavel: string | null
          endereco: string | null
          escola_id: string
          id: string
          naturalidade_cidade: string | null
          naturalidade_uf: string | null
          nome: string
          nome_mae: string | null
          nome_pai: string | null
          responsavel_financeiro: string
          status: string
          telefone_responsavel: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cor_raca?: string | null
          cpf: string
          created_at?: string
          data_nascimento: string
          email_responsavel?: string | null
          endereco?: string | null
          escola_id: string
          id?: string
          naturalidade_cidade?: string | null
          naturalidade_uf?: string | null
          nome: string
          nome_mae?: string | null
          nome_pai?: string | null
          responsavel_financeiro: string
          status?: string
          telefone_responsavel?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cor_raca?: string | null
          cpf?: string
          created_at?: string
          data_nascimento?: string
          email_responsavel?: string | null
          endereco?: string | null
          escola_id?: string
          id?: string
          naturalidade_cidade?: string | null
          naturalidade_uf?: string | null
          nome?: string
          nome_mae?: string | null
          nome_pai?: string | null
          responsavel_financeiro?: string
          status?: string
          telefone_responsavel?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alunos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "alunos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      aprovadores: {
        Row: {
          ativo: boolean
          cargo: string
          created_at: string
          email: string | null
          escola_id: string
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
          escola_id: string
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
          escola_id?: string
          id?: string
          nome?: string
          updated_at?: string
          valor_max_aprovacao?: number
        }
        Relationships: [
          {
            foreignKeyName: "aprovadores_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aprovadores_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "aprovadores_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      avisos: {
        Row: {
          anexo_url: string | null
          anonimo: boolean
          autor: string | null
          canal: string
          created_at: string
          destinatario_aluno_id: string | null
          escola_id: string
          id: string
          mensagem: string
          prioridade: string
          publicado: boolean
          publicado_em: string
          titulo: string
          updated_at: string
        }
        Insert: {
          anexo_url?: string | null
          anonimo?: boolean
          autor?: string | null
          canal?: string
          created_at?: string
          destinatario_aluno_id?: string | null
          escola_id: string
          id?: string
          mensagem: string
          prioridade?: string
          publicado?: boolean
          publicado_em?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          anexo_url?: string | null
          anonimo?: boolean
          autor?: string | null
          canal?: string
          created_at?: string
          destinatario_aluno_id?: string | null
          escola_id?: string
          id?: string
          mensagem?: string
          prioridade?: string
          publicado?: boolean
          publicado_em?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "avisos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      carteirinhas: {
        Row: {
          aluno_id: string
          codigo: string
          created_at: string
          emitida_em: string
          escola_id: string
          foto_url: string | null
          id: string
          qr_data: string | null
          status: string
          updated_at: string
          validade: string
        }
        Insert: {
          aluno_id: string
          codigo: string
          created_at?: string
          emitida_em?: string
          escola_id: string
          foto_url?: string | null
          id?: string
          qr_data?: string | null
          status?: string
          updated_at?: string
          validade: string
        }
        Update: {
          aluno_id?: string
          codigo?: string
          created_at?: string
          emitida_em?: string
          escola_id?: string
          foto_url?: string | null
          id?: string
          qr_data?: string | null
          status?: string
          updated_at?: string
          validade?: string
        }
        Relationships: [
          {
            foreignKeyName: "carteirinhas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carteirinhas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "carteirinhas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      categorias: {
        Row: {
          diretor_cargo: string | null
          diretor_nome: string | null
          escola_id: string
          id: string
          nome: string
          nome_padrao_documento: string | null
          ordem: number | null
        }
        Insert: {
          diretor_cargo?: string | null
          diretor_nome?: string | null
          escola_id: string
          id?: string
          nome: string
          nome_padrao_documento?: string | null
          ordem?: number | null
        }
        Update: {
          diretor_cargo?: string | null
          diretor_nome?: string | null
          escola_id?: string
          id?: string
          nome?: string
          nome_padrao_documento?: string | null
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categorias_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "categorias_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      contas_a_pagar: {
        Row: {
          categoria: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          escola_id: string
          fornecedor: string
          fornecedor_id: string | null
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
          escola_id: string
          fornecedor: string
          fornecedor_id?: string | null
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
          escola_id?: string
          fornecedor?: string
          fornecedor_id?: string | null
          id?: string
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_a_pagar_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_a_pagar_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "contas_a_pagar_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "contas_a_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      contratantes: {
        Row: {
          atualizado_em: string
          cpf: string | null
          criado_em: string
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          escola_id: string
          id: string
          nome: string
          profissao: string | null
          rg: string | null
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string
          cpf?: string | null
          criado_em?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          escola_id: string
          id?: string
          nome: string
          profissao?: string | null
          rg?: string | null
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string
          cpf?: string | null
          criado_em?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          escola_id?: string
          id?: string
          nome?: string
          profissao?: string | null
          rg?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratantes_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratantes_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "contratantes_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      contratos: {
        Row: {
          categoria: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string
          dia_vencimento: number
          escola_id: string
          fornecedor: string
          fornecedor_id: string | null
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
          escola_id: string
          fornecedor: string
          fornecedor_id?: string | null
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
          escola_id?: string
          fornecedor?: string
          fornecedor_id?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "contratos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "contratos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes: {
        Row: {
          condicao_pagamento: string | null
          created_at: string
          escola_id: string
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
          escola_id: string
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
          escola_id?: string
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
            foreignKeyName: "cotacoes_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "cotacoes_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
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
          escola_id: string
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
          escola_id: string
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
          escola_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "disciplinas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      escola_assinaturas: {
        Row: {
          atualizado_em: string
          criado_em: string
          data_cancelamento: string | null
          data_fim_trial: string | null
          data_inicio: string
          dia_vencimento: number
          escola_id: string
          id: string
          plano_id: string
          status: string
          valor_mensal_contratado: number | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          data_cancelamento?: string | null
          data_fim_trial?: string | null
          data_inicio?: string
          dia_vencimento?: number
          escola_id: string
          id?: string
          plano_id: string
          status?: string
          valor_mensal_contratado?: number | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          data_cancelamento?: string | null
          data_fim_trial?: string | null
          data_inicio?: string
          dia_vencimento?: number
          escola_id?: string
          id?: string
          plano_id?: string
          status?: string
          valor_mensal_contratado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "escola_assinaturas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: true
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escola_assinaturas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: true
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "escola_assinaturas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: true
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "escola_assinaturas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_saas"
            referencedColumns: ["id"]
          },
        ]
      }
      escolas: {
        Row: {
          ativo: boolean
          atualizado_em: string
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          criado_em: string
          email: string | null
          endereco: string | null
          grupo_economico_id: string | null
          id: string
          logo_url: string | null
          nome: string
          razao_social: string | null
          telefone: string | null
          uf: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          criado_em?: string
          email?: string | null
          endereco?: string | null
          grupo_economico_id?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          razao_social?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          criado_em?: string
          email?: string | null
          endereco?: string | null
          grupo_economico_id?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          razao_social?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escolas_grupo_economico_id_fkey"
            columns: ["grupo_economico_id"]
            isOneToOne: false
            referencedRelation: "grupos_economicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escolas_grupo_economico_id_fkey"
            columns: ["grupo_economico_id"]
            isOneToOne: false
            referencedRelation: "v_consolidado_grupo"
            referencedColumns: ["grupo_id"]
          },
        ]
      }
      eventos_calendario: {
        Row: {
          cor: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          escola_id: string
          id: string
          publico_alvo: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          cor?: string
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          escola_id: string
          id?: string
          publico_alvo?: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          cor?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          escola_id?: string
          id?: string
          publico_alvo?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_calendario_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_calendario_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "eventos_calendario_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      faturas_saas: {
        Row: {
          assinatura_id: string
          competencia_ano: number
          competencia_mes: number
          criado_em: string
          data_pagamento: string | null
          data_vencimento: string
          escola_id: string
          id: string
          nota_fiscal_url: string | null
          status: string
          valor: number
        }
        Insert: {
          assinatura_id: string
          competencia_ano: number
          competencia_mes: number
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento: string
          escola_id: string
          id?: string
          nota_fiscal_url?: string | null
          status?: string
          valor: number
        }
        Update: {
          assinatura_id?: string
          competencia_ano?: number
          competencia_mes?: number
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento?: string
          escola_id?: string
          id?: string
          nota_fiscal_url?: string | null
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturas_saas_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "escola_assinaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_saas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_saas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "faturas_saas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      financeiro: {
        Row: {
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          escola_id: string
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
          escola_id: string
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
          escola_id?: string
          id?: string
          matricula_id?: string
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "financeiro_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "financeiro_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_economicos: {
        Row: {
          cnpj_mantenedora: string | null
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          cnpj_mantenedora?: string | null
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          cnpj_mantenedora?: string | null
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      horarios_aulas: {
        Row: {
          ano_letivo: number
          created_at: string
          dia_semana: number
          disciplina_id: string | null
          disciplina_texto_legado: string
          escola_id: string
          hora_fim: string
          hora_inicio: string
          id: string
          professor: string | null
          professor_id: string | null
          sala: string | null
          turma_id: string
          updated_at: string
        }
        Insert: {
          ano_letivo: number
          created_at?: string
          dia_semana: number
          disciplina_id?: string | null
          disciplina_texto_legado: string
          escola_id: string
          hora_fim: string
          hora_inicio: string
          id?: string
          professor?: string | null
          professor_id?: string | null
          sala?: string | null
          turma_id: string
          updated_at?: string
        }
        Update: {
          ano_letivo?: number
          created_at?: string
          dia_semana?: number
          disciplina_id?: string | null
          disciplina_texto_legado?: string
          escola_id?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          professor?: string | null
          professor_id?: string | null
          sala?: string | null
          turma_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_horarios_aulas_turma"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horarios_aulas_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horarios_aulas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horarios_aulas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "horarios_aulas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "horarios_aulas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculas: {
        Row: {
          aluno_id: string
          created_at: string
          data_ingresso: string
          escola_id: string
          id: string
          status_pagamento: string
          turma_id: string
          updated_at: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data_ingresso?: string
          escola_id: string
          id?: string
          status_pagamento?: string
          turma_id: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data_ingresso?: string
          escola_id?: string
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
            foreignKeyName: "matriculas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "matriculas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
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
          escola_id: string
          id: string
          matriz_id: string
          ordem: number
        }
        Insert: {
          carga_horaria?: number
          created_at?: string
          disciplina_id: string
          escola_id: string
          id?: string
          matriz_id: string
          ordem?: number
        }
        Update: {
          carga_horaria?: number
          created_at?: string
          disciplina_id?: string
          escola_id?: string
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
            foreignKeyName: "matriz_disciplinas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriz_disciplinas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "matriz_disciplinas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
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
          escola_id: string
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
          escola_id: string
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
          escola_id?: string
          id?: string
          nome?: string
          serie?: string
          turno?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matrizes_curriculares_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matrizes_curriculares_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "matrizes_curriculares_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      modulos_sistema: {
        Row: {
          codigo: string
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          codigo: string
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          codigo?: string
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: []
      }
      ocorrencias: {
        Row: {
          aluno_id: string
          created_at: string
          data_ocorrencia: string
          descricao: string
          escola_id: string
          id: string
          professor_id: string | null
          registrado_por: string | null
          tipo: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data_ocorrencia?: string
          descricao: string
          escola_id: string
          id?: string
          professor_id?: string | null
          registrado_por?: string | null
          tipo?: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data_ocorrencia?: string
          descricao?: string
          escola_id?: string
          id?: string
          professor_id?: string | null
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
          {
            foreignKeyName: "ocorrencias_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "ocorrencias_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "ocorrencias_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
        ]
      }
      papeis: {
        Row: {
          criado_em: string
          descricao: string | null
          escola_id: string | null
          id: string
          nome: string
          papel_sistema: boolean
        }
        Insert: {
          criado_em?: string
          descricao?: string | null
          escola_id?: string | null
          id?: string
          nome: string
          papel_sistema?: boolean
        }
        Update: {
          criado_em?: string
          descricao?: string | null
          escola_id?: string | null
          id?: string
          nome?: string
          papel_sistema?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "papeis_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "papeis_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "papeis_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      papel_permissoes: {
        Row: {
          papel_id: string
          permissao_id: string
        }
        Insert: {
          papel_id: string
          permissao_id: string
        }
        Update: {
          papel_id?: string
          permissao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "papel_permissoes_papel_id_fkey"
            columns: ["papel_id"]
            isOneToOne: false
            referencedRelation: "papeis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "papel_permissoes_permissao_id_fkey"
            columns: ["permissao_id"]
            isOneToOne: false
            referencedRelation: "permissoes"
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
          escola_id: string
          estado: string
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          telefone: string | null
          tipo: string
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
          escola_id: string
          estado: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          telefone?: string | null
          tipo?: string
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
          escola_id?: string
          estado?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          telefone?: string | null
          tipo?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parceiros_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parceiros_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "parceiros_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      pedagogico: {
        Row: {
          av1: number | null
          av2: number | null
          created_at: string
          disciplina: string
          disciplina_id: string | null
          escola_id: string
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
          disciplina_id?: string | null
          escola_id: string
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
          disciplina_id?: string | null
          escola_id?: string
          frequencia_percentual?: number | null
          id?: string
          matricula_id?: string
          recuperacao?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedagogico_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedagogico_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedagogico_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "pedagogico_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "pedagogico_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes: {
        Row: {
          acao: string
          descricao: string | null
          id: string
          modulo_id: string
        }
        Insert: {
          acao: string
          descricao?: string | null
          id?: string
          modulo_id: string
        }
        Update: {
          acao?: string
          descricao?: string | null
          id?: string
          modulo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos_sistema"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_financeiros_turma: {
        Row: {
          criado_em: string
          dia_vencimento: number
          escola_id: string
          id: string
          numero_parcelas: number
          taxa_matricula: number | null
          turma_id: string
          valor_mensalidade: number
        }
        Insert: {
          criado_em?: string
          dia_vencimento?: number
          escola_id: string
          id?: string
          numero_parcelas?: number
          taxa_matricula?: number | null
          turma_id: string
          valor_mensalidade: number
        }
        Update: {
          criado_em?: string
          dia_vencimento?: number
          escola_id?: string
          id?: string
          numero_parcelas?: number
          taxa_matricula?: number | null
          turma_id?: string
          valor_mensalidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "planos_financeiros_turma_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_financeiros_turma_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "planos_financeiros_turma_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "planos_financeiros_turma_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: true
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_saas: {
        Row: {
          ativo: boolean
          criado_em: string
          descricao: string | null
          id: string
          limite_alunos: number | null
          limite_usuarios: number
          modulos_incluidos: Json
          nome: string
          valor_mensal: number
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          descricao?: string | null
          id?: string
          limite_alunos?: number | null
          limite_usuarios: number
          modulos_incluidos?: Json
          nome: string
          valor_mensal: number
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          descricao?: string | null
          id?: string
          limite_alunos?: number | null
          limite_usuarios?: number
          modulos_incluidos?: Json
          nome?: string
          valor_mensal?: number
        }
        Relationships: []
      }
      professor_disciplinas: {
        Row: {
          disciplina_id: string
          escola_id: string
          professor_id: string
        }
        Insert: {
          disciplina_id: string
          escola_id: string
          professor_id: string
        }
        Update: {
          disciplina_id?: string
          escola_id?: string
          professor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professor_disciplinas_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professor_disciplinas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professor_disciplinas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "professor_disciplinas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "professor_disciplinas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
        ]
      }
      professores: {
        Row: {
          ativo: boolean
          cpf: string | null
          created_at: string
          data_admissao: string | null
          disciplinas: string[]
          email: string | null
          escola_id: string
          formacao: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          disciplinas?: string[]
          email?: string | null
          escola_id: string
          formacao?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          disciplinas?: string[]
          email?: string | null
          escola_id?: string
          formacao?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professores_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professores_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "professores_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
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
      rematriculas: {
        Row: {
          aluno_id: string
          ano_letivo_destino: number
          created_at: string
          data_abertura: string
          data_conclusao: string | null
          escola_id: string
          id: string
          observacoes: string | null
          status: string
          turma_destino_id: string | null
          updated_at: string
        }
        Insert: {
          aluno_id: string
          ano_letivo_destino: number
          created_at?: string
          data_abertura?: string
          data_conclusao?: string | null
          escola_id: string
          id?: string
          observacoes?: string | null
          status?: string
          turma_destino_id?: string | null
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          ano_letivo_destino?: number
          created_at?: string
          data_abertura?: string
          data_conclusao?: string | null
          escola_id?: string
          id?: string
          observacoes?: string | null
          status?: string
          turma_destino_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rematriculas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rematriculas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "rematriculas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      solicitacoes_compra: {
        Row: {
          aprovador_id: string | null
          created_at: string
          data_aprovacao: string | null
          data_necessidade: string | null
          departamento: string
          descricao: string
          escola_id: string
          fornecedor_id: string | null
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
          escola_id: string
          fornecedor_id?: string | null
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
          escola_id?: string
          fornecedor_id?: string | null
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
          {
            foreignKeyName: "solicitacoes_compra_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_compra_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "solicitacoes_compra_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "solicitacoes_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      superadmins_erp: {
        Row: {
          criado_em: string
          nome: string | null
          user_id: string
        }
        Insert: {
          criado_em?: string
          nome?: string | null
          user_id: string
        }
        Update: {
          criado_em?: string
          nome?: string | null
          user_id?: string
        }
        Relationships: []
      }
      turmas: {
        Row: {
          ano_letivo: number
          categoria_id: string | null
          created_at: string
          escola_id: string
          id: string
          nome: string
          sala: string | null
          turno: string
          updated_at: string
          vagas_totais: number
        }
        Insert: {
          ano_letivo: number
          categoria_id?: string | null
          created_at?: string
          escola_id: string
          id?: string
          nome: string
          sala?: string | null
          turno: string
          updated_at?: string
          vagas_totais?: number
        }
        Update: {
          ano_letivo?: number
          categoria_id?: string | null
          created_at?: string
          escola_id?: string
          id?: string
          nome?: string
          sala?: string | null
          turno?: string
          updated_at?: string
          vagas_totais?: number
        }
        Relationships: [
          {
            foreignKeyName: "turmas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "turmas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
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
      usuarios_escolas: {
        Row: {
          ativo: boolean
          criado_em: string
          escola_id: string
          id: string
          papel_id: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          escola_id: string
          id?: string
          papel_id: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          escola_id?: string
          id?: string
          papel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_escolas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_escolas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "usuarios_escolas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "usuarios_escolas_papel_id_fkey"
            columns: ["papel_id"]
            isOneToOne: false
            referencedRelation: "papeis"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_clientes_resumo: {
        Row: {
          alunos_ativos: number | null
          cidade: string | null
          data_fim_trial: string | null
          data_inicio: string | null
          dia_vencimento: number | null
          escola_ativa: boolean | null
          escola_id: string | null
          escola_nome: string | null
          limite_alunos: number | null
          limite_usuarios: number | null
          plano_atual: string | null
          status_assinatura: string | null
          uf: string | null
          usuarios_ativos: number | null
          valor_mensal: number | null
        }
        Relationships: []
      }
      v_consolidado_grupo: {
        Row: {
          grupo_id: string | null
          grupo_nome: string | null
          inadimplencia_consolidada: number | null
          qtd_escolas: number | null
          receita_consolidada_mes: number | null
          total_alunos_ativos: number | null
          total_matriculas: number | null
          total_usuarios: number | null
        }
        Relationships: []
      }
      v_distribuicao_por_plano: {
        Row: {
          plano: string | null
          qtd_clientes: number | null
          receita_do_plano: number | null
        }
        Relationships: []
      }
      v_faturamento_saas_mensal: {
        Row: {
          competencia_ano: number | null
          competencia_mes: number | null
          qtd_faturas: number | null
          qtd_inadimplentes: number | null
          valor_em_aberto: number | null
          valor_inadimplente: number | null
          valor_recebido: number | null
          valor_total: number | null
        }
        Relationships: []
      }
      v_kpis_por_escola: {
        Row: {
          alunos_ativos: number | null
          escola_id: string | null
          escola_nome: string | null
          grupo_economico_id: string | null
          inadimplencia_atual: number | null
          receita_mes_atual: number | null
          total_matriculas: number | null
          usuarios_ativos: number | null
        }
        Insert: {
          alunos_ativos?: never
          escola_id?: string | null
          escola_nome?: string | null
          grupo_economico_id?: string | null
          inadimplencia_atual?: never
          receita_mes_atual?: never
          total_matriculas?: never
          usuarios_ativos?: never
        }
        Update: {
          alunos_ativos?: never
          escola_id?: string | null
          escola_nome?: string | null
          grupo_economico_id?: string | null
          inadimplencia_atual?: never
          receita_mes_atual?: never
          total_matriculas?: never
          usuarios_ativos?: never
        }
        Relationships: [
          {
            foreignKeyName: "escolas_grupo_economico_id_fkey"
            columns: ["grupo_economico_id"]
            isOneToOne: false
            referencedRelation: "grupos_economicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escolas_grupo_economico_id_fkey"
            columns: ["grupo_economico_id"]
            isOneToOne: false
            referencedRelation: "v_consolidado_grupo"
            referencedColumns: ["grupo_id"]
          },
        ]
      }
      v_plataforma_overview: {
        Row: {
          em_trial: number | null
          escolas_ativas: number | null
          escolas_suspensas: number | null
          inadimplentes: number | null
          mrr_atual: number | null
          total_alunos_plataforma: number | null
          total_usuarios_plataforma: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      bootstrap_admin: { Args: never; Returns: boolean }
      clonar_papeis_modelo_para_escola: {
        Args: { p_escola_id: string }
        Returns: undefined
      }
      criar_novo_cliente_saas: {
        Args: {
          p_dias_trial?: number
          p_nome_escola: string
          p_plano_id: string
        }
        Returns: string
      }
      gerar_faturas_do_mes: {
        Args: { p_ano?: number; p_mes?: number }
        Returns: {
          escola_id: string
          escola_nome: string
          fatura_id: string
          valor: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_superadmin_erp: { Args: { p_user_id: string }; Returns: boolean }
      mudar_plano_cliente: {
        Args: {
          p_escola_id: string
          p_novo_plano_id: string
          p_valor_negociado?: number
        }
        Returns: undefined
      }
      plataforma_clientes_resumo: {
        Args: never
        Returns: {
          alunos_ativos: number | null
          cidade: string | null
          data_fim_trial: string | null
          data_inicio: string | null
          dia_vencimento: number | null
          escola_ativa: boolean | null
          escola_id: string | null
          escola_nome: string | null
          limite_alunos: number | null
          limite_usuarios: number | null
          plano_atual: string | null
          status_assinatura: string | null
          uf: string | null
          usuarios_ativos: number | null
          valor_mensal: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_clientes_resumo"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      plataforma_distribuicao_por_plano: {
        Args: never
        Returns: {
          plano: string | null
          qtd_clientes: number | null
          receita_do_plano: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_distribuicao_por_plano"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      plataforma_faturas: {
        Args: { p_ano?: number; p_mes?: number; p_status?: string }
        Returns: {
          competencia_ano: number
          competencia_mes: number
          criado_em: string
          data_pagamento: string
          data_vencimento: string
          escola_id: string
          escola_nome: string
          id: string
          status: string
          valor: number
        }[]
      }
      plataforma_overview: {
        Args: never
        Returns: {
          em_trial: number | null
          escolas_ativas: number | null
          escolas_suspensas: number | null
          inadimplentes: number | null
          mrr_atual: number | null
          total_alunos_plataforma: number | null
          total_usuarios_plataforma: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_plataforma_overview"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      reativar_cliente_saas: {
        Args: { p_escola_id: string }
        Returns: undefined
      }
      suspender_cliente_saas: {
        Args: { p_escola_id: string; p_motivo?: string }
        Returns: undefined
      }
      usuario_tem_acesso_escola: {
        Args: { p_escola_id: string }
        Returns: boolean
      }
      usuario_tem_permissao: {
        Args: { p_acao: string; p_escola_id: string; p_modulo_codigo: string }
        Returns: boolean
      }
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
