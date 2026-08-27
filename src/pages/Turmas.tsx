import { useState } from "react";
import { Search, Plus, MoreHorizontal, BookOpen, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTurmas } from "@/hooks/useTurmas";
import { useEscolaAtiva } from "@/contexts/EscolaContext";

function getOcupacaoColor(percent: number) {
  if (percent >= 95) return "destructive" as const;
  if (percent >= 75) return "default" as const;
  return "secondary" as const;
}

function getOcupacaoLabel(percent: number) {
  if (percent >= 100) return "Lotada";
  if (percent >= 90) return "Quase lotada";
  if (percent >= 50) return "Parcial";
  return "Disponível";
}

export default function Turmas() {
  const { turmas, loading, createTurma } = useTurmas();
  const { escolaAtivaId } = useEscolaAtiva();
  const [search, setSearch] = useState("");
  const [turnoFilter, setTurnoFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState("");
  const [anoLetivo, setAnoLetivo] = useState(String(new Date().getFullYear()));
  const [turno, setTurno] = useState("Manhã");
  const [sala, setSala] = useState("");
  const [vagas, setVagas] = useState("30");

  const filtered = turmas.filter((t) => {
    const matchSearch =
      t.nome.toLowerCase().includes(search.toLowerCase()) ||
      (t.sala ?? "").toLowerCase().includes(search.toLowerCase());
    const matchTurno = turnoFilter === "todos" || t.turno === turnoFilter;
    return matchSearch && matchTurno;
  });

  const totalVagas = turmas.reduce((s, t) => s + t.vagas_totais, 0);
  const totalMatriculados = turmas.reduce((s, t) => s + t.alunos_matriculados, 0);
  const vagasDisponiveis = totalVagas - totalMatriculados;

  const resetForm = () => {
    setNome("");
    setAnoLetivo(String(new Date().getFullYear()));
    setTurno("Manhã");
    setSala("");
    setVagas("30");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escolaAtivaId || !nome) return;
    setSaving(true);
    const ok = await createTurma(escolaAtivaId, {
      nome,
      ano_letivo: Number(anoLetivo),
      turno,
      sala: sala || null,
      vagas_totais: Number(vagas),
    });
    setSaving(false);
    if (ok) {
      setDialogOpen(false);
      resetForm();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Turmas</h1>
          <p className="text-sm text-muted-foreground">Gerencie turmas e ocupação de vagas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button disabled={!escolaAtivaId}><Plus className="h-4 w-4 mr-2" />Nova Turma</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Nova Turma</DialogTitle>
            </DialogHeader>
            <form className="space-y-4 mt-2" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="nome">Nome da Turma</Label>
                  <Input id="nome" placeholder="Ex: 5º Ano A" className="mt-1" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="ano_letivo">Ano Letivo</Label>
                  <Input id="ano_letivo" type="number" value={anoLetivo} onChange={(e) => setAnoLetivo(e.target.value)} className="mt-1" required />
                </div>
                <div>
                  <Label htmlFor="turno">Turno</Label>
                  <Select value={turno} onValueChange={setTurno}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manhã">Manhã</SelectItem>
                      <SelectItem value="Tarde">Tarde</SelectItem>
                      <SelectItem value="Noite">Noite</SelectItem>
                      <SelectItem value="Integral">Integral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sala">Sala</Label>
                  <Input id="sala" placeholder="Ex: Sala 101" className="mt-1" value={sala} onChange={(e) => setSala(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="vagas">Vagas Totais</Label>
                  <Input id="vagas" type="number" value={vagas} onChange={(e) => setVagas(e.target.value)} className="mt-1" required />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Turmas</p>
              <p className="text-xl font-bold">{turmas.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Alunos Matriculados</p>
              <p className="text-xl font-bold">{totalMatriculados}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
              <BookOpen className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vagas Disponíveis</p>
              <p className="text-xl font-bold">{vagasDisponiveis}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou sala..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={turnoFilter} onValueChange={setTurnoFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Manhã">Manhã</SelectItem>
            <SelectItem value="Tarde">Tarde</SelectItem>
            <SelectItem value="Noite">Noite</SelectItem>
            <SelectItem value="Integral">Integral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Turma</TableHead>
              <TableHead>Ano Letivo</TableHead>
              <TableHead>Turno</TableHead>
              <TableHead className="hidden md:table-cell">Sala</TableHead>
              <TableHead>Ocupação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((turma) => {
              const percent = turma.vagas_totais > 0 ? Math.round((turma.alunos_matriculados / turma.vagas_totais) * 100) : 0;
              return (
                <TableRow key={turma.id}>
                  <TableCell className="font-medium">{turma.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{turma.ano_letivo}</TableCell>
                  <TableCell>{turma.turno}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{turma.sala ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-[140px]">
                      <Progress value={percent} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {turma.alunos_matriculados}/{turma.vagas_totais}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getOcupacaoColor(percent)}>
                      {getOcupacaoLabel(percent)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ver Alunos</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma turma encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Mostrando {filtered.length} de {turmas.length} turmas
      </div>
    </div>
  );
}
