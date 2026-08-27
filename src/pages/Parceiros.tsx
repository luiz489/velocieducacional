import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { toast } from "@/hooks/use-toast";
import { MapPin, Phone, Globe, Mail, Navigation, Search, Plus } from "lucide-react";
import { ESTADOS, CIDADES_SP } from "@/lib/cidadesSP";

type TipoParceiro = "Fornecedor" | "Cliente" | "Outro";

interface Parceiro {
  id: string;
  nome: string;
  categoria: string;
  tipo: TipoParceiro;
  descricao: string | null;
  estado: string;
  cidade: string;
  endereco: string | null;
  latitude: number | null;
  longitude: number | null;
  telefone: string | null;
  email: string | null;
  website: string | null;
}

function distKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const tipoColor: Record<TipoParceiro, string> = {
  Fornecedor: "bg-blue-100 text-blue-700 border-blue-200",
  Cliente: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Outro: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function Parceiros() {
  const { escolaAtivaId } = useEscolaAtiva();
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState("SP");
  const [cidade, setCidade] = useState<string>("todas");
  const [tipo, setTipo] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [raio, setRaio] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "", tipo: "Fornecedor" as TipoParceiro, categoria: "",
    descricao: "", estado: "SP", cidade: "", endereco: "",
    telefone: "", email: "", website: "",
  });

  const formatDist = (km: number) =>
    km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("parceiros")
      .select("*")
      .eq("ativo", true)
      .order("nome");
    if (error) toast({ title: "Erro ao carregar parceiros", description: error.message, variant: "destructive" });
    setParceiros((data as Parceiro[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const usarGPS = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS indisponível", description: "Seu dispositivo não suporta geolocalização.", variant: "destructive" });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setCidade("todas");
        setGpsLoading(false);
        toast({ title: "Localização obtida", description: "Mostrando parceiros mais próximos." });
      },
      (err) => {
        setGpsLoading(false);
        toast({ title: "Erro de GPS", description: err.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const lista = useMemo(() => {
    let arr = parceiros.filter((p) => p.estado === estado);
    if (cidade !== "todas") arr = arr.filter((p) => p.cidade === cidade);
    if (tipo !== "todos") arr = arr.filter((p) => p.tipo === tipo);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      arr = arr.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          p.categoria.toLowerCase().includes(q) ||
          (p.descricao || "").toLowerCase().includes(q)
      );
    }
    if (coords) {
      arr = arr
        .map((p) => ({
          ...p,
          _dist: p.latitude && p.longitude ? distKm(coords.lat, coords.lon, Number(p.latitude), Number(p.longitude)) : Infinity,
        }))
        .sort((a: any, b: any) => a._dist - b._dist);
      if (raio !== "todos") {
        const max = Number(raio);
        arr = arr.filter((p: any) => p._dist <= max);
      }
    }
    return arr;
  }, [parceiros, estado, cidade, tipo, busca, coords, raio]);

  const salvar = async () => {
    if (!form.nome || !form.categoria || !form.cidade) {
      toast({ title: "Campos obrigatórios", description: "Nome, categoria e cidade são obrigatórios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("parceiros").insert({
      nome: form.nome,
      tipo: form.tipo,
      categoria: form.categoria,
      descricao: form.descricao || null,
      estado: form.estado,
      cidade: form.cidade,
      endereco: form.endereco || null,
      telefone: form.telefone || null,
      email: form.email || null,
      website: form.website || null,
      ativo: true,
      escola_id: escolaAtivaId,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Parceiro cadastrado!", description: form.nome });
    setOpen(false);
    setForm({ nome: "", tipo: "Fornecedor", categoria: "", descricao: "", estado: "SP", cidade: "", endereco: "", telefone: "", email: "", website: "" });
    fetchAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Parceiros</h1>
          <p className="text-muted-foreground">Fornecedores, clientes e parceiros institucionais</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Parceiro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Cadastrar Parceiro</DialogTitle>
              <DialogDescription>Use o tipo "Fornecedor" para amarrar em Contas a Pagar, Compras e Contratos.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                <div>
                  <Label>Tipo *</Label>
                  <Select value={form.tipo} onValueChange={(v: TipoParceiro) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                      <SelectItem value="Cliente">Cliente</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Categoria *</Label><Input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: Material, Limpeza, Tecnologia" /></div>
              <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Estado *</Label>
                  <Select value={form.estado} onValueChange={v => setForm({ ...form, estado: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map(e => <SelectItem key={e.uf} value={e.uf}>{e.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Cidade *</Label><Input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} /></div>
              </div>
              <div><Label>Endereço</Label><Input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} /></div>
                <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div><Label>Website</Label><Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://" /></div>
              <Button onClick={salvar} disabled={saving} className="w-full mt-2">
                {saving ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>Filtre por tipo, localização ou busque por nome</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="Cliente">Cliente</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e.uf} value={e.uf}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cidade</Label>
              <Select value={cidade} onValueChange={setCidade}>
                <SelectTrigger><SelectValue placeholder="Todas as cidades" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="todas">Todas as cidades</SelectItem>
                  {CIDADES_SP.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Nome ou categoria" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={usarGPS} disabled={gpsLoading} className="w-full gap-2" variant="outline">
                <Navigation className="h-4 w-4" />
                {gpsLoading ? "Localizando..." : coords ? "Atualizar GPS" : "Usar GPS"}
              </Button>
            </div>
          </div>
          {coords && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-xs text-muted-foreground">
                Localização ativa: {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)} — ordenado por proximidade.
              </p>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Raio:</Label>
                <Select value={raio} onValueChange={setRaio}>
                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="5">Até 5 km</SelectItem>
                    <SelectItem value="10">Até 10 km</SelectItem>
                    <SelectItem value="25">Até 25 km</SelectItem>
                    <SelectItem value="50">Até 50 km</SelectItem>
                    <SelectItem value="100">Até 100 km</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => { setCoords(null); setRaio("todos"); }}>limpar GPS</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : lista.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Nenhum parceiro encontrado para os filtros selecionados.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lista.map((p: any) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{p.nome}</CardTitle>
                  <Badge variant="outline" className={tipoColor[p.tipo as TipoParceiro] || tipoColor.Outro}>{p.tipo}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{p.categoria}</Badge>
                </div>
                {p.descricao && <CardDescription>{p.descricao}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    {p.endereco ? `${p.endereco} — ` : ""}{p.cidade}/{p.estado}
                    {coords && p._dist !== Infinity && (
                      <span className="block text-xs text-primary font-medium">{formatDist(p._dist)} de você</span>
                    )}
                  </span>
                </div>
                {p.telefone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" /><span>{p.telefone}</span>
                  </div>
                )}
                {p.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" /><span>{p.email}</span>
                  </div>
                )}
                {p.website && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <a href={p.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{p.website}</a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
