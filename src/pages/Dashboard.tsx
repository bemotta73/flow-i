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
import { FileText, Package, Tag, Truck, Download, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportCotacoesToExcel } from "@/lib/exportExcel";
import { DashboardDrilldown } from "@/components/DashboardDrilldown";

type DrilldownType = "produto" | "marca" | "fornecedor" | "vendedor" | null;

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

const PIE_COLORS = ["#14B8A6", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444", "#22C55E"];

const Dashboard = () => {
  const now = new Date();
  const [mes, setMes] = useState<number | null>(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [allCotacoes, setAllCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [drilldown, setDrilldown] = useState<DrilldownType>(null);

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
    { label: "Total Cotações", value: String(totalCotacoes), icon: FileText, sub: "", drill: null as DrilldownType },
    { label: "Produto Mais Cotado", value: topProduto, icon: Package, sub: `${topProdutoCount}x`, drill: "produto" as DrilldownType },
    { label: "Marca Mais Cotada", value: topMarca, icon: Tag, sub: `${topMarcaCount}x`, drill: "marca" as DrilldownType },
    { label: "Fornecedor Mais Usado", value: topFornecedor, icon: Truck, sub: `${topFornecedorCount}x`, drill: "fornecedor" as DrilldownType },
  ];

  const tooltipStyle = { background: "#1E293B", border: "none", borderRadius: 8, color: "#F1F5F9" };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">Dashboard</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex flex-wrap gap-1 bg-card rounded-lg p-1">
          <button
            onClick={() => setMes(null)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
              mes === null ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            TODOS
          </button>
          {MESES.map((m, i) => (
            <button
              key={m}
              onClick={() => setMes(i)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                i === mes ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
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
          className="ml-auto gap-2 border-border text-foreground hover:bg-card"
          onClick={() => exportCotacoesToExcel(cotacoes, `cotacoes-dashboard-${mes !== null ? MESES[mes].toLowerCase() : "todos"}-${ano}.xlsx`)}
          disabled={cotacoes.length === 0}
        >
          <Download className="h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {metricCards.map((m, idx) => (
          <Card
            key={idx}
            className={`card-elevated border-0 animate-fade-in-up ${m.drill ? "cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" : ""}`}
            style={{ animationDelay: `${idx * 0.07}s` }}
            onClick={() => m.drill && setDrilldown(m.drill)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="label-apple">{m.label}</CardTitle>
              {m.drill ? (
                <ChevronRight className="h-4 w-4 text-primary/40" />
              ) : (
                <m.icon className="h-4 w-4 text-primary/40" />
              )}
            </CardHeader>
            <CardContent>
              <p className="font-bold truncate text-lg text-foreground">{m.value}</p>
              {m.sub && <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card className="card-elevated border-0">
          <CardHeader><CardTitle className="text-[13px] font-semibold text-primary uppercase tracking-wide">Cotações por Dia</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#14B8A6" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-elevated border-0 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setDrilldown("marca")}>
          <CardHeader>
            <CardTitle className="text-[13px] font-semibold text-primary uppercase tracking-wide flex items-center justify-between">
              Distribuição por Marca
              <ChevronRight className="h-4 w-4 text-primary/40" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated border-0 mb-8">
        <CardHeader><CardTitle className="text-[13px] font-semibold text-primary uppercase tracking-wide">Evolução Mensal ({ano})</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="total" stroke="#14B8A6" strokeWidth={2} dot={{ r: 4, fill: "#14B8A6" }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent table */}
      <Card className="card-elevated border-0">
        <CardHeader><CardTitle className="text-[13px] font-semibold text-primary uppercase tracking-wide">Últimas 10 Cotações</CardTitle></CardHeader>
        <CardContent>
          {recent10.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma cotação no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-header-dark border-0">
                  <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Data/Hora</TableHead>
                  <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Produto</TableHead>
                  <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Marca</TableHead>
                  <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Custo</TableHead>
                  <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">15%</TableHead>
                  <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">20%</TableHead>
                  <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Vendedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent10.map((c, idx) => (
                  <TableRow key={c.id} className={`table-row-hover transition-all duration-150 ${idx % 2 === 1 ? "table-row-alt" : ""}`}>
                    <TableCell className="text-xs text-foreground px-4 py-3">{formatDateTime(c.created_at)}</TableCell>
                    <TableCell className="text-xs font-medium max-w-[200px] truncate text-foreground px-4 py-3">{c.produto}</TableCell>
                    <TableCell className="text-xs text-muted-foreground px-4 py-3">{c.marca}</TableCell>
                    <TableCell className="text-xs text-foreground px-4 py-3">{formatBRL(c.custo)}</TableCell>
                    <TableCell className="text-xs font-medium text-secondary px-4 py-3">{formatBRL(c.preco_15)}</TableCell>
                    <TableCell className="text-xs font-medium text-success px-4 py-3">{formatBRL(c.preco_20)}</TableCell>
                    <TableCell className="text-xs text-foreground px-4 py-3">{c.vendedor}</TableCell>
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
