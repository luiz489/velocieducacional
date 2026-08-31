import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type EscolaVinculada = {
  escola_id: string;
  nome: string;
  /** true = vínculo real em usuarios_escolas. false = acesso só por ser superadmin (modo administrador). */
  membroReal: boolean;
};

type EscolaContextValue = {
  escolaAtivaId: string | null;
  escolas: EscolaVinculada[];
  loading: boolean;
  isSuperadmin: boolean;
  /** true quando a escola ativa não é um vínculo real (você está "entrando como administrador"). */
  emModoAdministrador: boolean;
  setEscolaAtivaId: (id: string) => void;
};

const EscolaContext = createContext<EscolaContextValue | undefined>(undefined);

const STORAGE_KEY = "escola_ativa_id";

export function EscolaProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [escolas, setEscolas] = useState<EscolaVinculada[]>([]);
  const [escolaAtivaId, setEscolaAtivaIdState] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setEscolas([]);
      setEscolaAtivaIdState(null);
      setIsSuperadmin(false);
      setLoading(false);
      return;
    }

    (async () => {
      const { data: vinculos, error: errVinculos } = await supabase
        .from("usuarios_escolas")
        .select("escola_id, escolas(id, nome)")
        .eq("user_id", user.id)
        .eq("ativo", true);

      if (errVinculos) {
        console.error("Erro ao carregar escolas do usuário:", errVinculos.message);
      }

      const reais: EscolaVinculada[] = (vinculos ?? []).map((r: any) => ({
        escola_id: r.escola_id,
        nome: r.escolas?.nome ?? "Escola",
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
          .select("id, nome")
          .order("nome");

        if (!errTodas) {
          const idsReais = new Set(reais.map((e) => e.escola_id));
          const extras: EscolaVinculada[] = (todasEscolas ?? [])
            .filter((e) => !idsReais.has(e.id))
            .map((e) => ({ escola_id: e.id, nome: e.nome, membroReal: false }));
          listaFinal = [...reais, ...extras];
        }
      }

      setEscolas(listaFinal);

      const salva = localStorage.getItem(STORAGE_KEY);
      const valida = salva && listaFinal.some((e) => e.escola_id === salva);
      const preferida = listaFinal.find((e) => e.membroReal) ?? listaFinal[0];
      setEscolaAtivaIdState(valida ? salva! : preferida?.escola_id ?? null);
      setLoading(false);
    })();
  }, [user, authLoading]);

  const setEscolaAtivaId = (id: string) => {
    setEscolaAtivaIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const emModoAdministrador = !!escolas.find((e) => e.escola_id === escolaAtivaId && !e.membroReal);

  return (
    <EscolaContext.Provider
      value={{ escolaAtivaId, escolas, loading, isSuperadmin, emModoAdministrador, setEscolaAtivaId }}
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
