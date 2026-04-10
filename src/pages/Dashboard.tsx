import { Users, DollarSign, AlertTriangle, Cake, TrendingUp, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  LineChart, Line,
} from "recharts";

const kpis = [
  { title: "Total de Alunos", value: "347", icon: Users, change: "+12 este mês", color: "text-info" },
  { title: "Turmas Ativas", value: "18", icon: BookOpen, change: "3 turnos", color: "text-primary" },
  { title: "Inadimplência", value: "8.2%", icon: AlertTriangle, change: "-1.3% vs mês anterior", color: "text-warning" },
  { title: "Receita Mensal", value: "R$ 128.400", icon: DollarSign, change: "+5.4% vs mês anterior", color: "text-success" },
  { title: "Matrículas Novas", value: "23", icon: TrendingUp, change: "Este mês", color: "text-info" },
  { title: "Aniversariantes", value: "14", icon: Cake, change: "Este mês", color: "text-destructive" },
];

const recentActivities = [
  { text: "Nova matrícula: Ana Silva — 5º Ano A", time: "Há 2h" },
  { text: "Pagamento recebido: João Pereira — R$ 850,00", time: "Há 3h" },
  { text: "Ocorrência registrada: Pedro Santos — 7º Ano B", time: "Há 5h" },
  { text: "Notas lançadas: Matemática — 3º Ano A", time: "Há 6h" },
  { text: "Mensalidade atrasada: Maria Costa — 2º Ano C", time: "Há 8h" },
];

const receitaMensal = [
  { mes: "Jan", recebido: 115000, previsto: 125000 },
  { mes: "Fev", recebido: 120000, previsto: 128000 },
  { mes: "Mar", recebido: 118000, previsto: 130000 },
  { mes: "Abr", recebido: 128400, previsto: 133200 },
  { mes: "Mai", recebido: 0, previsto: 133200 },
  { mes: "Jun", recebido: 0, previsto: 133200 },
];

const alunosPorTurno = [
  { name: "Manhã", value: 148 },
  { name: "Tarde", value: 132 },
  { name: "Integral", value: 67 },
];

const TURNO_COLORS = ["hsl(220, 70%, 25%)", "hsl(210, 60%, 50%)", "hsl(215, 25%, 70%)"];

const matriculasMensais = [
  { mes: "Jan", matriculas: 45 },
  { mes: "Fev", matriculas: 38 },
  { mes: "Mar", matriculas: 29 },
  { mes: "Abr", matriculas: 23 },
  { mes: "Mai", matriculas: 15 },
  { mes: "Jun", matriculas: 8 },
];

const inadimplenciaData = [
  { mes: "Jan", taxa: 12.5 },
  { mes: "Fev", taxa: 10.8 },
  { mes: "Mar", taxa: 9.5 },
  { mes: "Abr", taxa: 8.2 },
];

const ocorrenciasTipo = [
  { tipo: "Advertência", quantidade: 18 },
  { tipo: "Elogio", quantidade: 32 },
  { tipo: "Observação", quantidade: 25 },
];

const OCORRENCIA_COLORS = ["hsl(0, 72%, 51%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(value);

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema escolar</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
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
        {/* Receita Mensal - Area Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Receita Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={receitaMensal}>
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
          </CardContent>
        </Card>

        {/* Alunos por Turno - Pie Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Alunos por Turno</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={alunosPorTurno} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={4} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {alunosPorTurno.map((_, i) => (
                    <Cell key={i} fill={TURNO_COLORS[i]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip formatter={(value: number) => `${value} alunos`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Matrículas Mensais - Bar Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Matrículas por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={matriculasMensais}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                <Tooltip />
                <Bar dataKey="matriculas" fill="hsl(210, 60%, 50%)" radius={[4, 4, 0, 0]} name="Matrículas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inadimplência - Line Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Evolução da Inadimplência</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={inadimplenciaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Line type="monotone" dataKey="taxa" stroke="hsl(38, 92%, 50%)" strokeWidth={2.5} dot={{ r: 5, fill: "hsl(38, 92%, 50%)" }} name="Taxa" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ocorrências por Tipo - Bar Horizontal */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Ocorrências por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ocorrenciasTipo} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                <YAxis type="category" dataKey="tipo" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" width={90} />
                <Tooltip />
                <Bar dataKey="quantidade" radius={[0, 4, 4, 0]} name="Quantidade">
                  {ocorrenciasTipo.map((_, i) => (
                    <Cell key={i} fill={OCORRENCIA_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, i) => (
                <div key={i} className="flex items-start justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <p className="text-sm text-foreground">{activity.text}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Recebido este mês</span>
                <span className="text-sm font-semibold text-success">R$ 118.200,00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">A receber</span>
                <span className="text-sm font-semibold text-warning">R$ 10.200,00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Em atraso</span>
                <span className="text-sm font-semibold text-destructive">R$ 4.800,00</span>
              </div>
              <div className="pt-3 border-t border-border flex justify-between items-center">
                <span className="text-sm font-medium">Total previsto</span>
                <span className="text-sm font-bold">R$ 133.200,00</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
