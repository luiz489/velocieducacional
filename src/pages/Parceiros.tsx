import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { MapPin, Phone, Globe, Mail, Navigation, Search } from "lucide-react";
import { ESTADOS, CIDADES_SP } from "@/lib/cidadesSP";

interface Parceiro {
  id: string;
  nome: string;
  categoria: string;
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

export default function Parceiros() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState("SP");
  const [cidade, setCidade] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [raio, setRaio] = useState<string>("todos");

  const formatDist = (km: number) =>
    km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("parceiros")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) toast({ title: "Erro ao carregar parceiros", description: error.message, variant: "destructive" });
      setParceiros((data as Parceiro[]) || []);
      setLoading(false);
    })();
  }, []);

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
  }, [parceiros, estado, cidade, busca, coords, raio]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Parceiros</h1>
        <p className="text-muted-foreground">Encontre parceiros disponíveis na sua região</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtrar por localização</CardTitle>
          <CardDescription>Use o GPS do dispositivo ou selecione o estado e cidade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
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
              <Button onClick={usarGPS} disabled={gpsLoading} className="w-full gap-2">
                <Navigation className="h-4 w-4" />
                {gpsLoading ? "Localizando..." : coords ? "Atualizar GPS" : "Usar minha localização"}
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
