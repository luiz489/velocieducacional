import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Tela de login apenas - o autocadastro público foi removido de propósito.
 * Contas novas só são criadas por um administrador da escola (Configurações
 * → Usuários) ou pelo Modo Administrador (novo cliente), nunca por
 * qualquer pessoa que chegue nesta tela.
 */
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviandoReset, setEnviandoReset] = useState(false);
  const { toast } = useToast();

  const handleEsqueciSenha = async () => {
    if (!email) {
      toast({ title: "Digite seu e-mail primeiro", description: "Preencha o campo de e-mail acima antes de solicitar a redefinição.", variant: "destructive" });
      return;
    }
    setEnviandoReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setEnviandoReset(false);
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "E-mail enviado!", description: "Confira sua caixa de entrada para redefinir a senha." });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro ao entrar",
        description: error.message || "E-mail ou senha incorretos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <GraduationCap className="h-14 w-14 text-primary" />
          </div>
          <CardTitle className="text-2xl">Veloci Educacional</CardTitle>
          <CardDescription>Faça login para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={128}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="mt-3 text-center text-sm">
            <button
              type="button"
              className="text-muted-foreground underline-offset-4 hover:underline"
              onClick={handleEsqueciSenha}
              disabled={enviandoReset}
            >
              {enviandoReset ? "Enviando..." : "Esqueci minha senha"}
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Não tem conta? Peça ao administrador da sua escola para te cadastrar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
