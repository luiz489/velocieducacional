import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Layers } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Plano = {
  id: string;
  nome: string;
  descricao: string | null;
  valor_mensal: number;
  limite_usuarios: number;
  limite_alunos: number | null;
  modulos_incluidos: string[];
  ativo: boolean;
};

const MODULOS_DISPONIVEIS = [
  "alunos", "matriculas", "turmas", "financeiro", "pedagogico",
  "ocorrencias", "comunicacao", "calendario", "carteirinhas",
  "compras", "rh", "parceiros",
];

function formatCurrency(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const emptyForm = {
  nome: "", descricao: "", valor_mensal: "", limite_usuarios: "5",
  limite_alunos: "", modulos_incluidos: [] as string[], ativo: true,
};

export default function Planos() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plano | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: planos, isLoading } = useQuery({
    queryKey: ["planos-saas-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("planos_saas").select("*").order("valor_mensal");
      if (error) throw error;
      return data as Plano[];
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: Plano) => {
    setEditing(p);
    setForm({
      nome: p.nome,
      descricao: p.descricao ?? "",
      valor_mensal: String(p.valor_mensal),
      limite_usuarios: String(p.limite_usuarios),
      limite_alunos: p.limite_alunos != null ? String(p.limite_alunos) : "",
      modulos_incluidos: p.modulos_incluidos ?? [],
      ativo: p.ativo,
    });
    setOpen(true);
  };

  const toggleModulo = (m: string) => {
    setForm((f) => ({
      ...f,
      modulos_incluidos: f.modulos_incluidos.includes(m)
        ? f.modulos_incluidos.filter((x) => x !== m)
        : [...f.modulos_incluidos, m],
    }));
  };

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome,
        descricao: form.descricao || null,
        valor_mensal: Number(form.valor_mensal),
        limite_usuarios: Number(form.limite_usuarios),
        limite_alunos: form.limite_alunos ? Number(form.limite_alunos) : null,
        modulos_incluidos: form.modulos_incluidos,
        ativo: form.ativo,
      };
      if (editing) {
        const { error } = await supabase.from("planos_saas").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("planos_saas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editing ? "Plano atualizado" : "Plano criado" });
      qc.invalidateQueries({ queryKey: ["planos-saas-admin"] });
      qc.invalidateQueries({ queryKey: ["planos-saas"] });
      setOpen(false);
    },
    onError: (err: any) => toast({ title: "Erro ao salvar plano", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6" /> Planos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Planos que você vende para as escolas-cliente do SaaS.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Plano
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Valor Mensal</TableHead>
                <TableHead>Limite Usuários</TableHead>
                <TableHead>Limite Alunos</TableHead>
                <TableHead>Módulos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
              )}
              {!isLoading && !planos?.length && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum plano cadastrado.</TableCell></TableRow>
              )}
              {planos?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.nome}
                    {p.descricao && <div className="text-xs text-muted-foreground">{p.descricao}</div>}
                  </TableCell>
                  <TableCell>{formatCurrency(p.valor_mensal)}</TableCell>
                  <TableCell>{p.limite_usuarios}</TableCell>
                  <TableCell>{p.limite_alunos ?? "Ilimitado"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(p.modulos_incluidos ?? []).slice(0, 4).map((m) => (
                        <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
                      ))}
                      {(p.modulos_incluidos ?? []).length > 4 && (
                        <Badge variant="outline" className="text-[10px]">+{p.modulos_incluidos.length - 4}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.ativo ? "default" : "outline"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar plano" : "Novo plano"}</DialogTitle>
            <DialogDescription>Configure o preço, limites e módulos incluídos neste plano.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do plano</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Starter" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Breve descrição do plano" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Valor Mensal (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_mensal} onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Limite Usuários</Label>
                <Input type="number" value={form.limite_usuarios} onChange={(e) => setForm({ ...form, limite_usuarios: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Limite Alunos</Label>
                <Input type="number" value={form.limite_alunos} onChange={(e) => setForm({ ...form, limite_alunos: e.target.value })} placeholder="Vazio = ilimitado" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Módulos incluídos</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                {MODULOS_DISPONIVEIS.map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.modulos_incluidos.includes(m)}
                      onChange={() => toggleModulo(m)}
                    />
                    {m}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="ativo-switch" className="cursor-pointer">Plano ativo (disponível para novos clientes)</Label>
              <Switch id="ativo-switch" checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!form.nome || !form.valor_mensal || salvar.isPending}
              onClick={() => salvar.mutate()}
            >
              {salvar.isPending ? "Salvando…" : "Salvar Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
