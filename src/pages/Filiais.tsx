import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Building2, MapPin } from "lucide-react";
import { useCepLookup, mascaraCEP } from "@/hooks/useCepLookup";

type Filial = {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  ativo: boolean;
};

export default function Filiais() {
  const qc = useQueryClient();
  const { escolaAtivaId, refetchEscolas } = useEscolaAtiva();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", cidade: "", uf: "", endereco: "", cep: "", telefone: "" });
  const { buscarCep, buscando: buscandoCep } = useCepLookup();

  const handleCepBlur = async () => {
    const resultado = await buscarCep(form.cep);
    if (!resultado) return;
    setForm((f) => ({
      ...f,
      endereco: f.endereco || resultado.logradouro,
      cidade: resultado.cidade,
      uf: resultado.uf,
    }));
  };

  const { data: escolaAtual } = useQuery({
    queryKey: ["escola-atual-grupo", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escolas")
        .select("id, nome, grupo_economico_id")
        .eq("id", escolaAtivaId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: filiais, isLoading } = useQuery({
    queryKey: ["filiais", escolaAtual?.grupo_economico_id, escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      if (escolaAtual?.grupo_economico_id) {
        const { data, error } = await supabase
          .from("escolas")
          .select("id, nome, cidade, uf, ativo")
          .eq("grupo_economico_id", escolaAtual.grupo_economico_id)
          .order("nome");
        if (error) throw error;
        return data as Filial[];
      }
      // Ainda não tem grupo econômico - só mostra a própria escola
      const { data, error } = await supabase
        .from("escolas")
        .select("id, nome, cidade, uf, ativo")
        .eq("id", escolaAtivaId!);
      if (error) throw error;
      return data as Filial[];
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("criar_filial", {
        p_escola_origem_id: escolaAtivaId!,
        p_nome_filial: form.nome,
        p_cidade: form.cidade || null,
        p_uf: form.uf || null,
        p_endereco: form.endereco || null,
        p_telefone: form.telefone || null,
        p_cep: form.cep || null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: async (novaEscolaId) => {
      toast.success("Filial criada com sucesso!");
      qc.invalidateQueries({ queryKey: ["filiais"] });
      await refetchEscolas(novaEscolaId);
      setOpen(false);
      setForm({ nome: "", cidade: "", uf: "", endereco: "", cep: "", telefone: "" });
    },
    onError: (e: any) => toast.error("Erro ao criar filial: " + e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" /> Filiais
          </h1>
          <p className="text-muted-foreground">
            Cada filial tem seus próprios alunos, turmas e financeiro - totalmente isolados das demais.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Filial</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Filial</DialogTitle>
              <DialogDescription>
                Cria uma unidade nova com dados totalmente separados. Você já sai vinculado como administrador dela.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome da Filial *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Unidade Norte" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CEP</Label>
                  <Input
                    value={form.cep}
                    placeholder="00000-000"
                    onChange={(e) => setForm({ ...form, cep: mascaraCEP(e.target.value) })}
                    onBlur={handleCepBlur}
                  />
                  {buscandoCep && <p className="text-xs text-muted-foreground mt-1">Buscando endereço...</p>}
                </div>
                <div>
                  <Label>UF</Label>
                  <Input value={form.uf} maxLength={2} onChange={(e) => setForm({ ...form, uf: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => criar.mutate()} disabled={!form.nome || criar.isPending}>
                {criar.isPending ? "Criando..." : "Criar Filial"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              )}
              {filiais?.map((f) => (
                <TableRow key={f.id} className={f.id === escolaAtivaId ? "bg-muted/40" : ""}>
                  <TableCell className="font-medium">
                    {f.nome}
                    {f.id === escolaAtivaId && <Badge variant="outline" className="ml-2 text-xs">Você está aqui</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {f.cidade ? (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{f.cidade} - {f.uf}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.ativo ? "default" : "outline"}>{f.ativo ? "Ativa" : "Inativa"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
