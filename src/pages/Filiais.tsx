import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mascaraTelefone } from "@/lib/masks";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, Building2, MapPin, MoreHorizontal } from "lucide-react";
import { useCepLookup, mascaraCEP } from "@/hooks/useCepLookup";
import { useCnpjLookup, mascaraCNPJ } from "@/hooks/useCnpjLookup";

type Filial = {
  id: string;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  cidade: string | null;
  uf: string | null;
  endereco: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
};

const emptyForm = { nome: "", razao_social: "", cnpj: "", cidade: "", uf: "", endereco: "", cep: "", telefone: "", email: "" };

export default function Filiais() {
  const qc = useQueryClient();
  const { escolaAtivaId, refetchEscolas } = useEscolaAtiva();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Filial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { buscarCep, buscando: buscandoCep } = useCepLookup();
  const { buscarCnpj, buscando: buscandoCnpj } = useCnpjLookup();

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

  const handleCnpjBlur = async () => {
    const { dados: resultado, erro } = await buscarCnpj(form.cnpj);
    if (erro) { toast.error(erro); return; }
    if (!resultado) return;
    setForm((f) => ({
      ...f,
      nome: f.nome || resultado.nomeFantasia || resultado.razaoSocial,
      razao_social: f.razao_social || resultado.razaoSocial,
      telefone: f.telefone || resultado.telefone,
      email: f.email || resultado.email,
      cep: f.cep || resultado.cep,
      endereco: f.endereco || resultado.logradouro,
      cidade: f.cidade || resultado.cidade,
      uf: f.uf || resultado.uf,
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
      const campos = "id, nome, razao_social, cnpj, cidade, uf, endereco, cep, telefone, email, ativo";
      if (escolaAtual?.grupo_economico_id) {
        const { data, error } = await supabase
          .from("escolas")
          .select(campos)
          .eq("grupo_economico_id", escolaAtual.grupo_economico_id)
          .order("nome");
        if (error) throw error;
        return data as Filial[];
      }
      const { data, error } = await supabase
        .from("escolas")
        .select(campos)
        .eq("id", escolaAtivaId!);
      if (error) throw error;
      return data as Filial[];
    },
  });

  const abrirNovo = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const abrirEdicao = (f: Filial) => {
    setEditing(f);
    setForm({
      nome: f.nome, razao_social: f.razao_social ?? "", cnpj: f.cnpj ?? "", cidade: f.cidade ?? "", uf: f.uf ?? "",
      endereco: f.endereco ?? "", cep: f.cep ?? "", telefone: f.telefone ?? "", email: f.email ?? "",
    });
    setOpen(true);
  };

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
        p_cnpj: form.cnpj || null,
        p_email: form.email || null,
        p_razao_social: form.razao_social || null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: async (novaEscolaId) => {
      toast.success("Filial criada com sucesso!");
      qc.invalidateQueries({ queryKey: ["filiais"] });
      await refetchEscolas(novaEscolaId);
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error("Erro ao criar filial: " + e.message),
  });

  const atualizar = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase.rpc("atualizar_filial", {
        p_filial_id: editing.id,
        p_nome: form.nome,
        p_cnpj: form.cnpj || null,
        p_cidade: form.cidade || null,
        p_uf: form.uf || null,
        p_endereco: form.endereco || null,
        p_cep: form.cep || null,
        p_telefone: form.telefone || null,
        p_email: form.email || null,
        p_ativo: editing.ativo,
        p_razao_social: form.razao_social || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Filial atualizada!");
      qc.invalidateQueries({ queryKey: ["filiais"] });
      refetchEscolas();
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error("Erro ao atualizar: " + e.message),
  });

  const alternarAtivo = useMutation({
    mutationFn: async (f: Filial) => {
      const { error } = await supabase.rpc("atualizar_filial", {
        p_filial_id: f.id, p_nome: f.nome, p_cnpj: f.cnpj, p_cidade: f.cidade, p_uf: f.uf,
        p_endereco: f.endereco, p_cep: f.cep, p_telefone: f.telefone, p_email: f.email, p_ativo: !f.ativo,
        p_razao_social: f.razao_social,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["filiais"] });
    },
    onError: (e: any) => toast.error(e.message),
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
            <Button onClick={abrirNovo}><Plus className="h-4 w-4 mr-2" />Nova Filial</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Filial" : "Nova Filial"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Esses dados aparecem em documentos e relatórios gerados por esta filial."
                  : "Cria uma unidade nova com dados totalmente separados. Você já sai vinculado como administrador dela."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome da Filial *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Unidade Norte" />
              </div>
              <div>
                <Label>Razão Social</Label>
                <Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} placeholder="Nome jurídico/legal, como consta no CNPJ" />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: mascaraCNPJ(e.target.value) })}
                  onBlur={handleCnpjBlur}
                  placeholder="Digite pra preencher os dados automaticamente"
                />
                {buscandoCnpj && <p className="text-xs text-muted-foreground mt-1">Buscando dados na Receita Federal...</p>}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: mascaraTelefone(e.target.value) })} />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => editing ? atualizar.mutate() : criar.mutate()}
                disabled={!form.nome || criar.isPending || atualizar.isPending}
              >
                {criar.isPending || atualizar.isPending ? "Salvando..." : editing ? "Salvar Alterações" : "Criar Filial"}
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
                <TableHead>CNPJ</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              )}
              {filiais?.map((f) => (
                <TableRow key={f.id} className={f.id === escolaAtivaId ? "bg-muted/40" : ""}>
                  <TableCell className="font-medium">
                    {f.nome}
                    {f.id === escolaAtivaId && <Badge variant="outline" className="ml-2 text-xs">Você está aqui</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{f.cnpj || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {f.cidade ? (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{f.cidade} - {f.uf}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.ativo ? "default" : "outline"}>{f.ativo ? "Ativa" : "Inativa"}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => abrirEdicao(f)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alternarAtivo.mutate(f)}>
                          {f.ativo ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
