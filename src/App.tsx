import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/Dashboard";
import Alunos from "@/pages/Alunos";
import Turmas from "@/pages/Turmas";
import Matriculas from "@/pages/Matriculas";
import FinanceiroPage from "@/pages/Financeiro";
import Pedagogico from "@/pages/Pedagogico";
import Ocorrencias from "@/pages/Ocorrencias";
import ContasPagar from "@/pages/ContasPagar";
import Contratos from "@/pages/Contratos";
import Compras from "@/pages/Compras";
import Configuracoes from "@/pages/Configuracoes";
import Parceiros from "@/pages/Parceiros";
import MatrizesCurriculares from "@/pages/MatrizesCurriculares";
import Disciplinas from "@/pages/Disciplinas";
import Avisos from "@/pages/Avisos";
import Horarios from "@/pages/Horarios";
import Professores from "@/pages/Professores";
import Calendario from "@/pages/Calendario";
import Rematricula from "@/pages/Rematricula";
import Carteirinhas from "@/pages/Carteirinhas";
import Documentos from "@/pages/Documentos";
import GerarDocumento from "@/pages/GerarDocumento";
import PlanosFinanceirosTurma from "@/pages/PlanosFinanceirosTurma";
import PagamentosProfessores from "@/pages/PagamentosProfessores";
import Funcionarios from "@/pages/Funcionarios";
import PagamentosFuncionarios from "@/pages/PagamentosFuncionarios";
import AppMobile from "@/pages/AppMobile";
import AppFinanceiro from "@/pages/AppFinanceiro";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import { PlataformaLayout } from "@/components/plataforma/PlataformaLayout";
import VisaoGeral from "@/pages/plataforma/VisaoGeral";
import Clientes from "@/pages/plataforma/Clientes";
import Faturamento from "@/pages/plataforma/Faturamento";
import Planos from "@/pages/plataforma/Planos";
import { EscolaProvider } from "@/contexts/EscolaContext";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/alunos" element={<Alunos />} />
        <Route path="/turmas" element={<Turmas />} />
        <Route path="/matriculas" element={<Matriculas />} />
        <Route path="/financeiro" element={<FinanceiroPage />} />
        <Route path="/contas-a-pagar" element={<ContasPagar />} />
        <Route path="/planos-financeiros" element={<PlanosFinanceirosTurma />} />
        <Route path="/pagamentos-professores" element={<PagamentosProfessores />} />
        <Route path="/funcionarios" element={<Funcionarios />} />
        <Route path="/pagamentos-funcionarios" element={<PagamentosFuncionarios />} />
        <Route path="/contratos" element={<Contratos />} />
        <Route path="/compras" element={<Compras />} />
        <Route path="/notas" element={<Pedagogico />} />
        <Route path="/ocorrencias" element={<Ocorrencias />} />
            <Route path="/parceiros" element={<Parceiros />} />
            <Route path="/matrizes-curriculares" element={<MatrizesCurriculares />} />
            <Route path="/disciplinas" element={<Disciplinas />} />
            <Route path="/avisos" element={<Avisos />} />
            <Route path="/horarios" element={<Horarios />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/rematricula" element={<Rematricula />} />
            <Route path="/carteirinhas" element={<Carteirinhas />} />
            <Route path="/documentos" element={<Documentos />} />
            <Route path="/documentos/gerar" element={<GerarDocumento />} />
            <Route path="/professores" element={<Professores />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/admin" element={<Configuracoes />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Login />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <EscolaProvider>
          <Routes>
            <Route path="/login" element={<AuthRoute />} />
            <Route path="/app" element={<AppMobile />} />
            <Route path="/app/financeiro" element={<AppFinanceiro />} />
            <Route path="/plataforma" element={<PlataformaLayout />}>
              <Route index element={<VisaoGeral />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="planos" element={<Planos />} />
              <Route path="faturamento" element={<Faturamento />} />
            </Route>
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </EscolaProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
