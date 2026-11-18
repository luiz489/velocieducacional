import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldQuestion, RefreshCw } from "lucide-react";

type Tentativa = {
  id: string;
  canal: "whatsapp" | "email";
  destino: string;
  resultado: "nao_cadastrado" | "limite_destino" | "limite_global" | "erro_envio" | "enviado";
  detalhe: string | null;
  created_at: string;
};

const RESULTADO_INFO: Record<Tentativa["resultado"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  enviado: { label: "Enviado", variant: "default" },
  nao_cadastrado: { label: "Não cadastrado", variant: "secondary" },
  limite_destino: { label: "Limite (3 em 10 min)", variant: "outline" },
  limite_global: { label: "Limite global", variant: "outline" },
  erro_envio: { label: "Erro no envio", variant: "destructive" },
};

export default function DiagnosticoLoginFamilia() {
  const { data: tentativas, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["familia_login_tentativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("familia_login_tentativas")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Tentativa[];
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldQuestion className="h-7 w-7 text-primary" /> Diagnóstico de login (app da família)
          </h1>
          <p className="text-muted-foreground">
            Últimas 100 tentativas de pedir código (WhatsApp/e-mail), com o motivo real quando não foi enviado.
            A resposta que o app recebe é sempre a mesma por segurança; aqui dá pra ver o que de fato aconteceu.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tentativas recentes</CardTitle>
          <CardDescription>
            "Não cadastrado" = o e-mail/telefone não bate com nenhum responsável ativo. "Limite" = pediram
            código demais em poucos minutos pro mesmo contato. "Erro no envio" = falhou de verdade, veja o detalhe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !tentativas?.length ? (
            <p className="text-muted-foreground">Nenhuma tentativa registrada ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tentativas.map((t) => {
                  const info = RESULTADO_INFO[t.resultado];
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(t.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="capitalize">{t.canal}</TableCell>
                      <TableCell className="font-medium">{t.destino}</TableCell>
                      <TableCell><Badge variant={info.variant}>{info.label}</Badge></TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground" title={t.detalhe ?? ""}>
                        {t.detalhe ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
