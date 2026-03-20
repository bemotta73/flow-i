import { useMemo } from "react";
import { formatBRL } from "@/lib/format";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";

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

type DrilldownType = "produto" | "marca" | "fornecedor" | "vendedor" | "familia" | null;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: DrilldownType;
  cotacoes: Cotacao[];
}

const TITLES: Record<string, string> = {
  produto: "Ranking de Produtos",
  marca: "Ranking de Marcas",
  fornecedor: "Ranking de Fornecedores",
  vendedor: "Ranking de Vendedores",
};

const BAR_COLORS = ["#14B8A6", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444", "#22C55E", "#EC4899", "#06B6D4"];

const tooltipStyle = { background: "#1E293B", border: "none", borderRadius: 8, color: "#F1F5F9" };

export function DashboardDrilldown({ open, onOpenChange, type, cotacoes }: Props) {
  const data = useMemo(() => {
    if (!type) return [];
    const counts: Record<string, { count: number; totalCusto: number; original: string }> = {};
    cotacoes.forEach((c) => {
      const val = c[type] as string | null;
      if (val) {
        const key = val.toLowerCase();
        if (!counts[key]) counts[key] = { count: 0, totalCusto: 0, original: val };
        counts[key].count += 1;
        counts[key].totalCusto += Number(c.custo) || 0;
      }
    });
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .map((item, i) => ({
        name: item.original,
        cotacoes: item.count,
        custoMedio: item.totalCusto / item.count,
        rank: i + 1,
        pct: ((item.count / cotacoes.length) * 100).toFixed(1),
      }));
  }, [type, cotacoes]);

  const chartData = data.slice(0, 10);

  if (!type) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">{TITLES[type]}</DialogTitle>
          <p className="text-xs text-muted-foreground">{data.length} itens únicos · {cotacoes.length} cotações no período</p>
        </DialogHeader>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="mt-2">
            <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wide font-semibold">Top {Math.min(10, chartData.length)}</p>
            <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [`${value} cotações`, "Total"]}
                />
                <Bar dataKey="cotacoes" radius={[0, 6, 6, 0]}>
                  {chartData.map((_, i) => (
                    <rect key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Table */}
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-[11px] text-muted-foreground font-semibold uppercase w-12">#</TableHead>
                <TableHead className="text-[11px] text-muted-foreground font-semibold uppercase">Nome</TableHead>
                <TableHead className="text-[11px] text-muted-foreground font-semibold uppercase text-right">Cotações</TableHead>
                <TableHead className="text-[11px] text-muted-foreground font-semibold uppercase text-right">%</TableHead>
                {type !== "vendedor" && (
                  <TableHead className="text-[11px] text-muted-foreground font-semibold uppercase text-right">Custo Médio</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.name} className="border-border hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs text-muted-foreground font-mono">{item.rank}</TableCell>
                  <TableCell className="text-sm font-medium text-foreground">
                    {item.name}
                    {item.rank <= 3 && (
                      <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                        {item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : "🥉"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-right font-semibold text-foreground">{item.cotacoes}</TableCell>
                  <TableCell className="text-xs text-right text-muted-foreground">{item.pct}%</TableCell>
                  {type !== "vendedor" && (
                    <TableCell className="text-xs text-right text-muted-foreground">{formatBRL(item.custoMedio)}</TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
