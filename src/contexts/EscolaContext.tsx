import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type EscolaVinculada = {
  escola_id: string;
  nome: string;
};

type EscolaContextValue = {
  escolaAtivaId: string | null;
  escolas: EscolaVinculada[];
  loading: boolean;
  setEscolaAtivaId: (id: string) => void;
};

const EscolaContext = createContext<EscolaContextValue | undefined>(undefined);

const STORAGE_KEY = "escola_ativa_id";

export function EscolaProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [escolas, setEscolas] = useState<EscolaVinculada[]>([]);
  const [escolaAtivaId, setEscolaAtivaIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setEscolas([]);
      setEscolaAtivaIdState(null);
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("usuarios_escolas")
        .select("escola_id, escolas(id, nome)")
        .eq("user_id", user.id)
        .eq("ativo", true);

      if (error) {
        console.error("Erro ao carregar escolas do usuário:", error.message);
        setLoading(false);
        return;
      }

      const lista: EscolaVinculada[] = (data ?? [])
        .map((r: any) => ({ escola_id: r.escola_id, nome: r.escolas?.nome ?? "Escola" }));

      setEscolas(lista);

      const salva = localStorage.getItem(STORAGE_KEY);
      const valida = salva && lista.some((e) => e.escola_id === salva);
      setEscolaAtivaIdState(valida ? salva! : lista[0]?.escola_id ?? null);
      setLoading(false);
    })();
  }, [user, authLoading]);

  const setEscolaAtivaId = (id: string) => {
    setEscolaAtivaIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  return (
    <EscolaContext.Provider value={{ escolaAtivaId, escolas, loading, setEscolaAtivaId }}>
      {children}
    </EscolaContext.Provider>
  );
}

export function useEscolaAtiva() {
  const ctx = useContext(EscolaContext);
  if (!ctx) throw new Error("useEscolaAtiva deve ser usado dentro de um EscolaProvider");
  return ctx;
}
