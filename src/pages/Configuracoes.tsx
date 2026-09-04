import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mascaraTelefone } from "@/lib/masks";
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
import { ShieldCheck, UserPlus, UserCog, Plus, Settings } from "lucide-react";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { useCepLookup, mascaraCEP } from "@/hooks/useCepLookup";
import { useCnpjLookup, mascaraCNPJ } from "@/hooks/useCnpjLookup";
import { CAMPOS_MATRICULA_CONFIGURAVEIS } from "@/components/AlunoCamposFieldset";

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
  const [abaCadastro, setAbaCadastro] = useState<"novo" | "existente">("novo");
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novoPapelId, setNovoPapelId] = useState("");
  const [convidarEmail, setConvidarEmail] = useState("");
  const [convidarPapelId, setConvidarPapelId] = useState("");

  const { data: papeis } = useQuery({
    queryKey: ["papeis", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("papeis")
        .select("id, nome, descricao, escola_id, papel_sistema")
        .eq("escola_id", escolaAtivaId!)
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

  const criarUsuarioNovo = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-criar-usuario`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: novoEmail,
            password: novaSenha,
            full_name: novoNome,
            escola_id: escolaAtivaId,
            papel_id: novoPapelId,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao criar usuário");
      return data;
    },
    onSuccess: () => {
      toast.success("Usuário criado e vinculado com sucesso");
      qc.invalidateQueries({ queryKey: ["usuarios-escola"] });
      setConvidarOpen(false);
      setNovoNome("");
      setNovoEmail("");
      setNovaSenha("");
      setNovoPapelId("");
    },
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

  const solicitarResetSenha = async (email: string | undefined) => {
    if (!email) return;
    if (!confirm(`Enviar e-mail de redefinição de senha para ${email}?`)) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) {
      toast.error("Erro ao enviar: " + error.message);
      return;
    }
    toast.success(`E-mail de redefinição enviado para ${email}.`);
  };

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
          <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={convidarOpen} onOpenChange={setConvidarOpen}>
              <DialogTrigger asChild>
                <Button><UserPlus className="h-4 w-4 mr-2" />Novo usuário</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar usuário à escola</DialogTitle>
                </DialogHeader>
                <Tabs value={abaCadastro} onValueChange={(v) => setAbaCadastro(v as "novo" | "existente")}>
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="novo"><UserPlus className="h-4 w-4 mr-1.5" />Criar novo</TabsTrigger>
                    <TabsTrigger value="existente"><UserCog className="h-4 w-4 mr-1.5" />Já tem conta</TabsTrigger>
                  </TabsList>

                  <TabsContent value="novo" className="space-y-3 mt-3">
                    <DialogDescription>
                      Cria a conta de login direto por aqui, com uma senha temporária que você repassa pra pessoa.
                    </DialogDescription>
                    <div>
                      <Label>Nome completo</Label>
                      <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome da pessoa" />
                    </div>
                    <div>
                      <Label>E-mail</Label>
                      <Input type="email" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} placeholder="pessoa@exemplo.com" />
                    </div>
                    <div>
                      <Label>Senha temporária</Label>
                      <Input type="text" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
                    </div>
                    <div>
                      <Label>Papel</Label>
                      <Select value={novoPapelId} onValueChange={setNovoPapelId}>
                        <SelectTrigger><SelectValue placeholder="Selecione o papel" /></SelectTrigger>
                        <SelectContent>
                          {papeis?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => criarUsuarioNovo.mutate()}
                        disabled={!novoNome || !novoEmail || novaSenha.length < 6 || !novoPapelId || criarUsuarioNovo.isPending}
                      >
                        {criarUsuarioNovo.isPending ? "Criando..." : "Criar e vincular"}
                      </Button>
                    </DialogFooter>
                  </TabsContent>

                  <TabsContent value="existente" className="space-y-3 mt-3">
                    <DialogDescription>
                      Use isso se a pessoa já criou a própria conta na tela de login (ex: já usa em outra escola).
                    </DialogDescription>
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
                    <DialogFooter>
                      <Button onClick={() => convidarUsuario.mutate()} disabled={!convidarEmail || !convidarPapelId || convidarUsuario.isPending}>
                        {convidarUsuario.isPending ? "Vinculando..." : "Vincular"}
                      </Button>
                    </DialogFooter>
                  </TabsContent>
                </Tabs>
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
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => solicitarResetSenha(u.profiles?.email)} disabled={!u.profiles?.email}>
                          Resetar Senha
                        </Button>
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

        <TabsContent value="parametros" className="space-y-4 mt-4">
          <ParametrosTab escolaId={escolaAtivaId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ParametrosTab({ escolaId }: { escolaId: string | null }) {
  const qc = useQueryClient();
  const { refetchEscolas } = useEscolaAtiva();
  const [salvandoModelo, setSalvandoModelo] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [dadosForm, setDadosForm] = useState({
    nome: "", razao_social: "", cnpj: "", cidade: "", uf: "", endereco: "", cep: "", telefone: "", email: "",
  });
  const { buscarCep, buscando: buscandoCep } = useCepLookup();
  const { buscarCnpj, buscando: buscandoCnpj } = useCnpjLookup();

  const handleCepBlur = async () => {
    const resultado = await buscarCep(dadosForm.cep);
    if (!resultado) return;
    setDadosForm((f) => ({
      ...f,
      endereco: f.endereco || resultado.logradouro,
      cidade: resultado.cidade,
      uf: resultado.uf,
    }));
  };

  const handleCnpjBlur = async () => {
    const { dados: resultado, erro } = await buscarCnpj(dadosForm.cnpj);
    if (erro) { toast.error(erro); return; }
    if (!resultado) return;
    setDadosForm((f) => ({
      ...f,
      nome: f.nome || resultado.nomeFantasia || resultado.razaoSocial,
      razao_social: f.razao_social || resultado.razaoSocial,
      telefone: f.telefone || resultado.telefone,
      cep: f.cep || resultado.cep,
      endereco: f.endereco || resultado.logradouro,
      cidade: f.cidade || resultado.cidade,
      uf: f.uf || resultado.uf,
    }));
  };

  const { data: escola } = useQuery({
    queryKey: ["escola-parametros", escolaId],
    enabled: !!escolaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escolas")
        .select("id, nome, razao_social, modelo_avaliacao, logo_url, cnpj, cidade, uf, endereco, cep, telefone, email, campos_matricula_visiveis, dia_faturamento_automatico")
        .eq("id", escolaId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: logoUrlAssinada } = useSignedUrl("escola-logos", escola?.logo_url);
  const [camposMatricula, setCamposMatricula] = useState<Record<string, boolean>>({});
  const [salvandoCampos, setSalvandoCampos] = useState(false);
  const [diaFaturamento, setDiaFaturamento] = useState("");
  const [salvandoFaturamento, setSalvandoFaturamento] = useState(false);

  useEffect(() => {
    if (escola) {
      setCamposMatricula((escola as any).campos_matricula_visiveis ?? {});
      setDiaFaturamento((escola as any).dia_faturamento_automatico ? String((escola as any).dia_faturamento_automatico) : "");
    }
  }, [escola]);

  const salvarDiaFaturamento = async () => {
    if (!escolaId) return;
    setSalvandoFaturamento(true);
    const { error } = await supabase
      .from("escolas")
      .update({ dia_faturamento_automatico: diaFaturamento ? Number(diaFaturamento) : null })
      .eq("id", escolaId);
    setSalvandoFaturamento(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success(diaFaturamento ? "Faturamento automático configurado!" : "Faturamento automático desativado.");
    qc.invalidateQueries({ queryKey: ["escola-parametros", escolaId] });
  };

  const alternarCampoMatricula = (chave: string) => {
    setCamposMatricula((atual) => ({ ...atual, [chave]: atual[chave] === false ? true : false }));
  };

  const salvarCamposMatricula = async () => {
    if (!escolaId) return;
    setSalvandoCampos(true);
    const { error } = await supabase
      .from("escolas")
      .update({ campos_matricula_visiveis: camposMatricula })
      .eq("id", escolaId);
    setSalvandoCampos(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Campos da matrícula atualizados");
    qc.invalidateQueries({ queryKey: ["escola-parametros", escolaId] });
    qc.invalidateQueries({ queryKey: ["campos-matricula-visiveis", escolaId] });
  };


  useEffect(() => {
    if (escola) {
      setDadosForm({
        nome: escola.nome ?? "",
        razao_social: (escola as any).razao_social ?? "",
        cnpj: escola.cnpj ?? "",
        cidade: escola.cidade ?? "",
        uf: escola.uf ?? "",
        endereco: escola.endereco ?? "",
        cep: (escola as any).cep ?? "",
        telefone: escola.telefone ?? "",
        email: escola.email ?? "",
      });
    }
  }, [escola]);

  const salvarDados = async () => {
    if (!escolaId) return;
    if (!dadosForm.nome.trim()) {
      toast.error("O nome da escola não pode ficar em branco.");
      return;
    }
    setSalvandoDados(true);
    const { error } = await supabase.from("escolas").update({
      nome: dadosForm.nome.trim(),
      razao_social: dadosForm.razao_social || null,
      cnpj: dadosForm.cnpj || null,
      cidade: dadosForm.cidade || null,
      uf: dadosForm.uf || null,
      endereco: dadosForm.endereco || null,
      cep: dadosForm.cep || null,
      telefone: dadosForm.telefone || null,
      email: dadosForm.email || null,
    }).eq("id", escolaId);
    setSalvandoDados(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Dados da escola atualizados");
    qc.invalidateQueries({ queryKey: ["escola-parametros", escolaId] });
    qc.invalidateQueries({ queryKey: ["escola-logo", escolaId] });
    await refetchEscolas();
  };

  const salvarModelo = async (novoModelo: string) => {
    if (!escolaId) return;
    setSalvandoModelo(true);
    const { error } = await supabase.from("escolas").update({ modelo_avaliacao: novoModelo }).eq("id", escolaId);
    setSalvandoModelo(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Modelo de avaliação atualizado");
    qc.invalidateQueries({ queryKey: ["escola-parametros", escolaId] });
  };

  const enviarLogo = async (file: File) => {
    if (!escolaId) return;
    setEnviandoLogo(true);
    const extensao = file.name.split(".").pop();
    const caminho = `${escolaId}/logo.${extensao}`;

    const { error: erroUpload } = await supabase.storage
      .from("escola-logos")
      .upload(caminho, file, { upsert: true });

    if (erroUpload) {
      setEnviandoLogo(false);
      toast.error("Erro ao enviar logo: " + erroUpload.message);
      return;
    }

    // Guarda só o caminho no banco - a URL de exibição é assinada (temporária)
    // e gerada na hora de mostrar, não fica exposta publicamente.
    const { error: erroUpdate } = await supabase
      .from("escolas")
      .update({ logo_url: caminho })
      .eq("id", escolaId);

    setEnviandoLogo(false);
    if (erroUpdate) {
      toast.error("Logo enviada, mas erro ao salvar: " + erroUpdate.message);
      return;
    }
    toast.success("Logotipo atualizado!");
    qc.invalidateQueries({ queryKey: ["escola-parametros", escolaId] });
    qc.invalidateQueries({ queryKey: ["signed-url", "escola-logos", caminho] });
    qc.invalidateQueries({ queryKey: ["escola-logo", escolaId] });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da Escola</CardTitle>
          <CardDescription>
            Nome e informações básicas exibidas na sidebar, carteirinhas e documentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Nome da Escola (Nome Fantasia)</Label>
            <Input
              value={dadosForm.nome}
              onChange={(e) => setDadosForm({ ...dadosForm, nome: e.target.value })}
              placeholder="Como a escola é conhecida"
            />
          </div>
          <div>
            <Label>Razão Social</Label>
            <Input
              value={dadosForm.razao_social}
              onChange={(e) => setDadosForm({ ...dadosForm, razao_social: e.target.value })}
              placeholder="Nome jurídico/legal, como consta no CNPJ"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CNPJ</Label>
              <Input
                value={dadosForm.cnpj}
                onChange={(e) => setDadosForm({ ...dadosForm, cnpj: mascaraCNPJ(e.target.value) })}
                onBlur={handleCnpjBlur}
                placeholder="Digite pra preencher os dados automaticamente"
              />
              {buscandoCnpj && <p className="text-xs text-muted-foreground mt-1">Buscando dados na Receita Federal...</p>}
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={dadosForm.telefone} onChange={(e) => setDadosForm({ ...dadosForm, telefone: mascaraTelefone(e.target.value) })} />
            </div>
            <div>
              <Label>CEP</Label>
              <Input
                value={dadosForm.cep}
                placeholder="00000-000"
                onChange={(e) => setDadosForm({ ...dadosForm, cep: mascaraCEP(e.target.value) })}
                onBlur={handleCepBlur}
              />
              {buscandoCep && <p className="text-xs text-muted-foreground mt-1">Buscando endereço...</p>}
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={dadosForm.cidade} onChange={(e) => setDadosForm({ ...dadosForm, cidade: e.target.value })} />
            </div>
            <div>
              <Label>UF</Label>
              <Input value={dadosForm.uf} maxLength={2} onChange={(e) => setDadosForm({ ...dadosForm, uf: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Endereço</Label>
            <Input value={dadosForm.endereco} onChange={(e) => setDadosForm({ ...dadosForm, endereco: e.target.value })} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={dadosForm.email} onChange={(e) => setDadosForm({ ...dadosForm, email: e.target.value })} />
          </div>
          <Button onClick={salvarDados} disabled={salvandoDados}>
            {salvandoDados ? "Salvando…" : "Salvar Dados da Escola"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modelo de Avaliação</CardTitle>
          <CardDescription>
            Define como o boletim e as notas funcionam para esta escola.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <button
            onClick={() => salvarModelo("simplificado")}
            disabled={salvandoModelo}
            className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${
              escola?.modelo_avaliacao === "simplificado" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
            }`}
          >
            <p className="font-medium text-sm">Simplificado</p>
            <p className="text-xs text-muted-foreground mt-0.5">AV1 + AV2 + recuperação única por disciplina.</p>
          </button>
          <button
            onClick={() => salvarModelo("bimestral")}
            disabled={salvandoModelo}
            className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${
              escola?.modelo_avaliacao === "bimestral" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
            }`}
          >
            <p className="font-medium text-sm">Bimestral</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              4 bimestres + recuperação por semestre: (B1+B2+Rec)/2 e (B3+B4+Rec)/2.
            </p>
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logotipo da Escola</CardTitle>
          <CardDescription>
            Aparece na barra lateral, na tela de carteirinhas e em outros documentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {logoUrlAssinada ? (
                <img src={logoUrlAssinada} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground text-center px-1">Sem logo</span>
              )}
            </div>
            <div className="flex-1">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={enviandoLogo}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) enviarLogo(file);
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou WEBP. Ficará melhor com fundo transparente e formato quadrado.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campos da Matrícula</CardTitle>
          <CardDescription>
            Marque só os campos que devem aparecer no formulário de "novo aluno" ao criar uma Nova Matrícula.
            Nome, CPF, data de nascimento e nome do responsável são sempre obrigatórios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {CAMPOS_MATRICULA_CONFIGURAVEIS.map((c) => (
            <label key={c.chave} className="flex items-center gap-3 text-sm cursor-pointer py-1">
              <Checkbox
                checked={camposMatricula[c.chave] !== false}
                onCheckedChange={() => alternarCampoMatricula(c.chave)}
              />
              {c.rotulo}
            </label>
          ))}
          <Button onClick={salvarCamposMatricula} disabled={salvandoCampos} className="mt-2">
            {salvandoCampos ? "Salvando…" : "Salvar Campos da Matrícula"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Faturamento Automático</CardTitle>
          <CardDescription>
            Escolha um dia do mês para que as mensalidades do mês seguinte sejam faturadas sozinhas
            (viram Contas a Receber automaticamente). Deixe em branco para faturar só manualmente,
            pela Central de Faturamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-w-[200px]">
            <Label>Dia do mês (1 a 28)</Label>
            <Input
              type="number" min="1" max="28"
              value={diaFaturamento}
              onChange={(e) => setDiaFaturamento(e.target.value)}
              placeholder="Ex: 25"
            />
          </div>
          <Button onClick={salvarDiaFaturamento} disabled={salvandoFaturamento}>
            {salvandoFaturamento ? "Salvando…" : "Salvar"}
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
