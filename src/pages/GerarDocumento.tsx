import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Printer, FileSignature, Copy } from "lucide-react";
import { toast } from "sonner";

type Campo = {
  chave: string;
  rotulo: string;
  tipo_dado: string;
  origem: string;
  obrigatorio: boolean;
  opcoes_selecao: string[] | null;
};

export default function GerarDocumento() {
  const [templateId, setTemplateId] = useState<string>("");
  const [alunoId, setAlunoId] = useState<string>("");
  const [valoresManuais, setValoresManuais] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<string | null>(null);

  const { data: templates } = useQuery({
    queryKey: ["templates-para-gerar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: alunos } = useQuery({
    queryKey: ["alunos-para-gerar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alunos")
        .select("id, nome")
        .eq("status", "Ativo")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: campos } = useQuery({
    queryKey: ["campos-manuais", templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_template_campos")
        .select("chave, rotulo, tipo_dado, origem, obrigatorio, opcoes_selecao")
        .eq("template_id", templateId)
        .eq("origem", "manual")
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as Campo[];
    },
  });

  const gerar = useMutation({
    mutationFn: async () => {
      // O RPC espera as chaves sem o prefixo "manual." (ex: manual.valor -> valor)
      const payload: Record<string, string> = {};
      Object.entries(valoresManuais).forEach(([k, v]) => {
        const chaveSimples = k.includes(".") ? k.split(".")[1] : k;
        payload[chaveSimples] = v;
      });

      const { data, error } = await supabase.rpc("gerar_documento", {
        p_template_id: templateId,
        p_aluno_id: alunoId,
        p_valores_manuais: payload,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (html) => {
      setResultado(html);
      toast.success("Documento gerado");
    },
    onError: (err: any) => toast.error("Erro ao gerar documento: " + err.message),
  });

  const camposFaltando = campos?.filter((c) => c.obrigatorio && !valoresManuais[c.chave]) ?? [];
  const podeGerar = !!templateId && !!alunoId && camposFaltando.length === 0;

  const copiar = () => {
    if (!resultado) return;
    const textoLimpo = resultado.replace(/<[^>]+>/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    navigator.clipboard.writeText(textoLimpo);
    toast.success("Copiado para a área de transferência");
  };

  const imprimir = () => {
    if (!resultado) return;
    const janela = window.open("", "_blank");
    if (!janela) return;
    janela.document.write(`
      <html><head><title>Documento</title>
      <style>body{font-family: Georgia, serif; font-size: 14px; line-height:1.6; max-width:700px; margin:40px auto; padding:0 20px;}</style>
      </head><body>${resultado}</body></html>
    `);
    janela.document.close();
    janela.print();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileSignature className="h-6 w-6" /> Gerar Documento
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Escolha o documento e o aluno, preencha os campos pedidos e gere o texto pronto para imprimir.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Documento</Label>
              <Select value={templateId} onValueChange={(v) => { setTemplateId(v); setValoresManuais({}); setResultado(null); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o documento" /></SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Aluno</Label>
              <Select value={alunoId} onValueChange={(v) => { setAlunoId(v); setResultado(null); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                <SelectContent>
                  {alunos?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {campos && campos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              {campos.map((c) => (
                <div key={c.chave} className="space-y-1.5">
                  <Label>
                    {c.rotulo} {c.obrigatorio && <span className="text-destructive">*</span>}
                  </Label>
                  {c.opcoes_selecao ? (
                    <Select
                      value={valoresManuais[c.chave] ?? ""}
                      onValueChange={(v) => setValoresManuais({ ...valoresManuais, [c.chave]: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {c.opcoes_selecao.map((op) => (
                          <SelectItem key={op} value={op}>{op}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={c.tipo_dado === "numero" ? "number" : c.tipo_dado === "data" ? "date" : "text"}
                      value={valoresManuais[c.chave] ?? ""}
                      onChange={(e) => setValoresManuais({ ...valoresManuais, [c.chave]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <Button onClick={() => gerar.mutate()} disabled={!podeGerar || gerar.isPending}>
            {gerar.isPending ? "Gerando…" : "Gerar Documento"}
          </Button>
        </CardContent>
      </Card>

      {resultado && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label>Pré-visualização</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copiar}>
                  <Copy className="h-4 w-4 mr-1" /> Copiar
                </Button>
                <Button size="sm" onClick={imprimir}>
                  <Printer className="h-4 w-4 mr-1" /> Imprimir
                </Button>
              </div>
            </div>
            <div
              className="border rounded-md p-6 bg-white text-black max-w-2xl mx-auto"
              style={{ fontFamily: "Georgia, serif" }}
              dangerouslySetInnerHTML={{ __html: resultado }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
