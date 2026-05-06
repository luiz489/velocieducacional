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
import Admin from "@/pages/Admin";
import Parceiros from "@/pages/Parceiros";
import MatrizesCurriculares from "@/pages/MatrizesCurriculares";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

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
        <Route path="/contratos" element={<Contratos />} />
        <Route path="/compras" element={<Compras />} />
        <Route path="/notas" element={<Pedagogico />} />
        <Route path="/ocorrencias" element={<Ocorrencias />} />
            <Route path="/parceiros" element={<Parceiros />} />
            <Route path="/matrizes-curriculares" element={<MatrizesCurriculares />} />
            <Route path="/admin" element={<Admin />} />
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
        <Routes>
          <Route path="/login" element={<AuthRoute />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
