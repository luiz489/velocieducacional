import { Users, DollarSign, AlertTriangle, Cake, TrendingUp, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema escolar</p>
      </div>

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
