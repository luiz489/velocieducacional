import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Alunos from "@/pages/Alunos";
import Turmas from "@/pages/Turmas";
import Matriculas from "@/pages/Matriculas";
import FinanceiroPage from "@/pages/Financeiro";
import Pedagogico from "@/pages/Pedagogico";
import Ocorrencias from "@/pages/Ocorrencias";
import ContasPagar from "@/pages/ContasPagar";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alunos" element={<Alunos />} />
            <Route path="/turmas" element={<Turmas />} />
            <Route path="/matriculas" element={<Matriculas />} />
            <Route path="/financeiro" element={<FinanceiroPage />} />
            <Route path="/contas-a-pagar" element={<ContasPagar />} />
            <Route path="/notas" element={<Pedagogico />} />
            <Route path="/ocorrencias" element={<Ocorrencias />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
