import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ShieldCheck, UserPlus, Plus, Settings } from "lucide-react";

type Papel = { id: string; nome: string; descricao: string | null; escola_id: string | null; papel_sistema: boolean };
type Modulo = { id: string; codigo: string; nome: string; ordem: number | null };
type Permissao = { id: string; modulo_id: string; acao: string };
type PapelPermissao = { papel_id: string; permissao_id: string };
type UsuarioEscola = {
  id: string; user_id: string; papel_id: string; ativo: boolean; criado_em: string;
  profiles: { full_name: string | null; email: string | null } | null;
  papeis: { nome: string } | null;
};

const ACOES = ["visualizar", "criar", "editar", "excluir"] as const;

export default function Configuracoes() {
  const qc = useQueryClient();
  const { escolaAtivaId } = useEscolaAtiva();
  const [papelSelecionado, setPapelSelecionado] = useState<Papel | null>(null);
  const [novoPapelOpen, setNovoPapelOpen] = useState(false);
  const [novoPapelNome, setNovoPapelNome] = useState("");
  const [novoPapelDesc, setNovoPapelDesc] = useState("");
  const [convidarOpen, setConvidarOpen] = useState(false);
  const [convidarEmail, setConvidarEmail] = useState("");
  const [convidarPapelId, setConvidarPapelId] = useState("");

  const { data: papeis } = useQuery({
    queryKey: ["papeis", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("papeis")
        .select("id, nome, descricao, escola_id, papel_sistema")
        .or(`escola_id.eq.${escolaAtivaId},escola_id.is.null`)
        .order("nome");
      if (error) throw error;
      return data as Papel[];
    },
  });

  const { data: modulos } = useQuery({
    queryKey: ["modulos-sistema"],
    queryFn: async () => {
      const { data, error } = await supabase.from("modulos_sistema").select("*").order("ordem");
      if (error) throw error;
      return data as Modulo[];
    },
  });

  const { data: permissoes } = useQuery({
    queryKey: ["permissoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("permissoes").select("*");
      if (error) throw error;
      return data as Permissao[];
    },
  });

  const { data: papelPermissoesAtuais } = useQuery({
    queryKey: ["papel-permissoes", papelSelecionado?.id],
    enabled: !!papelSelecionado,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("papel_permissoes")
        .select("papel_id, permissao_id")
        .eq("papel_id", papelSelecionado!.id);
      if (error) throw error;
      return data as PapelPermissao[];
    },
  });

  const { data: usuarios } = useQuery({
    queryKey: ["usuarios-escola", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios_escolas")
        .select("id, user_id, papel_id, ativo, criado_em, profiles(full_name, email), papeis(nome)")
        .eq("escola_id", escolaAtivaId)
        .order("criado_em");
      if (error) throw error;
      return data as unknown as UsuarioEscola[];
    },
  });

  const criarPapel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("papeis").insert({
        escola_id: escolaAtivaId,
        nome: novoPapelNome,
        descricao: novoPapelDesc || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel criado");
      qc.invalidateQueries({ queryKey: ["papeis"] });
      setNovoPapelOpen(false);
      setNovoPapelNome("");
      setNovoPapelDesc("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePermissao = useMutation({
    mutationFn: async ({ permissaoId, marcado }: { permissaoId: string; marcado: boolean }) => {
      if (!papelSelecionado) return;
      if (marcado) {
        const { error } = await supabase.from("papel_permissoes").insert({
          papel_id: papelSelecionado.id, permissao_id: permissaoId,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("papel_permissoes")
          .delete().eq("papel_id", papelSelecionado.id).eq("permissao_id", permissaoId);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["papel-permissoes", papelSelecionado?.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const convidarUsuario = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("vincular_usuario_a_escola", {
        p_escola_id: escolaAtivaId,
        p_email: convidarEmail,
        p_papel_id: convidarPapelId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário vinculado com sucesso");
      qc.invalidateQueries({ queryKey: ["usuarios-escola"] });
      setConvidarOpen(false);
      setConvidarEmail("");
      setConvidarPapelId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("usuarios_escolas").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: ["usuarios-escola"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const temPermissao = (permissaoId: string) =>
    !!papelPermissoesAtuais?.some((pp) => pp.permissao_id === permissaoId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" /> Configurações
        </h1>
        <Badge variant="outline" className="text-xs"><ShieldCheck className="mr-1 h-3 w-3" />Administração</Badge>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="papeis">Papéis e Permissões</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={convidarOpen} onOpenChange={setConvidarOpen}>
              <DialogTrigger asChild>
                <Button><UserPlus className="h-4 w-4 mr-2" />Vincular usuário</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Vincular usuário à escola</DialogTitle>
                  <DialogDescription>
                    A pessoa precisa já ter criado a conta na tela de login antes de você conseguir vinculá-la aqui.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>E-mail do usuário</Label>
                    <Input value={convidarEmail} onChange={(e) => setConvidarEmail(e.target.value)} placeholder="pessoa@exemplo.com" />
                  </div>
                  <div>
                    <Label>Papel</Label>
                    <Select value={convidarPapelId} onValueChange={setConvidarPapelId}>
                      <SelectTrigger><SelectValue placeholder="Selecione o papel" /></SelectTrigger>
                      <SelectContent>
                        {papeis?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => convidarUsuario.mutate()} disabled={!convidarEmail || !convidarPapelId || convidarUsuario.isPending}>
                    {convidarUsuario.isPending ? "Vinculando..." : "Vincular"}
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
                    <TableHead>E-mail</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!usuarios?.length && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum usuário vinculado ainda.</TableCell></TableRow>
                  )}
                  {usuarios?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.profiles?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{u.profiles?.email ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{u.papeis?.nome ?? "—"}</Badge></TableCell>
                      <TableCell><Badge variant={u.ativo ? "default" : "secondary"}>{u.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => toggleAtivo.mutate({ id: u.id, ativo: !u.ativo })}>
                          {u.ativo ? "Desativar" : "Reativar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="papeis" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Papéis</CardTitle>
                <Dialog open={novoPapelOpen} onOpenChange={setNovoPapelOpen}>
                  <DialogTrigger asChild><Button size="icon" variant="ghost"><Plus className="h-4 w-4" /></Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Novo papel</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Nome</Label><Input value={novoPapelNome} onChange={(e) => setNovoPapelNome(e.target.value)} /></div>
                      <div><Label>Descrição</Label><Input value={novoPapelDesc} onChange={(e) => setNovoPapelDesc(e.target.value)} /></div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => criarPapel.mutate()} disabled={!novoPapelNome || criarPapel.isPending}>Criar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-1">
                {papeis?.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPapelSelecionado(p)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${papelSelecionado?.id === p.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    {p.nome}
                    {p.escola_id === null && <span className="text-xs opacity-70 ml-1">(modelo)</span>}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  {papelSelecionado ? `Permissões: ${papelSelecionado.nome}` : "Selecione um papel"}
                </CardTitle>
                {papelSelecionado?.escola_id === null && (
                  <CardDescription>Este é um papel-modelo (somente leitura). Crie um papel novo para editar permissões.</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {papelSelecionado && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Módulo</TableHead>
                        {ACOES.map((a) => <TableHead key={a} className="text-center capitalize">{a}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modulos?.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.nome}</TableCell>
                          {ACOES.map((acao) => {
                            const perm = permissoes?.find((p) => p.modulo_id === m.id && p.acao === acao);
                            if (!perm) return <TableCell key={acao} />;
                            return (
                              <TableCell key={acao} className="text-center">
                                <Checkbox
                                  checked={temPermissao(perm.id)}
                                  disabled={papelSelecionado.escola_id === null}
                                  onCheckedChange={(v) => togglePermissao.mutate({ permissaoId: perm.id, marcado: !!v })}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
