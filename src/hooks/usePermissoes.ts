import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";

type ParPermissao = { modulo_codigo: string; acao: string };
export type Acao = "visualizar" | "criar" | "editar" | "excluir";

/**
 * Permissões do usuário logado na escola ativa, derivadas do papel do vínculo.
 * Superadmin do ERP tem acesso a tudo.
 */
export function usePermissoes() {
  const { escolaAtivaId, isSuperadmin, loading: escolaLoading } = useEscolaAtiva();

  const { data, isSuccess } = useQuery({
    queryKey: ["minhas-permissoes", escolaAtivaId],
    enabled: !!escolaAtivaId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("minhas_permissoes", { p_escola_id: escolaAtivaId });
      if (error) throw error;
      return (data ?? []) as ParPermissao[];
    },
  });

  // Só decide acesso quando a escola resolveu e (é superadmin ou as permissões chegaram).
  const isLoading = escolaLoading || !escolaAtivaId || (!isSuperadmin && !isSuccess);

  const set = useMemo(
    () => new Set((data ?? []).map((r) => `${r.modulo_codigo}:${r.acao}`)),
    [data],
  );

  const can = useCallback(
    (modulo: string, acao: Acao = "visualizar") => isSuperadmin || set.has(`${modulo}:${acao}`),
    [isSuperadmin, set],
  );

  return { can, loading: isLoading, isSuperadmin };
}
