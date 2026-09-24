import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Landmark, CheckCircle2, Settings, Trash2, Plus, ListChecks, Timer } from "lucide-react";

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
        .select("banco, agencia, conta_corrente, codigo_beneficiario, posto, chave_pix, ambiente, ativo, conta_bancaria_id, multa_percentual, juros_mensal_percentual, tipo_cobranca, especie_documento, registrar_na_matricula, webhook_status, tem_credenciais")
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
        config={statusDoBanco("sicredi") ?? null}
      />

      <RegraPontualidade escolaId={escolaAtivaId} />

      <ToleranciaStatusAtrasado escolaId={escolaAtivaId} />

      <ValoresOpcionaisMatricula escolaId={escolaAtivaId} />
    </div>
  );
}

function RegraPontualidade({ escolaId }: { escolaId: string | null }) {
  const qc = useQueryClient();
  const [ativa, setAtiva] = useState(true);
  const [tolerancia, setTolerancia] = useState("0");

  const { data } = useQuery({
    queryKey: ["regra-pontualidade", escolaId],
    enabled: !!escolaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escolas")
        .select("pontualidade_ativa, pontualidade_dias_tolerancia")
        .eq("id", escolaId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setAtiva(data.pontualidade_ativa);
    setTolerancia(String(data.pontualidade_dias_tolerancia));
  }, [data]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!escolaId) return;
      const dias = Math.max(0, Number(tolerancia) || 0);
      const { error } = await supabase
        .from("escolas")
        .update({ pontualidade_ativa: ativa, pontualidade_dias_tolerancia: dias })
        .eq("id", escolaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Regra de pontualidade salva!");
      qc.invalidateQueries({ queryKey: ["regra-pontualidade", escolaId] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="h-4 w-4" /> Regra de Pontualidade
        </CardTitle>
        <CardDescription>
          Define se um título com desconto perde o desconto (passa a cobrar o valor integral) quando pago
          depois do vencimento, e quantos dias de tolerância a escola dá antes disso acontecer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Aplicar regra de pontualidade</p>
            <p className="text-xs text-muted-foreground">
              Se desligada, o desconto nunca é removido por atraso no pagamento.
            </p>
          </div>
          <Switch checked={ativa} onCheckedChange={setAtiva} />
        </div>

        {ativa && (
          <div className="flex items-end gap-3">
            <div className="w-40">
              <Label>Dias de tolerância</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={tolerancia}
                onChange={(e) => setTolerancia(e.target.value)}
                className="mt-1"
              />
            </div>
            <p className="text-xs text-muted-foreground pb-2">
              0 = perde o desconto assim que passar 1 dia do vencimento.
            </p>
          </div>
        )}

        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ToleranciaStatusAtrasado({ escolaId }: { escolaId: string | null }) {
  const qc = useQueryClient();
  const [tolerancia, setTolerancia] = useState("0");

  const { data } = useQuery({
    queryKey: ["tolerancia-status-atrasado", escolaId],
    enabled: !!escolaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escolas")
        .select("atraso_dias_tolerancia")
        .eq("id", escolaId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setTolerancia(String(data.atraso_dias_tolerancia));
  }, [data]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!escolaId) return;
      const dias = Math.max(0, Number(tolerancia) || 0);
      const { error } = await supabase
        .from("escolas")
        .update({ atraso_dias_tolerancia: dias })
        .eq("id", escolaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tolerância salva!");
      qc.invalidateQueries({ queryKey: ["tolerancia-status-atrasado", escolaId] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="h-4 w-4" /> Tolerância pra Status "Atrasado"
        </CardTitle>
        <CardDescription>
          Quantos dias após o vencimento um título ainda conta como Pendente antes de virar Atrasado (afeta
          o painel de inadimplência e os relatórios). Não tem relação com o desconto — isso é configurado na
          Regra de Pontualidade, acima.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="w-40">
            <Label>Dias de tolerância</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={tolerancia}
              onChange={(e) => setTolerancia(e.target.value)}
              className="mt-1"
            />
          </div>
          <p className="text-xs text-muted-foreground pb-2">
            0 = vira Atrasado assim que passar 1 dia do vencimento (comportamento atual).
          </p>
        </div>
        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </CardContent>
    </Card>
  );
}

type ConfigSicredi = {
  agencia: string; conta_corrente: string; codigo_beneficiario: string; posto: string; chave_pix: string;
  ambiente: string; conta_bancaria_id: string | null; multa_percentual: number; juros_mensal_percentual: number;
  tipo_cobranca: string; especie_documento: string; registrar_na_matricula: boolean; tem_credenciais: boolean | null; webhook_status: string | null;
};

const FORM_VAZIO = {
  agencia: "", conta_corrente: "", codigo_beneficiario: "", posto: "",
  codigo_acesso: "", x_api_key: "", chave_pix: "", ambiente: "homologacao",
  conta_bancaria_id: "", multa_percentual: "2", juros_mensal_percentual: "1",
  tipo_cobranca: "HIBRIDO", especie_documento: "DUPLICATA_MERCANTIL_INDICACAO",
  registrar_na_matricula: false,
};

function SicrediDialog({
  open,
  onOpenChange,
  escolaId,
  config,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escolaId: string | null;
  config: ConfigSicredi | null;
}) {
  const qc = useQueryClient();
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [ativandoWebhook, setAtivandoWebhook] = useState(false);
  const [confirmandoLote, setConfirmandoLote] = useState(false);
  const [enfileirando, setEnfileirando] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const jaConfigurado = !!config?.tem_credenciais;

  // Ao abrir, pré-preenche com o que já está salvo (os segredos nunca voltam do banco -
  // ficam em branco e, em branco, a função de salvar mantém o valor atual).
  useEffect(() => {
    if (!open) return;
    setForm(
      config
        ? {
            agencia: config.agencia, conta_corrente: config.conta_corrente,
            codigo_beneficiario: config.codigo_beneficiario, posto: config.posto,
            codigo_acesso: "", x_api_key: "", chave_pix: config.chave_pix, ambiente: config.ambiente,
            conta_bancaria_id: config.conta_bancaria_id ?? "",
            multa_percentual: String(config.multa_percentual), juros_mensal_percentual: String(config.juros_mensal_percentual),
            tipo_cobranca: config.tipo_cobranca, especie_documento: config.especie_documento,
            registrar_na_matricula: config.registrar_na_matricula,
          }
        : FORM_VAZIO
    );
  }, [open, config]);

  const { data: contas } = useQuery({
    queryKey: ["contas-bancarias-select", escolaId],
    enabled: !!escolaId && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("contas_bancarias").select("id, nome").eq("escola_id", escolaId!).order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const salvar = async () => {
    if (!escolaId) return;
    if (!form.agencia || !form.conta_corrente || !form.codigo_beneficiario || !form.posto || !form.chave_pix) {
      toast.error("Preencha agência, posto, conta, beneficiário e chave Pix.");
      return;
    }
    if (!jaConfigurado && (!form.codigo_acesso || !form.x_api_key)) {
      toast.error("Informe o código de acesso e a x-api-key.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.rpc("salvar_integracao_sicredi", {
      p_escola_id: escolaId,
      p_agencia: form.agencia,
      p_conta_corrente: form.conta_corrente,
      p_codigo_beneficiario: form.codigo_beneficiario,
      p_posto: form.posto,
      p_chave_pix: form.chave_pix,
      p_ambiente: form.ambiente,
      p_codigo_acesso: form.codigo_acesso || null,
      p_x_api_key: form.x_api_key || null,
      p_conta_bancaria_id: form.conta_bancaria_id || null,
      p_multa_percentual: Number(form.multa_percentual || 0),
      p_juros_mensal_percentual: Number(form.juros_mensal_percentual || 0),
      p_tipo_cobranca: form.tipo_cobranca,
      p_especie_documento: form.especie_documento,
      p_registrar_na_matricula: form.registrar_na_matricula,
    });
    setSalvando(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Integração Sicredi salva!");
    qc.invalidateQueries({ queryKey: ["integracoes-bancarias", escolaId] });
    onOpenChange(false);
  };

  const testarConexao = async () => {
    if (!escolaId) return;
    setTestando(true);
    const { data, error } = await supabase.functions.invoke("sicredi-testar", { body: { escola_id: escolaId } });
    setTestando(false);
    if (error || !data?.ok) {
      toast.error("Falha na conexão: " + (data?.erro ?? error?.message ?? "erro desconhecido"));
      return;
    }
    toast.success(`Conexão OK (${data.ambiente === "producao" ? "produção" : "homologação"}) — o Sicredi autenticou as credenciais salvas.`);
  };

  const { data: qtdPendentes } = useQuery({
    queryKey: ["cobranca-pendentes", escolaId],
    enabled: open && !!escolaId && jaConfigurado,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("cobranca_contar_pendentes", { p_escola_id: escolaId! });
      if (error) throw error;
      return (data as number) ?? 0;
    },
  });

  const registrarExistentes = async () => {
    if (!escolaId) return;
    setEnfileirando(true);
    const { data, error } = await supabase.rpc("cobranca_enfileirar_pendentes", { p_escola_id: escolaId });
    if (error) {
      setEnfileirando(false);
      toast.error("Não foi possível enfileirar os boletos: " + error.message);
      return;
    }
    // já dispara o primeiro lote; o resto o processamento automático (a cada minuto) termina
    await supabase.functions.invoke("sicredi-processar-fila", { body: { escola_id: escolaId } });
    setEnfileirando(false);
    setConfirmandoLote(false);
    qc.invalidateQueries({ queryKey: ["cobranca-pendentes", escolaId] });
    toast.success(`${data ?? 0} boletos na fila. Eles são registrados aos poucos (cerca de 30 por minuto).`);
  };

  const ativarRecebimento = async () => {
    if (!escolaId) return;
    setAtivandoWebhook(true);
    const { data, error } = await supabase.functions.invoke("sicredi-configurar-webhook", { body: { escola_id: escolaId } });
    setAtivandoWebhook(false);
    qc.invalidateQueries({ queryKey: ["integracoes-bancarias", escolaId] });
    if (error || !data?.ok) {
      toast.error("Não foi possível ativar o recebimento automático: " + (data?.erro ?? error?.message ?? "erro desconhecido"));
      return;
    }
    toast.success(data.ambiente === "producao" ? "Recebimento automático ativado: os pagamentos passam a dar baixa sozinhos." : "Comunicação com o webhook do Sicredi validada em homologação (contrato fictício). O contrato real é criado em produção.");
  };

  const selectCls = "mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
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
              <Label>Agência (código da cooperativa)</Label>
              <Input value={form.agencia} onChange={(e) => setForm({ ...form, agencia: e.target.value })} placeholder="0000" />
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
              <Input value={form.codigo_beneficiario} onChange={(e) => setForm({ ...form, codigo_beneficiario: e.target.value })} placeholder="00000" />
            </div>
            <div className="col-span-2">
              <Label>Código de Acesso (gerado no Internet Banking do Sicredi)</Label>
              <Input
                type="password" value={form.codigo_acesso}
                onChange={(e) => setForm({ ...form, codigo_acesso: e.target.value })}
                placeholder={jaConfigurado ? "•••••••• salvo — deixe em branco pra manter" : ""}
              />
            </div>
            <div className="col-span-2">
              <Label>X-API-KEY (Portal do Desenvolvedor Sicredi — muda entre homologação e produção)</Label>
              <Input
                type="password" value={form.x_api_key}
                onChange={(e) => setForm({ ...form, x_api_key: e.target.value })}
                placeholder={jaConfigurado ? "•••••••• salva — deixe em branco pra manter" : ""}
              />
            </div>
            <div className="col-span-2">
              <Label>Chave Pix da conta (pra emissão do boleto híbrido)</Label>
              <Input value={form.chave_pix} onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} />
            </div>
            <div>
              <Label>Ambiente</Label>
              <select value={form.ambiente} onChange={(e) => setForm({ ...form, ambiente: e.target.value })} className={selectCls}>
                <option value="homologacao">Homologação (testes)</option>
                <option value="producao">Produção</option>
              </select>
            </div>
            <div>
              <Label>Conta bancária que recebe</Label>
              <select value={form.conta_bancaria_id} onChange={(e) => setForm({ ...form, conta_bancaria_id: e.target.value })} className={selectCls}>
                <option value="">— não vincular —</option>
                {(contas ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Cobrança</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de boleto</Label>
                <select value={form.tipo_cobranca} onChange={(e) => setForm({ ...form, tipo_cobranca: e.target.value })} className={selectCls}>
                  <option value="HIBRIDO">Híbrido (boleto + Pix)</option>
                  <option value="NORMAL">Tradicional (sem Pix)</option>
                </select>
              </div>
              <div>
                <Label>Espécie do documento</Label>
                <Input value={form.especie_documento} onChange={(e) => setForm({ ...form, especie_documento: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Multa por atraso (%)</Label>
                <Input type="number" min="0" max="20" step="0.01" value={form.multa_percentual}
                  onChange={(e) => setForm({ ...form, multa_percentual: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Juros (% ao mês)</Label>
                <Input type="number" min="0" max="20" step="0.01" value={form.juros_mensal_percentual}
                  onChange={(e) => setForm({ ...form, juros_mensal_percentual: e.target.value })} className="mt-1" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Multa e juros valem depois do vencimento e são cobrados pelo próprio banco. O desconto de pontualidade
              vira desconto no boleto até a data de vencimento.
            </p>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div>
              <Label className="text-sm">Registrar boletos automaticamente na matrícula</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Ao gerar as parcelas de uma matrícula, cada uma vira boleto no Sicredi. Desligado, os boletos só saem pelo botão
                "Registrar boleto" do Financeiro.
              </p>
            </div>
            <Switch checked={form.registrar_na_matricula} onCheckedChange={(v) => setForm({ ...form, registrar_na_matricula: v })} />
          </div>

          <div className="flex gap-2">
            <Button onClick={salvar} disabled={salvando} className="flex-1">
              {salvando ? "Salvando…" : "Salvar Integração"}
            </Button>
            {jaConfigurado && (
              <Button variant="outline" onClick={testarConexao} disabled={testando}>
                {testando ? "Testando…" : "Testar conexão"}
              </Button>
            )}
          </div>
          {jaConfigurado && (
            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Baixa automática de pagamentos</p>
                  <p className="text-xs text-muted-foreground">
                    Situação: {config?.webhook_status === "ativo" ? "ativa" : config?.webhook_status === "homologacao" ? "testada em homologação (contrato fictício — o real só existe em produção)" : config?.webhook_status ? config.webhook_status : "não ativada"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={ativarRecebimento} disabled={ativandoWebhook}>
                  {ativandoWebhook ? "Ativando…" : config?.webhook_status === "ativo" ? "Reativar" : "Ativar"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O Sicredi avisa o sistema quando um boleto ou Pix é pago; a parcela vira "Paga" e entra na conta bancária.
              </p>
            </div>
          )}
          {jaConfigurado && (qtdPendentes ?? 0) > 0 && (
            <div className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-medium">Parcelas já existentes sem boleto: {qtdPendentes}</p>
              <p className="text-xs text-muted-foreground">
                Pendentes ou atrasadas que ainda não têm boleto no Sicredi (inclui as que deram erro).
              </p>
              {!confirmandoLote ? (
                <Button variant="outline" size="sm" onClick={() => setConfirmandoLote(true)}>
                  Registrar boletos dessas parcelas…
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs">
                    Vai registrar <strong>{qtdPendentes}</strong> boletos no ambiente{" "}
                    <strong>{form.ambiente === "producao" ? "de PRODUÇÃO (boletos reais, com cobrança)" : "de homologação (teste)"}</strong>. Confirma?
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={registrarExistentes} disabled={enfileirando}>
                      {enfileirando ? "Enfileirando…" : "Confirmar"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmandoLote(false)} disabled={enfileirando}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {jaConfigurado && (
            <p className="text-xs text-muted-foreground">
              "Testar conexão" usa as credenciais já salvas — salve antes se acabou de alterar algo.
            </p>
          )}
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
