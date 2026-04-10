import { useState } from "react";
import { Search, Plus, Filter, AlertTriangle, ThumbsUp, Eye, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

type TipoOcorrencia = "Advertência" | "Elogio" | "Observação";

interface Ocorrencia {
  id: string;
  aluno: string;
  turma: string;
  tipo: TipoOcorrencia;
  descricao: string;
  data: string;
  registrado_por: string;
}

const mockOcorrencias: Ocorrencia[] = [
  { id: "1", aluno: "Ana Carolina Silva", turma: "5º Ano A", tipo: "Elogio", descricao: "Excelente participação na feira de ciências, apresentou projeto de destaque.", data: "2026-04-08", registrado_por: "Prof. Marcos" },
  { id: "2", aluno: "João Pedro Souza", turma: "6º Ano B", tipo: "Advertência", descricao: "Uso de celular durante a aula de matemática após advertência verbal.", data: "2026-04-07", registrado_por: "Prof. Fernanda" },
  { id: "3", aluno: "Maria Fernanda Costa", turma: "4º Ano A", tipo: "Observação", descricao: "Aluna apresentou dificuldade na leitura, sugerido acompanhamento pedagógico.", data: "2026-04-05", registrado_por: "Prof. Clara" },
  { id: "4", aluno: "Pedro Henrique Santos", turma: "7º Ano B", tipo: "Advertência", descricao: "Envolvido em conflito com colega durante o intervalo.", data: "2026-04-04", registrado_por: "Coord. Roberto" },
  { id: "5", aluno: "Laura Beatriz Oliveira", turma: "5º Ano B", tipo: "Elogio", descricao: "Ajudou colegas com dificuldades na atividade em grupo de história.", data: "2026-04-03", registrado_por: "Prof. Juliana" },
  { id: "6", aluno: "Gabriel Almeida", turma: "6º Ano A", tipo: "Observação", descricao: "Frequentes atrasos nas últimas duas semanas. Responsável notificado.", data: "2026-04-02", registrado_por: "Secretaria" },
  { id: "7", aluno: "Isabela Rodrigues", turma: "4º Ano B", tipo: "Advertência", descricao: "Não entregou trabalho de português pela terceira vez consecutiva.", data: "2026-04-01", registrado_por: "Prof. Fernanda" },
  { id: "8", aluno: "Lucas Martins", turma: "7º Ano A", tipo: "Elogio", descricao: "Melhor nota da turma na avaliação de ciências. Parabéns pelo esforço!", data: "2026-03-30", registrado_por: "Prof. Marcos" },
];

const tipoConfig: Record<TipoOcorrencia, { icon: typeof AlertTriangle; color: string; badgeVariant: "destructive" | "default" | "secondary" }> = {
  "Advertência": { icon: AlertTriangle, color: "text-destructive", badgeVariant: "destructive" },
  "Elogio": { icon: ThumbsUp, color: "text-emerald-600", badgeVariant: "default" },
  "Observação": { icon: Eye, color: "text-amber-600", badgeVariant: "secondary" },
};

const mockAlunos = [
  "Ana Carolina Silva", "João Pedro Souza", "Maria Fernanda Costa",
  "Pedro Henrique Santos", "Laura Beatriz Oliveira", "Gabriel Almeida",
  "Isabela Rodrigues", "Lucas Martins",
];

export default function Ocorrencias() {
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = mockOcorrencias.filter((o) => {
    const matchSearch =
      o.aluno.toLowerCase().includes(search.toLowerCase()) ||
      o.descricao.toLowerCase().includes(search.toLowerCase()) ||
      o.registrado_por.toLowerCase().includes(search.toLowerCase());
    const matchTipo = tipoFilter === "todos" || o.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  const totalAdv = mockOcorrencias.filter((o) => o.tipo === "Advertência").length;
  const totalElo = mockOcorrencias.filter((o) => o.tipo === "Elogio").length;
  const totalObs = mockOcorrencias.filter((o) => o.tipo === "Observação").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ocorrências</h1>
          <p className="text-sm text-muted-foreground">Registre advertências, elogios e observações dos alunos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Ocorrência</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Nova Ocorrência</DialogTitle>
            </DialogHeader>
            <form className="space-y-4 mt-2" onSubmit={(e) => { e.preventDefault(); setDialogOpen(false); }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="oc-aluno">Aluno</Label>
                  <Select>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                    <SelectContent>
                      {mockAlunos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="oc-tipo">Tipo</Label>
                  <Select defaultValue="Observação">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Advertência">Advertência</SelectItem>
                      <SelectItem value="Elogio">Elogio</SelectItem>
                      <SelectItem value="Observação">Observação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="oc-data">Data</Label>
                  <Input id="oc-data" type="date" defaultValue={new Date().toISOString().split("T")[0]} className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="oc-desc">Descrição</Label>
                  <Textarea id="oc-desc" placeholder="Descreva a ocorrência com detalhes..." className="mt-1 min-h-[100px]" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="oc-reg">Registrado por</Label>
                  <Input id="oc-reg" placeholder="Nome do professor ou coordenador" className="mt-1" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Registrar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Advertências</p>
              <p className="text-2xl font-bold text-foreground">{totalAdv}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
              <ThumbsUp className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Elogios</p>
              <p className="text-2xl font-bold text-foreground">{totalElo}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <Eye className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Observações</p>
              <p className="text-2xl font-bold text-foreground">{totalObs}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por aluno, descrição ou autor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Advertência">Advertências</SelectItem>
            <SelectItem value="Elogio">Elogios</SelectItem>
            <SelectItem value="Observação">Observações</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Data</TableHead>
              <TableHead>Aluno</TableHead>
              <TableHead className="hidden md:table-cell">Turma</TableHead>
              <TableHead className="w-[130px]">Tipo</TableHead>
              <TableHead className="hidden lg:table-cell">Descrição</TableHead>
              <TableHead className="hidden md:table-cell">Registrado por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((oc) => {
              const cfg = tipoConfig[oc.tipo];
              const Icon = cfg.icon;
              return (
                <TableRow key={oc.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(oc.data).toLocaleDateString("pt-BR")}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{oc.aluno}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{oc.turma}</TableCell>
                  <TableCell>
                    <Badge variant={cfg.badgeVariant} className="gap-1">
                      <Icon className="h-3 w-3" />
                      {oc.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm max-w-[300px] truncate">
                    {oc.descricao}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{oc.registrado_por}</TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma ocorrência encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Mostrando {filtered.length} de {mockOcorrencias.length} ocorrências</span>
      </div>
    </div>
  );
}
