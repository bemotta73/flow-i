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
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { FileText, Package, Tag, Truck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportCotacoesToExcel } from "@/lib/exportExcel";

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
  estoque: string | null;
  uf: string | null;
  prazo: string | null;
  link: string | null;
  created_at: string;
}

const PIE_COLORS = ["#0072BB", "#8CC63F", "#FFCB31", "#E05252", "#8E8E93", "#7B61FF"];

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

  const totalCotacoes = cotacoes.length;

  const topItem = (field: keyof Cotacao) => {
    const counts: Record<string, number> = {};
    const canonical: Record<string, string> = {};
    cotacoes.forEach((c) => {
      const val = c[field] as string;
      if (val) {
        const key = val.toLowerCase();
        if (!canonical[key]) canonical[key] = val;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? [canonical[sorted[0][0]], sorted[0][1]] : ["—", 0];
  };

  const [topProduto, topProdutoCount] = topItem("produto");
  const [topMarca, topMarcaCount] = topItem("marca");
  const [topFornecedor, topFornecedorCount] = topItem("fornecedor");

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

  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    const canonical: Record<string, string> = {};
    cotacoes.forEach((c) => {
      if (c.marca) {
        const key = c.marca.toLowerCase();
        if (!canonical[key]) canonical[key] = c.marca;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([key, value]) => ({ name: canonical[key], value }));
  }, [cotacoes]);

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

  const metricCards = [
    { label: "Total Cotações", value: String(totalCotacoes), icon: FileText, color: "text-warning", sub: "" },
    { label: "Produto Mais Cotado", value: topProduto, icon: Package, color: "text-warning", sub: `${topProdutoCount}x` },
    { label: "Marca Mais Cotada", value: topMarca, icon: Tag, color: "text-warning", sub: `${topMarcaCount}x` },
    { label: "Fornecedor Mais Usado", value: topFornecedor, icon: Truck, color: "text-warning", sub: `${topFornecedorCount}x` },
  ];

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-warning">Dashboard</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setMes(null)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              mes === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            TODOS
          </button>
          {MESES.map((m, i) => (
            <button
              key={m}
              onClick={() => setMes(i)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                i === mes ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
        <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
          <SelectTrigger className="w-24 surface-input"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-2 border-primary text-primary hover:bg-primary/10"
          onClick={() => exportCotacoesToExcel(cotacoes, `cotacoes-dashboard-${mes !== null ? MESES[mes].toLowerCase() : "todos"}-${ano}.xlsx`)}
          disabled={cotacoes.length === 0}
        >
          <Download className="h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {metricCards.map((m, idx) => (
          <Card key={idx} className="card-elevated border-0 animate-fade-in-up" style={{ animationDelay: `${idx * 0.07}s` }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="label-apple">{m.label}</CardTitle>
              <m.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className={`font-bold truncate text-lg ${m.color}`}>{m.value}</p>
              {m.sub && <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card className="card-elevated border-0">
          <CardHeader><CardTitle className="text-sm font-semibold text-warning">Cotações por Dia</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#8E8E93" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8E8E93" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#2C2C2E", border: "none", borderRadius: 12, color: "#fff" }} />
                <Bar dataKey="total" fill="#0072BB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-elevated border-0">
          <CardHeader><CardTitle className="text-sm font-semibold text-warning">Distribuição por Marca</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#2C2C2E", border: "none", borderRadius: 12, color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated border-0 mb-8">
        <CardHeader><CardTitle className="text-sm font-semibold text-warning">Evolução Mensal ({ano})</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#48484A" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#8E8E93" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8E8E93" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#2C2C2E", border: "none", borderRadius: 12, color: "#fff" }} />
              <Line type="monotone" dataKey="total" stroke="#FFCB31" strokeWidth={2} dot={{ r: 4, fill: "#FFCB31" }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent table */}
      <Card className="card-elevated border-0">
        <CardHeader><CardTitle className="text-sm font-semibold text-warning">Últimas 10 Cotações</CardTitle></CardHeader>
        <CardContent>
          {recent10.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma cotação no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-header-dark border-0">
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Data/Hora</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Produto</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Marca</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Custo</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">15%</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">20%</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Vendedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent10.map((c, idx) => (
                  <TableRow key={c.id} className={`table-row-hover transition-all duration-150 ${idx % 2 === 1 ? "table-row-alt" : ""}`}>
                    <TableCell className="text-xs text-foreground">{formatDateTime(c.created_at)}</TableCell>
                    <TableCell className="text-xs font-medium max-w-[200px] truncate text-foreground">{c.produto}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.marca}</TableCell>
                    <TableCell className="text-xs text-foreground">{formatBRL(c.custo)}</TableCell>
                    <TableCell className="text-xs font-medium text-primary">{formatBRL(c.preco_15)}</TableCell>
                    <TableCell className="text-xs font-medium text-success">{formatBRL(c.preco_20)}</TableCell>
                    <TableCell className="text-xs text-foreground">{c.vendedor}</TableCell>
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
