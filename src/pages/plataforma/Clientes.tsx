import { Fragment, useState, useRef } from "react";
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
import { MoreHorizontal, Plus, Trash2, ChevronRight } from "lucide-react";
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

  const [grupoExpandidoId, setGrupoExpandidoId] = useState<string | null>(null);
  const timeoutFecharRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Enquanto o menu de ações (⋮) de uma linha está aberto, não deixamos o grupo
  // recolher no hover — recolher desmonta as filiais e o layout pula por baixo do
  // menu portalado, o que fechava o menu / disparava o item errado.
  const [menuAbertoId, setMenuAbertoId] = useState<string | null>(null);
  const menuAbertoRef = useRef<string | null>(null);

  const expandirGrupo = (grupoId: string) => {
    if (timeoutFecharRef.current) clearTimeout(timeoutFecharRef.current);
    setGrupoExpandidoId(grupoId);
  };
  const agendarFecharGrupo = () => {
    if (timeoutFecharRef.current) clearTimeout(timeoutFecharRef.current);
    timeoutFecharRef.current = setTimeout(() => {
      if (menuAbertoRef.current) return;
      setGrupoExpandidoId(null);
    }, 200);
  };
  const setMenuAberto = (escolaId: string, aberto: boolean) => {
    menuAbertoRef.current = aberto ? escolaId : null;
    setMenuAbertoId(aberto ? escolaId : null);
    if (!aberto) agendarFecharGrupo();
  };

  const excluirCliente = useMutation({
    mutationFn: async (escolaId: string) => {
      const { error } = await supabase.rpc("excluir_cliente_saas", { p_escola_id: escolaId });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Cliente excluído." }); invalidateClientes(); },
    onError: (err: any) => toast({ title: "Não foi possível excluir", description: err.message, variant: "destructive" }),
  });

  const handleExcluir = (nome: string, escolaId: string) => {
    if (!confirm(`Excluir "${nome}" permanentemente? Isso só funciona se a escola ainda não tiver nenhum dado (alunos, financeiro etc). Essa ação não pode ser desfeita.`)) return;
    excluirCliente.mutate(escolaId);
  };

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
              {gruposOrdenados.map((grupo) => {
                const temFiliais = grupo.escolas.length > 1;
                const matriz = grupo.escolas.find((e) => e.eh_matriz) ?? grupo.escolas[0];
                const filiais = grupo.escolas.filter((e) => e.escola_id !== matriz.escola_id);
                const menuNesteGrupo = grupo.escolas.some((e) => e.escola_id === menuAbertoId);
                const expandido = grupoExpandidoId === grupo.grupoId || menuNesteGrupo;

                const renderLinha = (c: (typeof grupo.escolas)[number], ehFilial: boolean) => {
                  const noLimiteUsuarios = (c.usuarios_ativos ?? 0) >= (c.limite_usuarios ?? Infinity);
                  const noLimiteAlunos = c.limite_alunos != null && (c.alunos_ativos ?? 0) >= c.limite_alunos;
                  return (
                    <TableRow
                      key={c.escola_id}
                      onMouseEnter={() => temFiliais && expandirGrupo(grupo.grupoId)}
                      onMouseLeave={() => temFiliais && agendarFecharGrupo()}
                      className={ehFilial ? "bg-muted/30" : ""}
                    >
                      <TableCell className="font-medium">
                        <div className={ehFilial ? "flex items-center gap-2 pl-6 border-l-2 border-muted ml-2" : "flex items-center gap-2"}>
                          {temFiliais && !ehFilial && (
                            <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expandido ? "rotate-90" : ""}`} />
                          )}
                          {c.escola_nome}
                          {temFiliais && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {ehFilial ? "Filial" : `Matriz · ${filiais.length} filiais`}
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
                        <DropdownMenu
                          open={menuAbertoId === c.escola_id}
                          onOpenChange={(open) => setMenuAberto(c.escola_id!, open)}
                        >
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
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleExcluir(c.escola_nome!, c.escola_id!)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                };

                return (
                  <Fragment key={grupo.grupoId}>
                    {renderLinha(matriz, false)}
                    {temFiliais && expandido && filiais.map((f) => renderLinha(f, true))}
                  </Fragment>
                );
              })}
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
