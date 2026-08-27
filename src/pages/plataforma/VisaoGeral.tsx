import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Building2, Users, GraduationCap, DollarSign, AlertTriangle, Clock } from "lucide-react";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#0ea5e9"];

function formatCurrency(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function VisaoGeral() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["plataforma-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("plataforma_overview");
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const { data: distribuicao, isLoading: loadingDistribuicao } = useQuery({
    queryKey: ["plataforma-distribuicao-plano"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("plataforma_distribuicao_por_plano");
      if (error) throw error;
      return data ?? [];
    },
  });

  const cards = [
    {
      label: "MRR Atual",
      value: formatCurrency(overview?.mrr_atual),
      icon: DollarSign,
      accent: "text-emerald-500",
    },
    {
      label: "Escolas Ativas",
      value: overview?.escolas_ativas ?? 0,
      icon: Building2,
      accent: "text-primary",
    },
    {
      label: "Em Trial",
      value: overview?.em_trial ?? 0,
      icon: Clock,
      accent: "text-amber-500",
    },
    {
      label: "Inadimplentes",
      value: overview?.inadimplentes ?? 0,
      icon: AlertTriangle,
      accent: "text-destructive",
    },
    {
      label: "Usuários na Plataforma",
      value: overview?.total_usuarios_plataforma ?? 0,
      icon: Users,
      accent: "text-blue-500",
    },
    {
      label: "Alunos na Plataforma",
      value: overview?.total_alunos_plataforma ?? 0,
      icon: GraduationCap,
      accent: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visão Geral da Plataforma</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Números consolidados de todos os clientes do seu SaaS.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold mt-1">
                  {loadingOverview ? "…" : c.value}
                </p>
              </div>
              <c.icon className={`h-8 w-8 ${c.accent} opacity-80`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por Plano</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDistribuicao ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : !distribuicao || distribuicao.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={distribuicao}
                      dataKey="qtd_clientes"
                      nameKey="plano"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(entry) => `${entry.plano}: ${entry.qtd_clientes}`}
                    >
                      {distribuicao.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {distribuicao.map((d, i) => (
                  <div key={d.plano} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      {d.plano}
                    </span>
                    <span className="text-muted-foreground">
                      {d.qtd_clientes} cliente(s) · {formatCurrency(d.receita_do_plano)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
