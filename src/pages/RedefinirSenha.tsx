import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";

/**
 * Destino do link enviado por e-mail ao clicar em "Resetar Senha" (seja
 * pelo próprio usuário em "Esqueci minha senha", ou por um administrador
 * em Configurações → Usuários). O Supabase já autentica automaticamente
 * quem chega aqui vindo de um link de recuperação válido.
 */
export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [sessaoValida, setSessaoValida] = useState<boolean | null>(null);
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    // O link de recuperação do Supabase dispara um evento PASSWORD_RECOVERY
    // e já autentica a sessão automaticamente ao carregar a página.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setSessaoValida(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessaoValida(true);
      else setSessaoValida((atual) => atual ?? false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      toast.error("Erro ao redefinir senha: " + error.message);
      return;
    }
    toast.success("Senha redefinida com sucesso! Faça login com a nova senha.");
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <GraduationCap className="h-14 w-14 text-primary" />
          </div>
          <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
          <CardDescription>Escolha uma nova senha para acessar sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          {sessaoValida === false ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Este link de redefinição é inválido ou já expirou. Solicite um novo.
              </p>
              <Button variant="outline" onClick={() => navigate("/login")}>Voltar ao login</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senha">Nova senha</Label>
                <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={6} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
                <Input id="confirmarSenha" type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} minLength={6} required />
              </div>
              <Button type="submit" className="w-full" disabled={salvando || sessaoValida !== true}>
                {salvando ? "Salvando..." : "Redefinir Senha"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
