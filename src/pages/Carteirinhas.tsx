import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { AvatarFoto } from "@/components/AvatarFoto";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { IdCard, RefreshCw, Eye, Upload, Printer, GraduationCap } from "lucide-react";
import QRCode from "qrcode";

type Aluno = { id: string; nome: string; cpf: string; data_nascimento: string; foto_url: string | null };
type Carteirinha = {
  id: string;
  aluno_id: string;
  codigo: string;
  validade: string;
  qr_data: string | null;
  status: "Ativa" | "Bloqueada" | "Vencida";
  emitida_em: string;
};

/** Formata YYYY-MM-DD sem sofrer o deslocamento de fuso horário do new Date(). */
function formatarDataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

export default function Carteirinhas() {
  const qc = useQueryClient();
  const { escolaAtivaId, escolas } = useEscolaAtiva();
  const escolaNome = escolas.find((e) => e.escola_id === escolaAtivaId)?.nome ?? "Escola";
  const [preview, setPreview] = useState<{ aluno: Aluno; carteira: Carteirinha } | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [qrImg, setQrImg] = useState<string | null>(null);

  const { data: escolaLogoPath } = useQuery({
    queryKey: ["escola-logo-carteirinha", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data } = await supabase.from("escolas").select("logo_url").eq("id", escolaAtivaId!).single();
      return data?.logo_url ?? null;
    },
  });
  const { data: escolaLogo } = useSignedUrl("escola-logos", escolaLogoPath);

  const { data: alunos } = useQuery({
    queryKey: ["alunos-cart", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("alunos").select("id, nome, cpf, data_nascimento, foto_url").eq("escola_id", escolaAtivaId!).order("nome");
      if (error) throw error;
      return data as Aluno[];
    },
  });

  const { data: carteiras } = useQuery({
    queryKey: ["carteirinhas", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("carteirinhas").select("*").eq("escola_id", escolaAtivaId!);
      if (error) throw error;
      return data as Carteirinha[];
    },
  });

  const cartMap = new Map(carteiras?.map((c) => [c.aluno_id, c]));

  useEffect(() => {
    if (!preview?.carteira.qr_data) { setQrImg(null); return; }
    QRCode.toDataURL(preview.carteira.qr_data, { width: 160, margin: 1 })
      .then(setQrImg)
      .catch(() => setQrImg(null));
  }, [preview]);

  const gerar = useMutation({
    mutationFn: async (aluno: Aluno) => {
      const existente = cartMap.get(aluno.id);
      const codigo = `${escolaNome.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-8)}`;
      const validade = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const qr_data = JSON.stringify({ codigo, aluno: aluno.nome, cpf: aluno.cpf });
      if (existente) {
        const { error } = await supabase.from("carteirinhas").update({
          codigo, validade, qr_data, status: "Ativa", emitida_em: new Date().toISOString().slice(0, 10),
        }).eq("id", existente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("carteirinhas").insert({
          aluno_id: aluno.id, codigo, validade, qr_data, status: "Ativa", escola_id: escolaAtivaId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Carteirinha emitida");
      qc.invalidateQueries({ queryKey: ["carteirinhas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const enviarFoto = async (file: File, aluno: Aluno) => {
    if (!escolaAtivaId) return;
    setEnviandoFoto(true);
    const extensao = file.name.split(".").pop();
    const caminho = `${escolaAtivaId}/alunos/${aluno.id}/foto.${extensao}`;
    const { error: erroUpload } = await supabase.storage.from("pessoas-fotos").upload(caminho, file, { upsert: true });
    if (erroUpload) {
      setEnviandoFoto(false);
      toast.error("Erro ao enviar foto: " + erroUpload.message);
      return;
    }
    const { error: erroUpdate } = await supabase.from("alunos").update({ foto_url: caminho }).eq("id", aluno.id);
    setEnviandoFoto(false);
    if (erroUpdate) {
      toast.error("Erro ao salvar foto: " + erroUpdate.message);
      return;
    }
    toast.success("Foto atualizada!");
    qc.invalidateQueries({ queryKey: ["alunos-cart"] });
    setPreview((p) => (p ? { ...p, aluno: { ...p.aluno, foto_url: caminho } } : p));
  };

  const handleImprimir = () => window.print();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <IdCard className="h-7 w-7 text-primary" /> Carteirinhas Escolares
        </h1>
        <p className="text-muted-foreground">Emita e reemita carteirinhas dos alunos, com foto e QR Code de verificação.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alunos</CardTitle>
          <CardDescription>Clique em "Gerar/Reemitir" para criar uma nova carteirinha válida por 1 ano.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alunos?.map((a) => {
                const c = cartMap.get(a.id);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <AvatarFoto path={a.foto_url} alt={a.nome} />
                      {a.nome}
                    </TableCell>
                    <TableCell>{c?.codigo ?? "—"}</TableCell>
                    <TableCell>{formatarDataBR(c?.validade)}</TableCell>
                    <TableCell>
                      {c ? <Badge variant={c.status === "Ativa" ? "default" : "destructive"}>{c.status}</Badge> : <Badge variant="outline">Sem carteirinha</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {c && (
                        <Button variant="ghost" size="icon" onClick={() => setPreview({ aluno: a, carteira: c })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => gerar.mutate(a)}>
                        <RefreshCw className="h-3 w-3 mr-1" /> {c ? "Reemitir" : "Gerar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Carteirinha Estudantil</DialogTitle>
            <DialogDescription>Confira os dados e imprima, ou troque a foto do aluno.</DialogDescription>
          </DialogHeader>
          {preview && (
            <>
              <div
                id="carteirinha-print"
                className="rounded-2xl border shadow-md overflow-hidden bg-white text-slate-900"
                style={{ width: "100%" }}
              >
                <div className="bg-gradient-to-r from-primary to-primary/70 px-4 py-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center overflow-hidden shrink-0">
                    {escolaLogo ? (
                      <img src={escolaLogo} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <GraduationCap className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-primary-foreground/80 truncate">{escolaNome}</div>
                    <div className="font-bold text-primary-foreground text-sm">Carteira de Estudante</div>
                  </div>
                </div>

                <div className="p-4 flex gap-4">
                  <AvatarFoto path={preview.aluno.foto_url} className="h-24 w-24 rounded-lg" iconSize="h-8 w-8" />
                  <div className="flex-1 min-w-0 space-y-1 text-sm">
                    <div className="font-bold text-base leading-tight truncate">{preview.aluno.nome}</div>
                    <div className="text-xs text-muted-foreground">CPF: {preview.aluno.cpf}</div>
                    <div className="text-xs text-muted-foreground">Nasc: {formatarDataBR(preview.aluno.data_nascimento)}</div>
                    <div className="text-xs text-muted-foreground">Código: <code>{preview.carteira.codigo}</code></div>
                    <div className="text-xs text-muted-foreground">Válida até: {formatarDataBR(preview.carteira.validade)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-center pb-4">
                  {qrImg ? (
                    <img src={qrImg} alt="QR Code de verificação" className="h-28 w-28" />
                  ) : (
                    <div className="h-28 w-28 rounded-md bg-muted animate-pulse" />
                  )}
                </div>

                <div className="border-t px-4 py-2 text-[10px] text-muted-foreground text-center">
                  Documento digital — escaneie o QR Code para verificar autenticidade
                </div>
              </div>

              <div className="space-y-2 print:hidden">
                <Label htmlFor="foto-aluno" className="cursor-pointer inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border hover:bg-muted w-full justify-center">
                  <Upload className="h-4 w-4" /> {enviandoFoto ? "Enviando..." : "Trocar foto do aluno"}
                </Label>
                <input
                  id="foto-aluno" type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                  disabled={enviandoFoto}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && preview) enviarFoto(file, preview.aluno);
                  }}
                />
                <Button onClick={handleImprimir} className="w-full">
                  <Printer className="h-4 w-4 mr-2" /> Imprimir
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
