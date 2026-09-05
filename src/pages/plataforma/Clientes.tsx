import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function formatCurrency(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusBadge(status: string | null) {
  const map: Record<string, string> = {
    ativa: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    trial: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    suspensa: "bg-destructive/15 text-destructive border-destructive/30",
    inadimplente: "bg-destructive/15 text-destructive border-destructive/30",
    cancelada: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={map[status ?? ""] ?? ""}>
      {status ?? "sem assinatura"}
    </Badge>
  );
}

export default function Clientes() {
  const navigate = useNavigate();
  const { setEscolaAtivaId } = useEscolaAtiva();

  const entrarComoAdmin = (escolaId: string) => {
    setEscolaAtivaId(escolaId);
    navigate("/");
  };

  const queryClient = useQueryClient();
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);
  const [trocarPlanoEscolaId, setTrocarPlanoEscolaId] = useState<string | null>(null);
  const [nomeEscola, setNomeEscola] = useState("");
  const [planoSelecionado, setPlanoSelecionado] = useState<string>("");
  const [valorNegociado, setValorNegociado] = useState<string>("");

  const { data: clientes, isLoading } = useQuery({
    queryKey: ["plataforma-clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("plataforma_clientes_resumo");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: planos } = useQuery({
    queryKey: ["planos-saas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planos_saas")
        .select("id, nome, valor_mensal, limite_usuarios, limite_alunos")
        .eq("ativo", true)
        .order("valor_mensal");
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidateClientes = () => queryClient.invalidateQueries({ queryKey: ["plataforma-clientes"] });

  // Agrupa por grupo_economico_id, pra mostrar matriz + filiais juntas em
  // vez de linhas soltas parecendo clientes sem nenhuma relação entre si.
  const gruposOrdenados = (() => {
    if (!clientes) return [];
    const porGrupo = new Map<string, typeof clientes>();
    const semGrupo: typeof clientes = [];
    for (const c of clientes) {
      if (!c.grupo_economico_id) { semGrupo.push(c); continue; }
      const lista = porGrupo.get(c.grupo_economico_id) ?? [];
      lista.push(c);
      porGrupo.set(c.grupo_economico_id, lista);
    }
    const grupos = Array.from(porGrupo.entries()).map(([grupoId, escolas]) => ({
      grupoId,
      grupoNome: escolas[0].grupo_nome,
      escolas: escolas.sort((a, b) => (b.eh_matriz ? 1 : 0) - (a.eh_matriz ? 1 : 0)),
    }));
    return [
      ...grupos,
      ...semGrupo.map((c) => ({ grupoId: c.escola_id!, grupoNome: null, escolas: [c] })),
    ];
  })();

  const criarCliente = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("criar_novo_cliente_saas", {
        p_nome_escola: nomeEscola,
        p_plano_id: planoSelecionado,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Cliente criado com sucesso" });
      setNovoClienteOpen(false);
      setNomeEscola("");
      setPlanoSelecionado("");
      invalidateClientes();
    },
    onError: (err: any) => toast({ title: "Erro ao criar cliente", description: err.message, variant: "destructive" }),
  });

  const suspender = useMutation({
    mutationFn: async (escolaId: string) => {
      const { error } = await supabase.rpc("suspender_cliente_saas", { p_escola_id: escolaId });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Cliente suspenso" }); invalidateClientes(); },
    onError: (err: any) => toast({ title: "Erro ao suspender", description: err.message, variant: "destructive" }),
  });

  const reativar = useMutation({
    mutationFn: async (escolaId: string) => {
      const { error } = await supabase.rpc("reativar_cliente_saas", { p_escola_id: escolaId });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Cliente reativado" }); invalidateClientes(); },
    onError: (err: any) => toast({ title: "Erro ao reativar", description: err.message, variant: "destructive" }),
  });

  const trocarPlano = useMutation({
    mutationFn: async () => {
      if (!trocarPlanoEscolaId) return;
      const { error } = await supabase.rpc("mudar_plano_cliente", {
        p_escola_id: trocarPlanoEscolaId,
        p_novo_plano_id: planoSelecionado,
        p_valor_negociado: valorNegociado ? Number(valorNegociado) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Plano atualizado" });
      setTrocarPlanoEscolaId(null);
      setPlanoSelecionado("");
      setValorNegociado("");
      invalidateClientes();
    },
    onError: (err: any) => toast({ title: "Erro ao trocar plano", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">Escolas cadastradas no seu SaaS.</p>
        </div>

        <Dialog open={novoClienteOpen} onOpenChange={setNovoClienteOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar novo cliente</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Nome da escola</Label>
                <Input value={nomeEscola} onChange={(e) => setNomeEscola(e.target.value)} placeholder="Ex: Colégio Aurora" />
              </div>
              <div className="space-y-1.5">
                <Label>Plano</Label>
                <Select value={planoSelecionado} onValueChange={setPlanoSelecionado}>
                  <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                  <SelectContent>
                    {planos?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} — {formatCurrency(p.valor_mensal)}/mês
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!nomeEscola || !planoSelecionado || criarCliente.isPending}
                onClick={() => criarCliente.mutate()}
              >
                {criarCliente.isPending ? "Criando…" : "Criar cliente"}
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
                <TableHead>Escola</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Alunos</TableHead>
                <TableHead>Valor Mensal</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
              )}
              {!isLoading && (!clientes || clientes.length === 0) && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum cliente ainda.</TableCell></TableRow>
              )}
              {gruposOrdenados.map((grupo) => (
                <>
                  {grupo.escolas.length > 1 && (
                    <TableRow key={`header-${grupo.grupoId}`} className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={7} className="py-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          Grupo: {grupo.grupoNome} ({grupo.escolas.length} unidades)
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {grupo.escolas.map((c) => {
                    const noLimiteUsuarios = (c.usuarios_ativos ?? 0) >= (c.limite_usuarios ?? Infinity);
                    const noLimiteAlunos = c.limite_alunos != null && (c.alunos_ativos ?? 0) >= c.limite_alunos;
                    const dentroDeGrupo = grupo.escolas.length > 1;
                    return (
                      <TableRow key={c.escola_id}>
                        <TableCell className="font-medium">
                          <div className={dentroDeGrupo ? "flex items-center gap-2 pl-4 border-l-2 border-muted ml-1" : ""}>
                            {c.escola_nome}
                            {dentroDeGrupo && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {c.eh_matriz ? "Matriz" : "Filial"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{c.plano_atual ?? "—"}</TableCell>
                        <TableCell>{statusBadge(c.status_assinatura)}</TableCell>
                        <TableCell className={noLimiteUsuarios ? "text-destructive font-semibold" : ""}>
                          {c.usuarios_ativos ?? 0} / {c.limite_usuarios ?? "∞"}
                        </TableCell>
                        <TableCell className={noLimiteAlunos ? "text-destructive font-semibold" : ""}>
                          {c.alunos_ativos ?? 0} / {c.limite_alunos ?? "∞"}
                        </TableCell>
                        <TableCell>{formatCurrency(c.valor_mensal)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => entrarComoAdmin(c.escola_id!)}>
                                Entrar como Administrador
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setTrocarPlanoEscolaId(c.escola_id!);
                                  setPlanoSelecionado("");
                                  setValorNegociado("");
                                }}
                              >
                                Trocar de plano
                              </DropdownMenuItem>
                              {c.status_assinatura === "trial" && (
                                <DropdownMenuItem
                                  className="text-emerald-600"
                                  onClick={() => reativar.mutate(c.escola_id!)}
                                >
                                  Confirmar Assinatura (virar Ativa)
                                </DropdownMenuItem>
                              )}
                              {c.escola_ativa ? (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => suspender.mutate(c.escola_id!)}
                                >
                                  Suspender
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => reativar.mutate(c.escola_id!)}>
                                  Reativar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!trocarPlanoEscolaId} onOpenChange={(open) => !open && setTrocarPlanoEscolaId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Trocar de plano</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Novo plano</Label>
              <Select value={planoSelecionado} onValueChange={setPlanoSelecionado}>
                <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                <SelectContent>
                  {planos?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} — {formatCurrency(p.valor_mensal)}/mês
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valor negociado (opcional)</Label>
              <Input
                type="number"
                value={valorNegociado}
                onChange={(e) => setValorNegociado(e.target.value)}
                placeholder="Deixe em branco para usar o valor padrão do plano"
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={!planoSelecionado || trocarPlano.isPending} onClick={() => trocarPlano.mutate()}>
              {trocarPlano.isPending ? "Salvando…" : "Confirmar troca"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
