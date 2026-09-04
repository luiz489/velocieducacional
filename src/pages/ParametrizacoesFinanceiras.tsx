import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Landmark, CheckCircle2, Settings, Trash2, Plus, ListChecks } from "lucide-react";

/**
 * Catálogo de bancos com integração disponível no sistema. Pra adicionar um
 * banco novo no futuro, basta acrescentar um item aqui (e a tela de
 * configuração correspondente) - o catálogo já lista automaticamente.
 */
const BANCOS_DISPONIVEIS = [
  {
    codigo: "sicredi",
    nome: "Sicredi",
    descricao: "Boleto híbrido (com QR Code Pix embutido) via API de Cobrança. Sem certificado digital.",
  },
] as const;

export default function ParametrizacoesFinanceiras() {
  const { escolaAtivaId } = useEscolaAtiva();
  const [bancoAberto, setBancoAberto] = useState<string | null>(null);

  const { data: integracoes } = useQuery({
    queryKey: ["integracoes-bancarias", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escolas_integracao_bancaria")
        .select("banco, agencia, conta_corrente, ambiente, ativo")
        .eq("escola_id", escolaAtivaId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const statusDoBanco = (codigo: string) => integracoes?.find((i) => i.banco === codigo);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Landmark className="h-6 w-6" /> Parametrizações Financeiras
        </h1>
        <p className="text-sm text-muted-foreground">
          Bancos com integração disponível pra emissão de boleto/Pix direto pela API. Configure aqui as
          credenciais da conta bancária desta escola.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {BANCOS_DISPONIVEIS.map((banco) => {
          const status = statusDoBanco(banco.codigo);
          return (
            <Card key={banco.codigo}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{banco.nome}</CardTitle>
                  {status ? (
                    <Badge className="gap-1 bg-success/15 text-success hover:bg-success/15">
                      <CheckCircle2 className="h-3 w-3" /> Configurado
                    </Badge>
                  ) : (
                    <Badge variant="outline">Não configurado</Badge>
                  )}
                </div>
                <CardDescription>{banco.descricao}</CardDescription>
              </CardHeader>
              <CardContent>
                {status && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Agência {status.agencia} / Conta {status.conta_corrente} —{" "}
                    {status.ambiente === "producao" ? "Produção" : "Homologação (testes)"}
                  </p>
                )}
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setBancoAberto(banco.codigo)}>
                  <Settings className="h-4 w-4" /> {status ? "Editar" : "Configurar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <SicrediDialog
        open={bancoAberto === "sicredi"}
        onOpenChange={(open) => setBancoAberto(open ? "sicredi" : null)}
        escolaId={escolaAtivaId}
      />

      <ValoresOpcionaisMatricula escolaId={escolaAtivaId} />
    </div>
  );
}

function SicrediDialog({
  open,
  onOpenChange,
  escolaId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escolaId: string | null;
}) {
  const qc = useQueryClient();
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    agencia: "", conta_corrente: "", codigo_beneficiario: "", posto: "",
    codigo_acesso: "", x_api_key: "", chave_pix: "", ambiente: "homologacao",
  });

  const salvar = async () => {
    if (!escolaId) return;
    if (!form.agencia || !form.conta_corrente || !form.codigo_beneficiario || !form.posto || !form.codigo_acesso || !form.x_api_key || !form.chave_pix) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.from("escolas_integracao_bancaria").upsert({
      escola_id: escolaId,
      banco: "sicredi",
      agencia: form.agencia,
      conta_corrente: form.conta_corrente,
      codigo_beneficiario: form.codigo_beneficiario,
      posto: form.posto,
      codigo_acesso: form.codigo_acesso,
      x_api_key: form.x_api_key,
      chave_pix: form.chave_pix,
      ambiente: form.ambiente,
    }, { onConflict: "escola_id" });
    setSalvando(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Integração Sicredi salva!");
    setForm({ agencia: "", conta_corrente: "", codigo_beneficiario: "", posto: "", codigo_acesso: "", x_api_key: "", chave_pix: "", ambiente: "homologacao" });
    qc.invalidateQueries({ queryKey: ["integracoes-bancarias", escolaId] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Integração Bancária — Sicredi</DialogTitle>
          <DialogDescription>
            Emissão de boleto híbrido (com QR Code Pix) direto pela API do Sicredi. Precisa ter o produto
            Cobrança (modalidade API) contratado com sua cooperativa, e ter optado pela opção de boleto híbrido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Agência</Label>
              <Input value={form.agencia} onChange={(e) => setForm({ ...form, agencia: e.target.value })} placeholder="00000" />
            </div>
            <div>
              <Label>Posto</Label>
              <Input value={form.posto} onChange={(e) => setForm({ ...form, posto: e.target.value })} placeholder="00" />
            </div>
            <div>
              <Label>Conta Corrente</Label>
              <Input value={form.conta_corrente} onChange={(e) => setForm({ ...form, conta_corrente: e.target.value })} />
            </div>
            <div>
              <Label>Código do Beneficiário (Convênio)</Label>
              <Input value={form.codigo_beneficiario} onChange={(e) => setForm({ ...form, codigo_beneficiario: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Código de Acesso (gerado no Internet Banking do Sicredi)</Label>
              <Input type="password" value={form.codigo_acesso} onChange={(e) => setForm({ ...form, codigo_acesso: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>X-API-KEY (Portal do Desenvolvedor Sicredi)</Label>
              <Input type="password" value={form.x_api_key} onChange={(e) => setForm({ ...form, x_api_key: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Chave Pix da conta (pra emissão do boleto híbrido)</Label>
              <Input value={form.chave_pix} onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} />
            </div>
            <div>
              <Label>Ambiente</Label>
              <select
                value={form.ambiente}
                onChange={(e) => setForm({ ...form, ambiente: e.target.value })}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="homologacao">Homologação (testes)</option>
                <option value="producao">Produção</option>
              </select>
            </div>
          </div>
          <Button onClick={salvar} disabled={salvando} className="w-full">
            {salvando ? "Salvando…" : "Salvar Integração"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ValoresOpcionaisMatricula({ escolaId }: { escolaId: string | null }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");

  const { data: opcionais } = useQuery({
    queryKey: ["valores-opcionais-matricula", escolaId],
    enabled: !!escolaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("valores_opcionais_matricula")
        .select("*")
        .eq("escola_id", escolaId!)
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      if (!escolaId) return;
      const { error } = await supabase.from("valores_opcionais_matricula").insert({
        escola_id: escolaId,
        nome,
        valor: Number(valor),
        ordem: opcionais?.length ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Valor opcional adicionado!");
      setNome("");
      setValor("");
      qc.invalidateQueries({ queryKey: ["valores-opcionais-matricula", escolaId] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("valores_opcionais_matricula").update({ ativo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido.");
      qc.invalidateQueries({ queryKey: ["valores-opcionais-matricula", escolaId] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="h-4 w-4" /> Valores Opcionais da Matrícula
        </CardTitle>
        <CardDescription>
          Itens que a família pode marcar na hora da matrícula, somando ao valor da mensalidade (ex: Almoço).
          O desconto/bolsa continua aplicando sobre o total (mensalidade + opcionais marcados).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {opcionais?.length ? (
          <div className="space-y-2">
            {opcionais.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span className="font-medium">{o.nome}</span>
                <div className="flex items-center gap-3">
                  <span>R$ {Number(o.valor).toFixed(2)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => excluir.mutate(o.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum valor opcional cadastrado ainda.</p>
        )}

        <div className="flex gap-2 items-end border-t pt-4">
          <div className="flex-1">
            <Label>Nome</Label>
            <Input placeholder="Ex: Almoço" value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1" />
          </div>
          <div className="w-32">
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} className="mt-1" />
          </div>
          <Button onClick={() => criar.mutate()} disabled={!nome || !valor || criar.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
