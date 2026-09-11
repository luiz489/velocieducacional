import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  erro: Error | null;
}

/**
 * Captura erros de renderização de uma tela e mostra um aviso amigável com
 * opção de recarregar, em vez de deixar o React desmontar a árvore inteira
 * (tela branca, obrigando o usuário a dar F5).
 *
 * Use com `key={location.pathname}` para o aviso sumir ao trocar de tela.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error("Erro na tela:", erro, info.componentStack);
  }

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">Algo deu errado ao abrir esta tela</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Tente de novo. Se o problema continuar, recarregue a página e avise o suporte.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => this.setState({ erro: null })}>
            Tentar de novo
          </Button>
          <Button onClick={() => window.location.reload()}>Recarregar a página</Button>
        </div>
      </div>
    );
  }
}
