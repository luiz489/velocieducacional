import { Users, DollarSign, AlertTriangle, Cake, TrendingUp, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  LineChart, Line,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData } from "@/hooks/useDashboardData";

const TURNO_COLORS = ["hsl(220, 70%, 25%)", "hsl(210, 60%, 50%)", "hsl(215, 25%, 70%)", "hsl(38, 92%, 50%)"];
const OCORRENCIA_COLORS: Record<string, string> = {
  "Advertência": "hsl(0, 72%, 51%)",
  "Elogio": "hsl(142, 71%, 45%)",
  "Observação": "hsl(38, 92%, 50%)",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(value);

const formatCurrencyFull = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function Dashboard() {
  const { data, isLoading } = useDashboardData();

  const kpis = data
    ? [
        { title: "Total de Alunos", value: String(data.kpis.totalAlunos), icon: Users, change: `${data.kpis.totalAlunos} ativos`, color: "text-info" },
        { title: "Turmas Ativas", value: String(data.kpis.totalTurmas), icon: BookOpen, change: `${data.kpis.turnosDistintos} turnos`, color: "text-primary" },
        { title: "Inadimplência", value: `${data.kpis.inadimplencia.toFixed(1)}%`, icon: AlertTriangle, change: "Mês atual", color: "text-warning" },
        { title: "Receita Mensal", value: formatCurrency(data.kpis.recebido), icon: DollarSign, change: "Recebido este mês", color: "text-success" },
        { title: "Matrículas Novas", value: String(data.kpis.matriculasEsteMes), icon: TrendingUp, change: "Este mês", color: "text-info" },
        { title: "Aniversariantes", value: String(data.kpis.aniversariantes), icon: Cake, change: "Este mês", color: "text-destructive" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema escolar</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
                <CardContent><Skeleton className="h-8 w-20" /><Skeleton className="h-3 w-28 mt-2" /></CardContent>
              </Card>
            ))
          : kpis.map((kpi) => (
              <Card key={kpi.title} className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.change}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Receita Mensal</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[260px] w-full" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data?.receitaMensal || []}>
                  <defs>
                    <linearGradient id="gradRecebido" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(220, 70%, 25%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(220, 70%, 25%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} labelStyle={{ fontWeight: 600 }} />
                  <Area type="monotone" dataKey="previsto" stroke="hsl(215, 25%, 70%)" fill="none" strokeDasharray="5 5" strokeWidth={2} name="Previsto" />
                  <Area type="monotone" dataKey="recebido" stroke="hsl(220, 70%, 25%)" fill="url(#gradRecebido)" strokeWidth={2} name="Recebido" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Alunos por Turno</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[260px] w-full" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data?.alunosPorTurno || []} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={4} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {(data?.alunosPorTurno || []).map((_, i) => (
                      <Cell key={i} fill={TURNO_COLORS[i % TURNO_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                  <Tooltip formatter={(value: number) => `${value} alunos`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Matrículas por Mês</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[220px] w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.matriculasMensais || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                  <Tooltip />
                  <Bar dataKey="matriculas" fill="hsl(210, 60%, 50%)" radius={[4, 4, 0, 0]} name="Matrículas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Evolução da Inadimplência</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[220px] w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data?.inadimplenciaData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Line type="monotone" dataKey="taxa" stroke="hsl(38, 92%, 50%)" strokeWidth={2.5} dot={{ r: 5, fill: "hsl(38, 92%, 50%)" }} name="Taxa" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Ocorrências por Tipo</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[220px] w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.ocorrenciasTipo || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                  <YAxis type="category" dataKey="tipo" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" width={90} />
                  <Tooltip />
                  <Bar dataKey="quantidade" radius={[0, 4, 4, 0]} name="Quantidade">
                    {(data?.ocorrenciasTipo || []).map((entry, i) => (
                      <Cell key={i} fill={OCORRENCIA_COLORS[entry.tipo] || `hsl(${i * 120}, 50%, 50%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Resumo Financeiro</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[140px] w-full" /> : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Recebido este mês</span>
                  <span className="text-sm font-semibold text-success">{formatCurrencyFull(data?.resumoFinanceiro.recebido || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">A receber</span>
                  <span className="text-sm font-semibold text-warning">{formatCurrencyFull(data?.resumoFinanceiro.aReceber || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Em atraso</span>
                  <span className="text-sm font-semibold text-destructive">{formatCurrencyFull(data?.resumoFinanceiro.emAtraso || 0)}</span>
                </div>
                <div className="pt-3 border-t border-border flex justify-between items-center">
                  <span className="text-sm font-medium">Total previsto</span>
                  <span className="text-sm font-bold">{formatCurrencyFull(data?.resumoFinanceiro.totalPrevisto || 0)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
