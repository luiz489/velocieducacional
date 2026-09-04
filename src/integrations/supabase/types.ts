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
      aluno_autorizados_retirada: {
        Row: {
          aluno_id: string
          created_at: string
          escola_id: string
          id: string
          nome: string
          observacao: string | null
          telefone: string | null
        }
        Insert: {
          aluno_id: string
          created_at?: string
          escola_id: string
          id?: string
          nome: string
          observacao?: string | null
          telefone?: string | null
        }
        Update: {
          aluno_id?: string
          created_at?: string
          escola_id?: string
          id?: string
          nome?: string
          observacao?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aluno_autorizados_retirada_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_autorizados_retirada_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "v_documento_dados"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "aluno_autorizados_retirada_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_autorizados_retirada_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "aluno_autorizados_retirada_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
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
            foreignKeyName: "aluno_contratantes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "v_documento_dados"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "aluno_contratantes_contratante_id_fkey"
            columns: ["contratante_id"]
            isOneToOne: false
            referencedRelation: "contratantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_contratantes_contratante_id_fkey"
            columns: ["contratante_id"]
            isOneToOne: false
            referencedRelation: "v_documento_dados"
            referencedColumns: ["contratante_id"]
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
      aluno_matricula_dados: {
        Row: {
          aluno_id: string
          ano_letivo: number
          created_at: string
          doc_carteira_vacinacao: boolean | null
          doc_certidao_nascimento: boolean | null
          doc_comprovante_residencia: boolean | null
          doc_cpf: boolean | null
          doc_declaracao_transferencia: boolean | null
          doc_foto_3x4: boolean | null
          doc_historico_escolar: boolean | null
          escola_id: string
          id: string
          irmao_1_nome: string | null
          irmao_1_turma: string | null
          irmao_2_nome: string | null
          irmao_2_turma: string | null
          tem_irmaos_na_escola: boolean | null
          updated_at: string
        }
        Insert: {
          aluno_id: string
          ano_letivo: number
          created_at?: string
          doc_carteira_vacinacao?: boolean | null
          doc_certidao_nascimento?: boolean | null
          doc_comprovante_residencia?: boolean | null
          doc_cpf?: boolean | null
          doc_declaracao_transferencia?: boolean | null
          doc_foto_3x4?: boolean | null
          doc_historico_escolar?: boolean | null
          escola_id: string
          id?: string
          irmao_1_nome?: string | null
          irmao_1_turma?: string | null
          irmao_2_nome?: string | null
          irmao_2_turma?: string | null
          tem_irmaos_na_escola?: boolean | null
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          ano_letivo?: number
          created_at?: string
          doc_carteira_vacinacao?: boolean | null
          doc_certidao_nascimento?: boolean | null
          doc_comprovante_residencia?: boolean | null
          doc_cpf?: boolean | null
          doc_declaracao_transferencia?: boolean | null
          doc_foto_3x4?: boolean | null
          doc_historico_escolar?: boolean | null
          escola_id?: string
          id?: string
          irmao_1_nome?: string | null
          irmao_1_turma?: string | null
          irmao_2_nome?: string | null
          irmao_2_turma?: string | null
          tem_irmaos_na_escola?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aluno_matricula_dados_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_matricula_dados_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "v_documento_dados"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "aluno_matricula_dados_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluno_matricula_dados_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "aluno_matricula_dados_escola_id_fkey"
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
          contato_emergencia_2_nome: string | null
          contato_emergencia_2_telefone: string | null
          contato_emergencia_nome: string | null
          contato_emergencia_telefone: string | null
          escola_id: string
          id: string
          medicamento_qual: string | null
          necessidade_altas_habilidades: boolean
          necessidade_autismo: boolean
          necessidade_baixa_visao: boolean
          necessidade_cegueira: boolean
          necessidade_laudo_anexado: boolean
          necessidade_outras: string | null
          necessidade_sindrome_down: boolean
          necessidade_surdez_leve_moderada: boolean
          necessidade_surdez_severa_profunda: boolean
          necessidade_surdocegueira: boolean
          observacoes: string | null
          pediatra_nome: string | null
          pediatra_telefone: string | null
          plano_saude_qual: string | null
          portador_problema_saude: boolean | null
          possui_plano_saude: boolean | null
          problema_saude_qual: string | null
          usa_medicamento_controlado: boolean | null
        }
        Insert: {
          alergico?: boolean | null
          alergico_qual?: string | null
          aluno_id: string
          atualizado_em?: string
          contato_emergencia_2_nome?: string | null
          contato_emergencia_2_telefone?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          escola_id: string
          id?: string
          medicamento_qual?: string | null
          necessidade_altas_habilidades?: boolean
          necessidade_autismo?: boolean
          necessidade_baixa_visao?: boolean
          necessidade_cegueira?: boolean
          necessidade_laudo_anexado?: boolean
          necessidade_outras?: string | null
          necessidade_sindrome_down?: boolean
          necessidade_surdez_leve_moderada?: boolean
          necessidade_surdez_severa_profunda?: boolean
          necessidade_surdocegueira?: boolean
          observacoes?: string | null
          pediatra_nome?: string | null
          pediatra_telefone?: string | null
          plano_saude_qual?: string | null
          portador_problema_saude?: boolean | null
          possui_plano_saude?: boolean | null
          problema_saude_qual?: string | null
          usa_medicamento_controlado?: boolean | null
        }
        Update: {
          alergico?: boolean | null
          alergico_qual?: string | null
          aluno_id?: string
          atualizado_em?: string
          contato_emergencia_2_nome?: string | null
          contato_emergencia_2_telefone?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          escola_id?: string
          id?: string
          medicamento_qual?: string | null
          necessidade_altas_habilidades?: boolean
          necessidade_autismo?: boolean
          necessidade_baixa_visao?: boolean
          necessidade_cegueira?: boolean
          necessidade_laudo_anexado?: boolean
          necessidade_outras?: string | null
          necessidade_sindrome_down?: boolean
          necessidade_surdez_leve_moderada?: boolean
          necessidade_surdez_severa_profunda?: boolean
          necessidade_surdocegueira?: boolean
          observacoes?: string | null
          pediatra_nome?: string | null
          pediatra_telefone?: string | null
          plano_saude_qual?: string | null
          portador_problema_saude?: boolean | null
          possui_plano_saude?: boolean | null
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
            foreignKeyName: "aluno_saude_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: true
            referencedRelation: "v_documento_dados"
            referencedColumns: ["aluno_id"]
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
          hora_entrada: string | null
          hora_saida: string | null
          id: string
          naturalidade_cidade: string | null
          naturalidade_uf: string | null
          nome: string
          nome_mae: string | null
          nome_pai: string | null
          telefone_pai: string | null
          telefone_mae: string | null
          ra_censo: string | null
          responsavel_bairro: string | null
          responsavel_cep: string | null
          responsavel_cidade: string | null
          responsavel_conjuge: string | null
          responsavel_cpf: string | null
          responsavel_data_nascimento: string | null
          responsavel_estado_civil: string | null
          responsavel_financeiro: string
          responsavel_naturalidade_cidade: string | null
          responsavel_naturalidade_uf: string | null
          responsavel_nacionalidade: string | null
          responsavel_nome_pai: string | null
          responsavel_nome_mae: string | null
          responsavel_rg: string | null
          responsavel_rg_data_emissao: string | null
          responsavel_rg_orgao_emissor: string | null
          responsavel_uf: string | null
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
          hora_entrada?: string | null
          hora_saida?: string | null
          id?: string
          naturalidade_cidade?: string | null
          naturalidade_uf?: string | null
          nome: string
          nome_mae?: string | null
          nome_pai?: string | null
          telefone_pai?: string | null
          telefone_mae?: string | null
          ra_censo?: string | null
          responsavel_bairro?: string | null
          responsavel_cep?: string | null
          responsavel_cidade?: string | null
          responsavel_conjuge?: string | null
          responsavel_cpf?: string | null
          responsavel_data_nascimento?: string | null
          responsavel_estado_civil?: string | null
          responsavel_financeiro: string
          responsavel_naturalidade_cidade?: string | null
          responsavel_naturalidade_uf?: string | null
          responsavel_nacionalidade?: string | null
          responsavel_nome_pai?: string | null
          responsavel_nome_mae?: string | null
          responsavel_rg?: string | null
          responsavel_rg_data_emissao?: string | null
          responsavel_rg_orgao_emissor?: string | null
          responsavel_uf?: string | null
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
          hora_entrada?: string | null
          hora_saida?: string | null
          id?: string
          naturalidade_cidade?: string | null
          naturalidade_uf?: string | null
          nome?: string
          nome_mae?: string | null
          nome_pai?: string | null
          telefone_pai?: string | null
          telefone_mae?: string | null
          ra_censo?: string | null
          responsavel_bairro?: string | null
          responsavel_cep?: string | null
          responsavel_cidade?: string | null
          responsavel_conjuge?: string | null
          responsavel_cpf?: string | null
          responsavel_data_nascimento?: string | null
          responsavel_estado_civil?: string | null
          responsavel_financeiro?: string
          responsavel_naturalidade_cidade?: string | null
          responsavel_naturalidade_uf?: string | null
          responsavel_nacionalidade?: string | null
          responsavel_nome_pai?: string | null
          responsavel_nome_mae?: string | null
          responsavel_rg?: string | null
          responsavel_rg_data_emissao?: string | null
          responsavel_rg_orgao_emissor?: string | null
          responsavel_uf?: string | null
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
      atividades_turma: {
        Row: {
          created_at: string
          data: string
          descricao: string
          disciplina_id: string | null
          escola_id: string
          id: string
          turma_id: string
        }
        Insert: {
          created_at?: string
          data: string
          descricao: string
          disciplina_id?: string | null
          escola_id: string
          id?: string
          turma_id: string
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          disciplina_id?: string | null
          escola_id?: string
          id?: string
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_turma_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_turma_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_turma_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "atividades_turma_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "atividades_turma_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_bimestrais: {
        Row: {
          bimestre: number
          conceito: string | null
          created_at: string
          disciplina_id: string
          escola_id: string
          id: string
          matricula_id: string
          nota: number | null
          updated_at: string
        }
        Insert: {
          bimestre: number
          conceito?: string | null
          created_at?: string
          disciplina_id: string
          escola_id: string
          id?: string
          matricula_id: string
          nota?: number | null
          updated_at?: string
        }
        Update: {
          bimestre?: number
          conceito?: string | null
          created_at?: string
          disciplina_id?: string
          escola_id?: string
          id?: string
          matricula_id?: string
          nota?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_bimestrais_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_bimestrais_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_bimestrais_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "avaliacoes_bimestrais_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "avaliacoes_bimestrais_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_bimestrais_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "v_documento_dados"
            referencedColumns: ["matricula_id"]
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
      conselho_classe: {
        Row: {
          acoes_desenvolvidas: string | null
          assiduo: boolean | null
          autonomo: boolean | null
          bimestre: number
          comprometido: boolean | null
          created_at: string
          data_reuniao: string | null
          dificuldade_aprendizagem: boolean | null
          disciplina: string | null
          escola_id: string
          id: string
          indisciplinado: boolean | null
          matricula_id: string
          nao_faz_tarefas: boolean | null
          nao_respeita_regras: boolean | null
          participativo: boolean | null
          professor_nome: string | null
        }
        Insert: {
          acoes_desenvolvidas?: string | null
          assiduo?: boolean | null
          autonomo?: boolean | null
          bimestre: number
          comprometido?: boolean | null
          created_at?: string
          data_reuniao?: string | null
          dificuldade_aprendizagem?: boolean | null
          disciplina?: string | null
          escola_id: string
          id?: string
          indisciplinado?: boolean | null
          matricula_id: string
          nao_faz_tarefas?: boolean | null
          nao_respeita_regras?: boolean | null
          participativo?: boolean | null
          professor_nome?: string | null
        }
        Update: {
          acoes_desenvolvidas?: string | null
          assiduo?: boolean | null
          autonomo?: boolean | null
          bimestre?: number
          comprometido?: boolean | null
          created_at?: string
          data_reuniao?: string | null
          dificuldade_aprendizagem?: boolean | null
          disciplina?: string | null
          escola_id?: string
          id?: string
          indisciplinado?: boolean | null
          matricula_id?: string
          nao_faz_tarefas?: boolean | null
          nao_respeita_regras?: boolean | null
          participativo?: boolean | null
          professor_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conselho_classe_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conselho_classe_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "conselho_classe_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "conselho_classe_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conselho_classe_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "v_documento_dados"
            referencedColumns: ["matricula_id"]
          },
        ]
      }
      contas_a_pagar: {
        Row: {
          categoria: string
          competencia_ano: number | null
          competencia_mes: number | null
          competencia_referencia: string | null
          contrato_id: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          escola_id: string
          faturado: boolean
          faturado_em: string | null
          fornecedor: string
          fornecedor_id: string | null
          funcionario_id: string | null
          gateway_pagamento_id: string | null
          status_envio_banco: string
          enviado_em: string | null
          efetivado_em: string | null
          comprovante_url: string | null
          id: string
          professor_id: string | null
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria?: string
          competencia_ano?: number | null
          competencia_mes?: number | null
          competencia_referencia?: string | null
          contrato_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          escola_id: string
          faturado?: boolean
          faturado_em?: string | null
          fornecedor: string
          fornecedor_id?: string | null
          funcionario_id?: string | null
          gateway_pagamento_id?: string | null
          status_envio_banco?: string
          enviado_em?: string | null
          efetivado_em?: string | null
          comprovante_url?: string | null
          id?: string
          professor_id?: string | null
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          categoria?: string
          competencia_ano?: number | null
          competencia_mes?: number | null
          competencia_referencia?: string | null
          contrato_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          escola_id?: string
          faturado?: boolean
          faturado_em?: string | null
          fornecedor?: string
          fornecedor_id?: string | null
          funcionario_id?: string | null
          gateway_pagamento_id?: string | null
          status_envio_banco?: string
          enviado_em?: string | null
          efetivado_em?: string | null
          comprovante_url?: string | null
          id?: string
          professor_id?: string | null
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
          {
            foreignKeyName: "contas_a_pagar_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_a_pagar_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "v_pagamentos_funcionarios_export"
            referencedColumns: ["funcionario_id"]
          },
          {
            foreignKeyName: "contas_a_pagar_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_a_pagar_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "v_pagamentos_professores_export"
            referencedColumns: ["professor_id"]
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
          anexo_url: string | null
          categoria: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string
          dia_vencimento: number
          dia_faturamento_automatico: number | null
          escola_id: string
          fornecedor: string
          fornecedor_id: string | null
          id: string
          numero_contrato: string | null
          observacoes: string | null
          renovacao_automatica: boolean
          status: string
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          anexo_url?: string | null
          categoria?: string
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao: string
          dia_vencimento?: number
          dia_faturamento_automatico?: number | null
          escola_id: string
          fornecedor: string
          fornecedor_id?: string | null
          id?: string
          numero_contrato?: string | null
          observacoes?: string | null
          renovacao_automatica?: boolean
          status?: string
          updated_at?: string
          valor_mensal: number
        }
        Update: {
          anexo_url?: string | null
          categoria?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string
          dia_vencimento?: number
          dia_faturamento_automatico?: number | null
          escola_id?: string
          fornecedor?: string
          fornecedor_id?: string | null
          id?: string
          numero_contrato?: string | null
          observacoes?: string | null
          renovacao_automatica?: boolean
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
          area_conhecimento: string | null
          ativo: boolean
          carga_horaria: number
          codigo: string | null
          created_at: string
          descricao: string | null
          escola_id: string
          id: string
          nome: string
          tipo_avaliacao: string
          updated_at: string
        }
        Insert: {
          area_conhecimento?: string | null
          ativo?: boolean
          carga_horaria?: number
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          escola_id: string
          id?: string
          nome: string
          tipo_avaliacao?: string
          updated_at?: string
        }
        Update: {
          area_conhecimento?: string | null
          ativo?: boolean
          carga_horaria?: number
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          escola_id?: string
          id?: string
          nome?: string
          tipo_avaliacao?: string
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
      document_categorias: {
        Row: {
          id: string
          nome: string
        }
        Insert: {
          id?: string
          nome: string
        }
        Update: {
          id?: string
          nome?: string
        }
        Relationships: []
      }
      document_template_campos: {
        Row: {
          chave: string
          criado_em: string
          id: string
          obrigatorio: boolean
          opcoes_selecao: Json | null
          ordem: number
          origem: string
          rotulo: string
          template_id: string
          tipo_dado: string
          visivel: boolean
        }
        Insert: {
          chave: string
          criado_em?: string
          id?: string
          obrigatorio?: boolean
          opcoes_selecao?: Json | null
          ordem?: number
          origem?: string
          rotulo: string
          template_id: string
          tipo_dado?: string
          visivel?: boolean
        }
        Update: {
          chave?: string
          criado_em?: string
          id?: string
          obrigatorio?: boolean
          opcoes_selecao?: Json | null
          ordem?: number
          origem?: string
          rotulo?: string
          template_id?: string
          tipo_dado?: string
          visivel?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "document_template_campos_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          ativo: boolean
          atualizado_em: string
          categoria_id: string | null
          codigo: string
          corpo_html: string
          criado_em: string
          descricao: string | null
          escola_id: string | null
          fonte_dados: string
          id: string
          nome: string
          orientacao: string
          versao: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          categoria_id?: string | null
          codigo: string
          corpo_html: string
          criado_em?: string
          descricao?: string | null
          escola_id?: string | null
          fonte_dados?: string
          id?: string
          nome: string
          orientacao?: string
          versao?: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          categoria_id?: string | null
          codigo?: string
          corpo_html?: string
          criado_em?: string
          descricao?: string | null
          escola_id?: string | null
          fonte_dados?: string
          id?: string
          nome?: string
          orientacao?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "document_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "document_templates_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
        ]
      }
      documentos_gerados: {
        Row: {
          aluno_id: string | null
          escola_id: string
          gerado_em: string
          gerado_por: string | null
          id: string
          template_id: string
          valores_utilizados: Json
        }
        Insert: {
          aluno_id?: string | null
          escola_id: string
          gerado_em?: string
          gerado_por?: string | null
          id?: string
          template_id: string
          valores_utilizados: Json
        }
        Update: {
          aluno_id?: string | null
          escola_id?: string
          gerado_em?: string
          gerado_por?: string | null
          id?: string
          template_id?: string
          valores_utilizados?: Json
        }
        Relationships: [
          {
            foreignKeyName: "documentos_gerados_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_gerados_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "v_documento_dados"
            referencedColumns: ["aluno_id"]
          },
          {
            foreignKeyName: "documentos_gerados_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_gerados_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "documentos_gerados_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "documentos_gerados_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
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
          campos_matricula_visiveis: Json
          cep: string | null
          cidade: string | null
          dia_faturamento_automatico: number | null
          cnpj: string | null
          criado_em: string
          email: string | null
          endereco: string | null
          grupo_economico_id: string | null
          id: string
          logo_url: string | null
          modelo_avaliacao: string
          nome: string
          razao_social: string | null
          telefone: string | null
          uf: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          bairro?: string | null
          campos_matricula_visiveis?: Json
          cep?: string | null
          cidade?: string | null
          dia_faturamento_automatico?: number | null
          cnpj?: string | null
          criado_em?: string
          email?: string | null
          endereco?: string | null
          grupo_economico_id?: string | null
          id?: string
          logo_url?: string | null
          modelo_avaliacao?: string
          nome: string
          razao_social?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          bairro?: string | null
          campos_matricula_visiveis?: Json
          cep?: string | null
          cidade?: string | null
          dia_faturamento_automatico?: number | null
          cnpj?: string | null
          criado_em?: string
          email?: string | null
          endereco?: string | null
          grupo_economico_id?: string | null
          id?: string
          logo_url?: string | null
          modelo_avaliacao?: string
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
      fichas_descritivas: {
        Row: {
          atualizado_em: string
          bimestre: number | null
          escola_id: string
          id: string
          matricula_id: string
          professor_nome: string | null
          texto: string | null
        }
        Insert: {
          atualizado_em?: string
          bimestre?: number | null
          escola_id: string
          id?: string
          matricula_id: string
          professor_nome?: string | null
          texto?: string | null
        }
        Update: {
          atualizado_em?: string
          bimestre?: number | null
          escola_id?: string
          id?: string
          matricula_id?: string
          professor_nome?: string | null
          texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fichas_descritivas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_descritivas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "fichas_descritivas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "fichas_descritivas_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_descritivas_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "v_documento_dados"
            referencedColumns: ["matricula_id"]
          },
        ]
      }
      escolas_integracao_bancaria: {
        Row: {
          agencia: string
          ambiente: string
          ativo: boolean
          banco: string
          chave_pix: string
          codigo_acesso: string
          codigo_beneficiario: string
          conta_corrente: string
          criado_em: string
          escola_id: string
          id: string
          posto: string
          x_api_key: string
          atualizado_em: string
        }
        Insert: {
          agencia: string
          ambiente?: string
          ativo?: boolean
          banco?: string
          chave_pix: string
          codigo_acesso: string
          codigo_beneficiario: string
          conta_corrente: string
          criado_em?: string
          escola_id: string
          id?: string
          posto: string
          x_api_key: string
          atualizado_em?: string
        }
        Update: {
          agencia?: string
          ambiente?: string
          ativo?: boolean
          banco?: string
          chave_pix?: string
          codigo_acesso?: string
          codigo_beneficiario?: string
          conta_corrente?: string
          criado_em?: string
          escola_id?: string
          id?: string
          posto?: string
          x_api_key?: string
          atualizado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "escolas_integracao_bancaria_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: true
            referencedRelation: "escolas"
            referencedColumns: ["id"]
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
          faturado: boolean
          faturado_em: string | null
          gateway_cobranca_id: string | null
          link_pagamento: string | null
          pix_qr_code: string | null
          boleto_linha_digitavel: string | null
          id: string
          matricula_id: string
          status: string
          tipo: string
          updated_at: string
          valor: number
          valor_integral: number | null
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          escola_id: string
          faturado?: boolean
          faturado_em?: string | null
          gateway_cobranca_id?: string | null
          link_pagamento?: string | null
          pix_qr_code?: string | null
          boleto_linha_digitavel?: string | null
          id?: string
          matricula_id: string
          status?: string
          tipo?: string
          updated_at?: string
          valor: number
          valor_integral?: number | null
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          escola_id?: string
          faturado?: boolean
          faturado_em?: string | null
          gateway_cobranca_id?: string | null
          link_pagamento?: string | null
          pix_qr_code?: string | null
          boleto_linha_digitavel?: string | null
          id?: string
          matricula_id?: string
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
          valor_integral?: number | null
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
          {
            foreignKeyName: "financeiro_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "v_documento_dados"
            referencedColumns: ["matricula_id"]
          },
        ]
      }
      frequencia_bimestral: {
        Row: {
          bimestre: number
          created_at: string
          disciplina_id: string | null
          escola_id: string
          faltas_compensadas: number
          faltas_nao_compensadas: number
          id: string
          matricula_id: string
        }
        Insert: {
          bimestre: number
          created_at?: string
          disciplina_id?: string | null
          escola_id: string
          faltas_compensadas?: number
          faltas_nao_compensadas?: number
          id?: string
          matricula_id: string
        }
        Update: {
          bimestre?: number
          created_at?: string
          disciplina_id?: string | null
          escola_id?: string
          faltas_compensadas?: number
          faltas_nao_compensadas?: number
          id?: string
          matricula_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "frequencia_bimestral_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencia_bimestral_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencia_bimestral_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "frequencia_bimestral_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "frequencia_bimestral_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencia_bimestral_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "v_documento_dados"
            referencedColumns: ["matricula_id"]
          },
        ]
      }
      funcionario_dependentes: {
        Row: {
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          escola_id: string
          funcionario_id: string
          id: string
          nome: string
          parentesco: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          escola_id: string
          funcionario_id: string
          id?: string
          nome: string
          parentesco: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          escola_id?: string
          funcionario_id?: string
          id?: string
          nome?: string
          parentesco?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionario_dependentes_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionario_dependentes_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "funcionario_dependentes_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "funcionario_dependentes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionario_dependentes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "v_pagamentos_funcionarios_export"
            referencedColumns: ["funcionario_id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          agencia: string | null
          ativo: boolean
          banco: string | null
          bairro: string | null
          categoria: string | null
          cep: string | null
          chave_pix: string | null
          cidade: string | null
          cnpj_cpf: string | null
          conta: string | null
          created_at: string
          email: string | null
          endereco: string | null
          escola_id: string
          id: string
          nome: string
          observacoes: string | null
          razao_social: string | null
          telefone: string | null
          tipo_conta: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          bairro?: string | null
          categoria?: string | null
          cep?: string | null
          chave_pix?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          conta?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          escola_id: string
          id?: string
          nome: string
          observacoes?: string | null
          razao_social?: string | null
          telefone?: string | null
          tipo_conta?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          bairro?: string | null
          categoria?: string | null
          cep?: string | null
          chave_pix?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          conta?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          escola_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          razao_social?: string | null
          telefone?: string | null
          tipo_conta?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          agencia: string | null
          ativo: boolean
          bairro: string | null
          banco_codigo: string | null
          banco_nome: string | null
          cargo: string
          categoria_esocial: string
          cep: string | null
          chave_pix: string | null
          cidade: string | null
          codigo_cbo: string | null
          conta: string | null
          cor_raca: string | null
          cpf: string
          created_at: string
          ctps_numero: string | null
          ctps_serie: string | null
          data_admissao: string
          data_demissao: string | null
          data_inicio_funcao: string | null
          data_nascimento: string | null
          data_vigencia_salario: string | null
          departamento: string | null
          dia_pagamento: number | null
          email: string | null
          endereco: string | null
          escola_id: string
          estado_civil: string | null
          foto_url: string | null
          funcao: string | null
          grau_instrucao: string | null
          horario_trabalho: string | null
          id: string
          jornada_semanal_horas: number | null
          nacionalidade: string | null
          naturalidade_cidade: string | null
          naturalidade_uf: string | null
          nome: string
          nome_mae: string | null
          nome_pai: string | null
          observacoes: string | null
          pis_pasep: string | null
          plano_saude: number | null
          rg: string | null
          rg_orgao_emissor: string | null
          salario_base: number
          sexo: string | null
          telefone: string | null
          tipo_conta: string | null
          tipo_contrato: string
          uf: string | null
          updated_at: string
          vale_refeicao: number | null
          vale_transporte: number | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          bairro?: string | null
          banco_codigo?: string | null
          banco_nome?: string | null
          cargo: string
          categoria_esocial?: string
          cep?: string | null
          chave_pix?: string | null
          cidade?: string | null
          codigo_cbo?: string | null
          conta?: string | null
          cor_raca?: string | null
          cpf: string
          created_at?: string
          ctps_numero?: string | null
          ctps_serie?: string | null
          data_admissao: string
          data_demissao?: string | null
          data_inicio_funcao?: string | null
          data_nascimento?: string | null
          data_vigencia_salario?: string | null
          departamento?: string | null
          dia_pagamento?: number | null
          email?: string | null
          endereco?: string | null
          escola_id: string
          estado_civil?: string | null
          foto_url?: string | null
          funcao?: string | null
          grau_instrucao?: string | null
          horario_trabalho?: string | null
          id?: string
          jornada_semanal_horas?: number | null
          nacionalidade?: string | null
          naturalidade_cidade?: string | null
          naturalidade_uf?: string | null
          nome: string
          nome_mae?: string | null
          nome_pai?: string | null
          observacoes?: string | null
          pis_pasep?: string | null
          plano_saude?: number | null
          rg?: string | null
          rg_orgao_emissor?: string | null
          salario_base?: number
          sexo?: string | null
          telefone?: string | null
          tipo_conta?: string | null
          tipo_contrato?: string
          uf?: string | null
          updated_at?: string
          vale_refeicao?: number | null
          vale_transporte?: number | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          bairro?: string | null
          banco_codigo?: string | null
          banco_nome?: string | null
          cargo?: string
          categoria_esocial?: string
          cep?: string | null
          chave_pix?: string | null
          cidade?: string | null
          codigo_cbo?: string | null
          conta?: string | null
          cor_raca?: string | null
          cpf?: string
          created_at?: string
          ctps_numero?: string | null
          ctps_serie?: string | null
          data_admissao?: string
          data_demissao?: string | null
          data_inicio_funcao?: string | null
          data_nascimento?: string | null
          data_vigencia_salario?: string | null
          departamento?: string | null
          dia_pagamento?: number | null
          email?: string | null
          endereco?: string | null
          escola_id?: string
          estado_civil?: string | null
          foto_url?: string | null
          funcao?: string | null
          grau_instrucao?: string | null
          horario_trabalho?: string | null
          id?: string
          jornada_semanal_horas?: number | null
          nacionalidade?: string | null
          naturalidade_cidade?: string | null
          naturalidade_uf?: string | null
          nome?: string
          nome_mae?: string | null
          nome_pai?: string | null
          observacoes?: string | null
          pis_pasep?: string | null
          plano_saude?: number | null
          rg?: string | null
          rg_orgao_emissor?: string | null
          salario_base?: number
          sexo?: string | null
          telefone?: string | null
          tipo_conta?: string | null
          tipo_contrato?: string
          uf?: string | null
          updated_at?: string
          vale_refeicao?: number | null
          vale_transporte?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "funcionarios_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
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
          {
            foreignKeyName: "horarios_aulas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "v_pagamentos_professores_export"
            referencedColumns: ["professor_id"]
          },
        ]
      }
      matriculas: {
        Row: {
          aluno_id: string
          bolsa_100: boolean
          created_at: string
          data_ingresso: string
          data_vencimento_matricula: string | null
          parcelas_taxa_matricula: number
          escola_id: string
          id: string
          percentual_desconto: number | null
          status_pagamento: string
          turma_id: string
          updated_at: string
        }
        Insert: {
          aluno_id: string
          bolsa_100?: boolean
          created_at?: string
          data_ingresso?: string
          data_vencimento_matricula?: string | null
          parcelas_taxa_matricula?: number
          escola_id: string
          id?: string
          percentual_desconto?: number | null
          status_pagamento?: string
          turma_id: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          bolsa_100?: boolean
          created_at?: string
          data_ingresso?: string
          data_vencimento_matricula?: string | null
          parcelas_taxa_matricula?: number
          escola_id?: string
          id?: string
          percentual_desconto?: number | null
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
            foreignKeyName: "matriculas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "v_documento_dados"
            referencedColumns: ["aluno_id"]
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
          base_curricular: string | null
          carga_horaria_total: number | null
          categoria_id: string | null
          coordenador_responsavel: string | null
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
          base_curricular?: string | null
          carga_horaria_total?: number | null
          categoria_id?: string | null
          coordenador_responsavel?: string | null
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
          base_curricular?: string | null
          carga_horaria_total?: number | null
          categoria_id?: string | null
          coordenador_responsavel?: string | null
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
            foreignKeyName: "ocorrencias_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "v_documento_dados"
            referencedColumns: ["aluno_id"]
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
          {
            foreignKeyName: "ocorrencias_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "v_pagamentos_professores_export"
            referencedColumns: ["professor_id"]
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
          bairro: string | null
          categoria: string
          cep: string | null
          cidade: string
          cnpj_cpf: string | null
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
          bairro?: string | null
          categoria?: string
          cep?: string | null
          cidade: string
          cnpj_cpf?: string | null
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
          bairro?: string | null
          categoria?: string
          cep?: string | null
          cidade?: string
          cnpj_cpf?: string | null
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
          {
            foreignKeyName: "pedagogico_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "v_documento_dados"
            referencedColumns: ["matricula_id"]
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
      plataforma_configuracoes: {
        Row: {
          id: string
          nome_empresa: string
          razao_social: string | null
          cnpj: string | null
          endereco: string | null
          cidade: string | null
          uf: string | null
          cep: string | null
          telefone: string | null
          email: string | null
          atualizado_em: string
        }
        Insert: {
          id?: string
          nome_empresa?: string
          razao_social?: string | null
          cnpj?: string | null
          endereco?: string | null
          cidade?: string | null
          uf?: string | null
          cep?: string | null
          telefone?: string | null
          email?: string | null
          atualizado_em?: string
        }
        Update: {
          id?: string
          nome_empresa?: string
          razao_social?: string | null
          cnpj?: string | null
          endereco?: string | null
          cidade?: string | null
          uf?: string | null
          cep?: string | null
          telefone?: string | null
          email?: string | null
          atualizado_em?: string
        }
        Relationships: []
      }
      saas_orcamentos: {
        Row: {
          id: string
          nome_prospect: string
          contato_nome: string | null
          contato_email: string | null
          contato_telefone: string | null
          plano_id: string | null
          valor_implantacao: number
          parcelas_implantacao: number
          valor_mensal_negociado: number | null
          validade_ate: string | null
          status: string
          observacoes: string | null
          criado_em: string
          criado_por: string | null
        }
        Insert: {
          id?: string
          nome_prospect: string
          contato_nome?: string | null
          contato_email?: string | null
          contato_telefone?: string | null
          plano_id?: string | null
          valor_implantacao?: number
          parcelas_implantacao?: number
          valor_mensal_negociado?: number | null
          validade_ate?: string | null
          status?: string
          observacoes?: string | null
          criado_em?: string
          criado_por?: string | null
        }
        Update: {
          id?: string
          nome_prospect?: string
          contato_nome?: string | null
          contato_email?: string | null
          contato_telefone?: string | null
          plano_id?: string | null
          valor_implantacao?: number
          parcelas_implantacao?: number
          valor_mensal_negociado?: number | null
          validade_ate?: string | null
          status?: string
          observacoes?: string | null
          criado_em?: string
          criado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_orcamentos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_saas"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_contratos: {
        Row: {
          id: string
          escola_id: string | null
          orcamento_id: string | null
          numero_contrato: string | null
          razao_social_contratante: string
          cnpj_contratante: string | null
          endereco_contratante: string | null
          cidade_contratante: string | null
          uf_contratante: string | null
          responsavel_nome: string | null
          responsavel_cpf: string | null
          plano_id: string | null
          valor_implantacao: number
          parcelas_implantacao: number
          valor_mensal: number
          dia_vencimento: number
          data_inicio: string
          status: string
          texto_contrato: string | null
          criado_em: string
          criado_por: string | null
        }
        Insert: {
          id?: string
          escola_id?: string | null
          orcamento_id?: string | null
          numero_contrato?: string | null
          razao_social_contratante: string
          cnpj_contratante?: string | null
          endereco_contratante?: string | null
          cidade_contratante?: string | null
          uf_contratante?: string | null
          responsavel_nome?: string | null
          responsavel_cpf?: string | null
          plano_id?: string | null
          valor_implantacao?: number
          parcelas_implantacao?: number
          valor_mensal: number
          dia_vencimento?: number
          data_inicio?: string
          status?: string
          texto_contrato?: string | null
          criado_em?: string
          criado_por?: string | null
        }
        Update: {
          id?: string
          escola_id?: string | null
          orcamento_id?: string | null
          numero_contrato?: string | null
          razao_social_contratante?: string
          cnpj_contratante?: string | null
          endereco_contratante?: string | null
          cidade_contratante?: string | null
          uf_contratante?: string | null
          responsavel_nome?: string | null
          responsavel_cpf?: string | null
          plano_id?: string | null
          valor_implantacao?: number
          parcelas_implantacao?: number
          valor_mensal?: number
          dia_vencimento?: number
          data_inicio?: string
          status?: string
          texto_contrato?: string | null
          criado_em?: string
          criado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_contratos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_contratos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_saas"
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
          {
            foreignKeyName: "professor_disciplinas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "v_pagamentos_professores_export"
            referencedColumns: ["professor_id"]
          },
        ]
      }
      professores: {
        Row: {
          agencia: string | null
          ativo: boolean
          bairro: string | null
          banco_codigo: string | null
          banco_nome: string | null
          cep: string | null
          chave_pix: string | null
          cidade: string | null
          cnpj: string | null
          conta: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          data_nascimento: string | null
          dia_pagamento: number | null
          disciplinas: string[]
          email: string | null
          endereco: string | null
          escola_id: string
          formacao: string | null
          foto_url: string | null
          id: string
          nome: string
          observacoes: string | null
          razao_social: string | null
          rg: string | null
          telefone: string | null
          tipo_conta: string | null
          tipo_contratacao: string
          uf: string | null
          updated_at: string
          valor_mensal: number | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          bairro?: string | null
          banco_codigo?: string | null
          banco_nome?: string | null
          cep?: string | null
          chave_pix?: string | null
          cidade?: string | null
          cnpj?: string | null
          conta?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          dia_pagamento?: number | null
          disciplinas?: string[]
          email?: string | null
          endereco?: string | null
          escola_id: string
          formacao?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          razao_social?: string | null
          rg?: string | null
          telefone?: string | null
          tipo_conta?: string | null
          tipo_contratacao?: string
          uf?: string | null
          updated_at?: string
          valor_mensal?: number | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          bairro?: string | null
          banco_codigo?: string | null
          banco_nome?: string | null
          cep?: string | null
          chave_pix?: string | null
          cidade?: string | null
          cnpj?: string | null
          conta?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          dia_pagamento?: number | null
          disciplinas?: string[]
          email?: string | null
          endereco?: string | null
          escola_id?: string
          formacao?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          razao_social?: string | null
          rg?: string | null
          telefone?: string | null
          tipo_conta?: string | null
          tipo_contratacao?: string
          uf?: string | null
          updated_at?: string
          valor_mensal?: number | null
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
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recuperacoes_semestrais: {
        Row: {
          created_at: string
          disciplina_id: string
          escola_id: string
          id: string
          matricula_id: string
          nota: number | null
          semestre: number
        }
        Insert: {
          created_at?: string
          disciplina_id: string
          escola_id: string
          id?: string
          matricula_id: string
          nota?: number | null
          semestre: number
        }
        Update: {
          created_at?: string
          disciplina_id?: string
          escola_id?: string
          id?: string
          matricula_id?: string
          nota?: number | null
          semestre?: number
        }
        Relationships: [
          {
            foreignKeyName: "recuperacoes_semestrais_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recuperacoes_semestrais_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recuperacoes_semestrais_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_resumo"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "recuperacoes_semestrais_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_por_escola"
            referencedColumns: ["escola_id"]
          },
          {
            foreignKeyName: "recuperacoes_semestrais_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recuperacoes_semestrais_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "v_documento_dados"
            referencedColumns: ["matricula_id"]
          },
        ]
      }
      rematriculas: {
        Row: {
          aluno_id: string
          ano_letivo_destino: number
          bolsa_100: boolean
          created_at: string
          data_abertura: string
          data_conclusao: string | null
          escola_id: string
          id: string
          observacoes: string | null
          percentual_desconto: number | null
          status: string
          turma_destino_id: string | null
          updated_at: string
        }
        Insert: {
          aluno_id: string
          ano_letivo_destino: number
          bolsa_100?: boolean
          created_at?: string
          data_abertura?: string
          data_conclusao?: string | null
          escola_id: string
          id?: string
          observacoes?: string | null
          percentual_desconto?: number | null
          status?: string
          turma_destino_id?: string | null
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          ano_letivo_destino?: number
          bolsa_100?: boolean
          created_at?: string
          data_abertura?: string
          data_conclusao?: string | null
          escola_id?: string
          id?: string
          observacoes?: string | null
          percentual_desconto?: number | null
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
          professor_regente_id: string | null
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
          professor_regente_id?: string | null
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
          professor_regente_id?: string | null
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
          {
            foreignKeyName: "turmas_professor_regente_id_fkey"
            columns: ["professor_regente_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_professor_regente_id_fkey"
            columns: ["professor_regente_id"]
            isOneToOne: false
            referencedRelation: "v_pagamentos_professores_export"
            referencedColumns: ["professor_id"]
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
            foreignKeyName: "fk_usuarios_escolas_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      v_professores_seguro: {
        Row: {
          id: string
          nome: string
          email: string | null
          telefone: string | null
          formacao: string | null
          disciplinas: string[] | null
          data_admissao: string | null
          observacoes: string | null
          ativo: boolean
          created_at: string
          updated_at: string
          escola_id: string
          tipo_contratacao: string | null
          foto_url: string | null
          endereco: string | null
          cep: string | null
          bairro: string | null
          cidade: string | null
          uf: string | null
          cpf: string | null
          rg: string | null
          cnpj: string | null
          razao_social: string | null
          data_nascimento: string | null
          banco_codigo: string | null
          banco_nome: string | null
          agencia: string | null
          conta: string | null
          tipo_conta: string | null
          chave_pix: string | null
          valor_mensal: number | null
          dia_pagamento: number | null
        }
        Relationships: []
      }
      v_funcionarios_seguro: {
        Row: {
          id: string
          escola_id: string
          nome: string
          sexo: string | null
          estado_civil: string | null
          nome_mae: string | null
          nome_pai: string | null
          nacionalidade: string | null
          naturalidade_cidade: string | null
          naturalidade_uf: string | null
          cor_raca: string | null
          grau_instrucao: string | null
          endereco: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          uf: string | null
          telefone: string | null
          email: string | null
          categoria_esocial: string | null
          cargo: string | null
          funcao: string | null
          codigo_cbo: string | null
          departamento: string | null
          data_inicio_funcao: string | null
          tipo_contrato: string | null
          data_admissao: string | null
          data_demissao: string | null
          jornada_semanal_horas: number | null
          horario_trabalho: string | null
          ativo: boolean
          observacoes: string | null
          created_at: string
          updated_at: string
          foto_url: string | null
          cpf: string | null
          rg: string | null
          rg_orgao_emissor: string | null
          data_nascimento: string | null
          pis_pasep: string | null
          ctps_numero: string | null
          ctps_serie: string | null
          salario_base: number | null
          data_vigencia_salario: string | null
          dia_pagamento: number | null
          vale_transporte: number | null
          vale_refeicao: number | null
          plano_saude: number | null
          banco_codigo: string | null
          banco_nome: string | null
          agencia: string | null
          conta: string | null
          tipo_conta: string | null
          chave_pix: string | null
        }
        Relationships: []
      }
      v_boletim_bimestral: {
        Row: {
          aluno_id: string | null
          disciplina: string | null
          disciplina_id: string | null
          matricula_id: string | null
          nota_b1: number | null
          nota_b2: number | null
          nota_b3: number | null
          nota_b4: number | null
          recuperacao_1sem: number | null
          recuperacao_2sem: number | null
          resultado_1sem: number | null
          resultado_2sem: number | null
          tipo_avaliacao: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_bimestrais_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_bimestrais_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_bimestrais_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "v_documento_dados"
            referencedColumns: ["matricula_id"]
          },
          {
            foreignKeyName: "matriculas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "v_documento_dados"
            referencedColumns: ["aluno_id"]
          },
        ]
      }
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
      v_documento_dados: {
        Row: {
          aluno_cpf: string | null
          aluno_id: string | null
          ano: number | null
          bolsa_100: boolean | null
          contratante_bairro: string | null
          contratante_cep: string | null
          contratante_cidade: string | null
          contratante_conjuge: string | null
          contratante_cpf: string | null
          contratante_data_nascimento: string | null
          contratante_email: string | null
          contratante_endereco: string | null
          contratante_estado_civil: string | null
          contratante_id: string | null
          contratante_naturalidade_cidade: string | null
          contratante_naturalidade_uf: string | null
          contratante_nacionalidade: string | null
          contratante_nome_pai: string | null
          contratante_nome_mae: string | null
          contratante_nome: string | null
          contratante_rg: string | null
          contratante_rg_data_emissao: string | null
          contratante_rg_orgao: string | null
          contratante_telefone: string | null
          contratante_uf: string | null
          data_nascimento: string | null
          dia_vencimento: number | null
          diretor_cargo: string | null
          diretor_nome: string | null
          ensino_padrao: string | null
          escola_cidade: string | null
          escola_cnpj: string | null
          escola_cep: string | null
          escola_endereco: string | null
          escola_id: string | null
          escola_nome: string | null
          escola_telefone: string | null
          escola_uf: string | null
          matricula_id: string | null
          naturalidade_cidade: string | null
          naturalidade_uf: string | null
          nome: string | null
          nome_mae: string | null
          nome_pai: string | null
          numero_parcelas: number | null
          percentual_desconto: number | null
          ra_censo: string | null
          serie: string | null
          taxa_matricula: number | null
          turno: string | null
          valor_anual_sem_desconto: number | null
          valor_anual_sem_desconto_extenso: string | null
          valor_mensalidade: number | null
          valor_mensalidade_extenso: string | null
          valor_mensalidade_com_desconto: number | null
          valor_mensalidade_com_desconto_extenso: string | null
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
      v_pagamentos_funcionarios_export: {
        Row: {
          agencia: string | null
          banco_codigo: string | null
          banco_nome: string | null
          cargo: string | null
          chave_pix: string | null
          competencia_ano: number | null
          competencia_mes: number | null
          conta: string | null
          conta_id: string | null
          cpf: string | null
          data_vencimento: string | null
          escola_id: string | null
          funcionario_id: string | null
          funcionario_nome: string | null
          status: string | null
          tipo_conta: string | null
          valor: number | null
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
        ]
      }
      v_pagamentos_professores_export: {
        Row: {
          agencia: string | null
          banco_codigo: string | null
          banco_nome: string | null
          chave_pix: string | null
          cnpj: string | null
          competencia_ano: number | null
          competencia_mes: number | null
          conta: string | null
          conta_id: string | null
          data_vencimento: string | null
          escola_id: string | null
          professor_id: string | null
          professor_nome: string | null
          razao_social: string | null
          status: string | null
          tipo_conta: string | null
          valor: number | null
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
      atualizar_status_assinaturas: {
        Args: never
        Returns: {
          escola_nome: string
          motivo: string
          status_anterior: string
          status_novo: string
        }[]
      }
      clonar_papeis_modelo_para_escola: {
        Args: { p_escola_id: string }
        Returns: undefined
      }
      atualizar_filial: {
        Args: {
          p_filial_id: string; p_nome: string; p_cnpj?: string; p_cidade?: string; p_uf?: string;
          p_endereco?: string; p_cep?: string; p_telefone?: string; p_email?: string; p_ativo: boolean;
          p_razao_social?: string
        }
        Returns: undefined
      }
      criar_filial: {
        Args: {
          p_cep?: string
          p_cidade?: string
          p_cnpj?: string
          p_email?: string
          p_endereco?: string
          p_escola_origem_id: string
          p_nome_filial: string
          p_razao_social?: string
          p_telefone?: string
          p_uf?: string
        }
        Returns: string
      }
      criar_novo_cliente_saas: {
        Args: {
          p_dias_trial?: number
          p_nome_escola: string
          p_plano_id: string
        }
        Returns: string
      }
      fn_data_por_extenso: { Args: { p_data?: string }; Returns: string }
      fn_numero_por_extenso: { Args: { n: number }; Returns: string }
      fn_tri_extenso: { Args: { n: number }; Returns: string }
      fn_valor_por_extenso: { Args: { p_valor: number }; Returns: string }
      gerar_documento: {
        Args: {
          p_aluno_id: string
          p_template_id: string
          p_valores_manuais?: Json
        }
        Returns: string
      }
      estornar_faturamento_titulos: {
        Args: { p_ids: string[] }
        Returns: number
      }
      baixar_titulo_por_cobranca_bancaria: {
        Args: { p_gateway_cobranca_id: string; p_valor_pago: number; p_data_pagamento: string }
        Returns: string
      }
      confirmar_pagamento_bancario: {
        Args: { p_gateway_pagamento_id: string; p_comprovante_url?: string }
        Returns: string
      }
      estornar_faturamento_conta_a_pagar: {
        Args: { p_ids: string[] }
        Returns: number
      }
      faturar_contas_a_pagar: {
        Args: { p_ids: string[] }
        Returns: number
      }
      gerar_conta_a_pagar_contrato: {
        Args: { p_contrato_id: string; p_mes: number; p_ano: number; p_faturar_imediatamente?: boolean }
        Returns: string
      }
      processar_faturamento_automatico_contratos: {
        Args: Record<PropertyKey, never>
        Returns: { contrato_descricao: string; resultado: string }[]
      }
      faturar_titulos: {
        Args: { p_ids: string[] }
        Returns: number
      }
      processar_faturamento_automatico: {
        Args: Record<PropertyKey, never>
        Returns: { escola_nome: string; titulos_faturados: number }[]
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
      gerar_pagamentos_funcionarios:
        | {
            Args: { p_ano?: number; p_escola_id: string; p_mes?: number }
            Returns: {
              out_conta_id: string
              out_funcionario_id: string
              out_funcionario_nome: string
              out_valor: number
            }[]
          }
        | {
            Args: { p_ano?: number; p_mes?: number }
            Returns: {
              out_conta_id: string
              out_funcionario_id: string
              out_funcionario_nome: string
              out_valor: number
            }[]
          }
      gerar_pagamentos_professores_pj:
        | {
            Args: { p_ano?: number; p_escola_id: string; p_mes?: number }
            Returns: {
              out_conta_id: string
              out_professor_id: string
              out_professor_nome: string
              out_valor: number
            }[]
          }
        | {
            Args: { p_ano?: number; p_mes?: number }
            Returns: {
              out_conta_id: string
              out_professor_id: string
              out_professor_nome: string
              out_valor: number
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
      provisionar_nova_escola: {
        Args: {
          p_cidade?: string
          p_cnpj?: string
          p_email?: string
          p_nome: string
          p_telefone?: string
          p_uf?: string
        }
        Returns: string
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
      vincular_administrador_escola: {
        Args: { p_escola_id: string; p_user_email: string }
        Returns: undefined
      }
      vincular_usuario_a_escola: {
        Args: { p_email: string; p_escola_id: string; p_papel_id: string }
        Returns: undefined
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
