import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { IdCard, RefreshCw, Eye } from "lucide-react";
import { format, addYears } from "date-fns";

type Aluno = { id: string; nome: string; cpf: string; data_nascimento: string };
type Carteirinha = {
  id: string;
  aluno_id: string;
  codigo: string;
  validade: string;
  foto_url: string | null;
  qr_data: string | null;
  status: "Ativa" | "Bloqueada" | "Vencida";
  emitida_em: string;
};

export default function Carteirinhas() {
  const qc = useQueryClient();
  const { escolaAtivaId, escolas } = useEscolaAtiva();
  const escolaNome = escolas.find((e) => e.escola_id === escolaAtivaId)?.nome ?? "Escola";
  const [preview, setPreview] = useState<{ aluno: Aluno; carteira: Carteirinha } | null>(null);

  const { data: alunos } = useQuery({
    queryKey: ["alunos-cart", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("alunos").select("id, nome, cpf, data_nascimento").eq("escola_id", escolaAtivaId!).order("nome");
      if (error) throw error;
      return data as Aluno[];
    },
  });

  const { data: carteiras } = useQuery({
    queryKey: ["carteirinhas", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("carteirinhas").select("*").eq("escola_id", escolaAtivaId!);
      if (error) throw error;
      return data as Carteirinha[];
    },
  });

  const cartMap = new Map(carteiras?.map((c) => [c.aluno_id, c]));

  const gerar = useMutation({
    mutationFn: async (aluno: Aluno) => {
      const existente = cartMap.get(aluno.id);
      const codigo = `DM-${Date.now().toString().slice(-8)}`;
      const validade = format(addYears(new Date(), 1), "yyyy-MM-dd");
      const qr_data = JSON.stringify({ codigo, aluno: aluno.nome, cpf: aluno.cpf });
      if (existente) {
        const { error } = await supabase.from("carteirinhas").update({
          codigo, validade, qr_data, status: "Ativa", emitida_em: new Date().toISOString().slice(0, 10),
        }).eq("id", existente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("carteirinhas").insert({
          aluno_id: aluno.id, codigo, validade, qr_data, status: "Ativa", escola_id: escolaAtivaId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Carteirinha emitida");
      qc.invalidateQueries({ queryKey: ["carteirinhas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <IdCard className="h-7 w-7 text-primary" /> Carteirinhas Escolares
        </h1>
        <p className="text-muted-foreground">Emita e reemita carteirinhas dos alunos para o app.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alunos</CardTitle>
          <CardDescription>Clique em "Gerar/Reemitir" para criar uma nova carteirinha válida por 1 ano.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alunos?.map((a) => {
                const c = cartMap.get(a.id);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.nome}</TableCell>
                    <TableCell>{c?.codigo ?? "—"}</TableCell>
                    <TableCell>{c?.validade ? format(new Date(c.validade), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell>
                      {c ? <Badge variant={c.status === "Ativa" ? "default" : "destructive"}>{c.status}</Badge> : <Badge variant="outline">Sem carteirinha</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {c && (
                        <Button variant="ghost" size="icon" onClick={() => setPreview({ aluno: a, carteira: c })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => gerar.mutate(a)}>
                        <RefreshCw className="h-3 w-3 mr-1" /> {c ? "Reemitir" : "Gerar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Carteirinha</DialogTitle></DialogHeader>
          {preview && (
            <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">{escolaNome}</div>
                  <div className="font-bold">Carteirinha Estudantil</div>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div><span className="text-muted-foreground">Nome:</span> <strong>{preview.aluno.nome}</strong></div>
                <div><span className="text-muted-foreground">CPF:</span> {preview.aluno.cpf}</div>
                <div><span className="text-muted-foreground">Nasc:</span> {format(new Date(preview.aluno.data_nascimento), "dd/MM/yyyy")}</div>
                <div><span className="text-muted-foreground">Código:</span> <code>{preview.carteira.codigo}</code></div>
                <div><span className="text-muted-foreground">Validade:</span> {format(new Date(preview.carteira.validade), "dd/MM/yyyy")}</div>
              </div>
              <div className="border-t pt-2 text-[10px] text-muted-foreground text-center">
                Documento digital — verificar QR no app
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
