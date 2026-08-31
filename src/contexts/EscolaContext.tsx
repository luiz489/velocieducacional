import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type EscolaVinculada = {
  escola_id: string;
  nome: string;
  grupo_economico_id: string | null;
  /** true = vínculo real em usuarios_escolas. false = acesso só por ser superadmin (modo administrador). */
  membroReal: boolean;
};

type EscolaContextValue = {
  escolaAtivaId: string | null;
  escolas: EscolaVinculada[];
  /** Só as filiais reais (matriz + filiais) do mesmo grupo econômico da escola ativa - para o seletor do topo. */
  filiaisDaEscolaAtiva: EscolaVinculada[];
  loading: boolean;
  isSuperadmin: boolean;
  /** true quando a escola ativa não é um vínculo real (você está "entrando como administrador"). */
  emModoAdministrador: boolean;
  setEscolaAtivaId: (id: string) => void;
  /** Recarrega a lista de escolas (chame depois de criar uma filial, por exemplo). */
  refetchEscolas: (selecionarId?: string) => Promise<void>;
};

const EscolaContext = createContext<EscolaContextValue | undefined>(undefined);

const STORAGE_KEY = "escola_ativa_id";

export function EscolaProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [escolas, setEscolas] = useState<EscolaVinculada[]>([]);
  const [escolaAtivaId, setEscolaAtivaIdState] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const carregarEscolas = useCallback(async (selecionarId?: string) => {
    if (!user) {
      setEscolas([]);
      setEscolaAtivaIdState(null);
      setIsSuperadmin(false);
      setLoading(false);
      return;
    }

    const { data: vinculos, error: errVinculos } = await supabase
      .from("usuarios_escolas")
      .select("escola_id, escolas(id, nome, grupo_economico_id)")
      .eq("user_id", user.id)
      .eq("ativo", true);

    if (errVinculos) {
      console.error("Erro ao carregar escolas do usuário:", errVinculos.message);
    }

    const reais: EscolaVinculada[] = (vinculos ?? []).map((r: any) => ({
      escola_id: r.escola_id,
      nome: r.escolas?.nome ?? "Escola",
      grupo_economico_id: r.escolas?.grupo_economico_id ?? null,
      membroReal: true,
    }));

    const { data: souSuperadmin } = await supabase
      .from("superadmins_erp")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let listaFinal = reais;

    if (souSuperadmin) {
      setIsSuperadmin(true);
      const { data: todasEscolas, error: errTodas } = await supabase
        .from("escolas")
        .select("id, nome, grupo_economico_id")
        .order("nome");

      if (!errTodas) {
        const idsReais = new Set(reais.map((e) => e.escola_id));
        const extras: EscolaVinculada[] = (todasEscolas ?? [])
          .filter((e) => !idsReais.has(e.id))
          .map((e) => ({ escola_id: e.id, nome: e.nome, grupo_economico_id: e.grupo_economico_id, membroReal: false }));
        listaFinal = [...reais, ...extras];
      }
    }

    setEscolas(listaFinal);

    if (selecionarId && listaFinal.some((e) => e.escola_id === selecionarId)) {
      setEscolaAtivaId(selecionarId);
    } else {
      const salva = localStorage.getItem(STORAGE_KEY);
      const valida = salva && listaFinal.some((e) => e.escola_id === salva);
      const preferida = listaFinal.find((e) => e.membroReal) ?? listaFinal[0];
      setEscolaAtivaIdState(valida ? salva! : preferida?.escola_id ?? null);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    carregarEscolas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const setEscolaAtivaId = (id: string) => {
    setEscolaAtivaIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const refetchEscolas = async (selecionarId?: string) => {
    await carregarEscolas(selecionarId);
  };

  const escolaAtivaObj = escolas.find((e) => e.escola_id === escolaAtivaId);
  const emModoAdministrador = !!escolaAtivaObj && !escolaAtivaObj.membroReal;

  // Seletor do topo: só matriz + filiais reais do mesmo grupo econômico da escola ativa.
  // Nunca mostra outros clientes, mesmo que você tenha acesso de superadmin a eles.
  const filiaisDaEscolaAtiva = escolaAtivaObj
    ? escolas.filter(
        (e) =>
          e.membroReal &&
          (e.escola_id === escolaAtivaId ||
            (escolaAtivaObj.grupo_economico_id !== null && e.grupo_economico_id === escolaAtivaObj.grupo_economico_id))
      )
    : [];

  return (
    <EscolaContext.Provider
      value={{
        escolaAtivaId,
        escolas,
        filiaisDaEscolaAtiva,
        loading,
        isSuperadmin,
        emModoAdministrador,
        setEscolaAtivaId,
        refetchEscolas,
      }}
    >
      {children}
    </EscolaContext.Provider>
  );
}

export function useEscolaAtiva() {
  const ctx = useContext(EscolaContext);
  if (!ctx) throw new Error("useEscolaAtiva deve ser usado dentro de um EscolaProvider");
  return ctx;
}
