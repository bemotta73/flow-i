import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MESES, formatBRL, formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { FileText, Package, Tag, Truck } from "lucide-react";

interface Cotacao {
  id: string;
  vendedor: string;
  produto: string;
  marca: string | null;
  part_number: string | null;
  custo: number;
  preco_15: number;
  preco_20: number;
  fornecedor: string | null;
  canal: string;
  created_at: string;
}

const PIE_COLORS = [
  "hsl(203, 100%, 37%)", "hsl(44, 100%, 60%)", "hsl(93, 53%, 51%)",
  "hsl(0, 84%, 60%)", "hsl(207, 3%, 47%)", "hsl(270, 60%, 50%)",
];

const Dashboard = () => {
  const now = new Date();
  const [mes, setMes] = useState<number | null>(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [allCotacoes, setAllCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from("cotacoes")
        .select("*")
        .order("created_at", { ascending: false });
      setAllCotacoes((data as Cotacao[]) || []);
    };
    fetchAll();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let query = supabase.from("cotacoes").select("*").order("created_at", { ascending: false });

      if (mes !== null) {
        const startDate = new Date(ano, mes, 1).toISOString();
        const endDate = new Date(ano, mes + 1, 0, 23, 59, 59).toISOString();
        query = query.gte("created_at", startDate).lte("created_at", endDate);
      } else {
        const startDate = new Date(ano, 0, 1).toISOString();
        const endDate = new Date(ano, 11, 31, 23, 59, 59).toISOString();
        query = query.gte("created_at", startDate).lte("created_at", endDate);
      }

      const { data } = await query;
      setCotacoes((data as Cotacao[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [mes, ano]);

  // Metrics
  const totalCotacoes = cotacoes.length;

  const topItem = (field: keyof Cotacao) => {
    const counts: Record<string, number> = {};
    cotacoes.forEach((c) => {
      const val = c[field] as string;
      if (val) counts[val] = (counts[val] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] || ["—", 0];
  };

  const [topProduto, topProdutoCount] = topItem("produto");
  const [topMarca, topMarcaCount] = topItem("marca");
  const [topFornecedor, topFornecedorCount] = topItem("fornecedor");

  // Bar chart: quotations per day
  const barData = useMemo(() => {
    const counts: Record<string, number> = {};
    cotacoes.forEach((c) => {
      const day = new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      counts[day] = (counts[day] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([dia, total]) => ({ dia, total }))
      .reverse();
  }, [cotacoes]);

  // Pie chart: by marca
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    cotacoes.forEach((c) => {
      if (c.marca) counts[c.marca] = (counts[c.marca] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [cotacoes]);

  // Line chart: monthly evolution
  const lineData = useMemo(() => {
    return MESES.map((m, i) => {
      const count = allCotacoes.filter((c) => {
        const d = new Date(c.created_at);
        return d.getFullYear() === ano && d.getMonth() === i;
      }).length;
      return { mes: m.slice(0, 3), total: count };
    });
  }, [allCotacoes, ano]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const recent10 = cotacoes.slice(0, 10);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setMes(null)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mes === null ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            TODOS
          </button>
          {MESES.map((m, i) => (
            <button
              key={m}
              onClick={() => setMes(i)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                i === mes ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
        <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cotações</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalCotacoes}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Produto Mais Cotado</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-bold truncate">{topProduto}</p>
            <p className="text-xs text-muted-foreground">{topProdutoCount}x</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Marca Mais Cotada</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-bold">{topMarca}</p>
            <p className="text-xs text-muted-foreground">{topMarcaCount}x</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fornecedor Mais Usado</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-bold">{topFornecedor}</p>
            <p className="text-xs text-muted-foreground">{topFornecedorCount}x</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-sm">Cotações por Dia</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(203, 100%, 37%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Distribuição por Marca</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader><CardTitle className="text-sm">Evolução Mensal ({ano})</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="hsl(203, 100%, 37%)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Últimas 10 Cotações</CardTitle></CardHeader>
        <CardContent>
          {recent10.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma cotação no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data/Hora</TableHead>
                  <TableHead className="text-xs">Produto</TableHead>
                  <TableHead className="text-xs">Marca</TableHead>
                  <TableHead className="text-xs">Custo</TableHead>
                  <TableHead className="text-xs">15%</TableHead>
                  <TableHead className="text-xs">20%</TableHead>
                  <TableHead className="text-xs">Vendedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent10.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{formatDateTime(c.created_at)}</TableCell>
                    <TableCell className="text-xs font-medium max-w-[200px] truncate">{c.produto}</TableCell>
                    <TableCell className="text-xs">{c.marca}</TableCell>
                    <TableCell className="text-xs">{formatBRL(c.custo)}</TableCell>
                    <TableCell className="text-xs">{formatBRL(c.preco_15)}</TableCell>
                    <TableCell className="text-xs">{formatBRL(c.preco_20)}</TableCell>
                    <TableCell className="text-xs">{c.vendedor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
