import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ShieldQuestion, RefreshCw, KeyRound } from "lucide-react";

type Resultado = "nao_cadastrado" | "limite_destino" | "limite_global" | "erro_envio" | "enviado" | "gerado_staff";

type Tentativa = {
  id: string;
  canal: "whatsapp" | "email";
  destino: string;
  resultado: Resultado;
  detalhe: string | null;
  created_at: string;
};

const RESULTADO_INFO: Record<Resultado, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  enviado: { label: "Enviado", variant: "default" },
  gerado_staff: { label: "Gerado pela escola", variant: "default" },
  nao_cadastrado: { label: "Não cadastrado", variant: "secondary" },
  limite_destino: { label: "Limite (3 em 10 min)", variant: "outline" },
  limite_global: { label: "Limite global", variant: "outline" },
  erro_envio: { label: "Erro no envio", variant: "destructive" },
};

const ERRO_LABEL: Record<string, string> = {
  nao_cadastrado: "Esse contato não bate com nenhum responsável ativo nesta escola.",
  sem_permissao: "Você não tem permissão de comunicação nesta escola.",
  formato: "E-mail ou telefone em formato inválido.",
  erro_banco: "Erro ao salvar o código. Tente de novo.",
};

export default function DiagnosticoLoginFamilia() {
  const qc = useQueryClient();
  const [canal, setCanal] = useState<"email" | "whatsapp">("email");
  const [destino, setDestino] = useState("");
  const [codigoGerado, setCodigoGerado] = useState<string | null>(null);

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

  const gerar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("familia-gerar-codigo-staff", { body: { canal, destino } });
      if (error) throw error;
      if (!data?.ok) throw new Error(ERRO_LABEL[data?.erro] ?? data?.erro ?? "Não foi possível gerar o código.");
      return data as { codigo: string; validade_min: number };
    },
    onSuccess: (data) => {
      setCodigoGerado(data.codigo);
      toast.success(`Código gerado: ${data.codigo} (vale ${data.validade_min} min)`);
      qc.invalidateQueries({ queryKey: ["familia_login_tentativas"] });
    },
    onError: (e: Error) => toast.error(e.message),
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
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Gerar código na hora</CardTitle>
          <CardDescription>
            Quando o e-mail não chegar (ou foi pro spam), gere o código aqui e leia pro responsável por telefone/WhatsApp.
            Só funciona se o contato já estiver cadastrado como responsável de um aluno ativo nesta escola.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Canal</Label>
            <Select value={canal} onValueChange={(v) => setCanal(v as "email" | "whatsapp")}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-56">
            <Label>{canal === "email" ? "E-mail do responsável" : "WhatsApp (com DDD)"}</Label>
            <Input
              value={destino}
              onChange={(e) => { setDestino(e.target.value); setCodigoGerado(null); }}
              placeholder={canal === "email" ? "nome@exemplo.com" : "(17) 99999-0000"}
            />
          </div>
          <Button onClick={() => gerar.mutate()} disabled={!destino || gerar.isPending}>
            {gerar.isPending ? "Gerando..." : "Gerar código"}
          </Button>
          {codigoGerado && (
            <div className="w-full rounded-lg border border-primary bg-primary/5 px-4 py-3">
              <p className="text-sm text-muted-foreground">Código pra ler pro responsável (vale 10 minutos):</p>
              <p className="text-3xl font-bold tracking-[0.3em]">{codigoGerado}</p>
            </div>
          )}
        </CardContent>
      </Card>

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
