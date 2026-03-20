import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";

interface PriceHistoryChartProps {
  produto: string;
  partNumber: string | null;
  currentCusto: number;
}

interface DataPoint {
  data: string;
  custo: number;
  fornecedor: string | null;
}

export function PriceHistoryChart({ produto, partNumber, currentCusto }: PriceHistoryChartProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      let query = supabase
        .from("cotacoes")
        .select("custo, fornecedor, created_at")
        .eq("produto", produto)
        .order("created_at", { ascending: true });

      if (partNumber) {
        query = query.eq("part_number", partNumber);
      }

      const { data: rows } = await query.limit(50);

      const points: DataPoint[] = (rows || []).map((r: any) => ({
        data: new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        custo: r.custo,
        fornecedor: r.fornecedor,
      }));

      // Add current lista_mix cost as the latest point
      points.push({
        data: "Atual",
        custo: currentCusto,
        fornecedor: "Lista Mix",
      });

      setData(points);
      setLoading(false);
    };

    fetchHistory();
  }, [produto, partNumber, currentCusto]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground ml-2">Carregando histórico...</span>
      </div>
    );
  }

  if (data.length <= 1) {
    return (
      <div className="flex items-center justify-center py-6">
        <span className="text-xs text-muted-foreground">Sem histórico de cotações para este produto</span>
      </div>
    );
  }

  const minCusto = Math.min(...data.map((d) => d.custo));
  const maxCusto = Math.max(...data.map((d) => d.custo));
  const firstCusto = data[0].custo;
  const lastCusto = data[data.length - 1].custo;
  const variation = firstCusto > 0 ? ((lastCusto - firstCusto) / firstCusto) * 100 : 0;

  const TrendIcon = variation > 1 ? TrendingUp : variation < -1 ? TrendingDown : Minus;
  const trendColor = variation > 1 ? "text-destructive" : variation < -1 ? "text-success" : "text-muted-foreground";

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-4 mb-3">
        <h4 className="text-xs font-semibold text-foreground">Histórico de Custo</h4>
        <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
          <TrendIcon className="h-3.5 w-3.5" />
          {variation > 0 ? "+" : ""}{variation.toFixed(1)}%
        </div>
        <div className="flex gap-4 ml-auto text-[11px] text-muted-foreground">
          <span>Mín: <strong className="text-foreground">{formatBRL(minCusto)}</strong></span>
          <span>Máx: <strong className="text-foreground">{formatBRL(maxCusto)}</strong></span>
          <span>{data.length - 1} cotações</span>
        </div>
      </div>
      <div className="h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="data"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$${v.toLocaleString("pt-BR")}`}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
              formatter={(value: number, _name: string, props: any) => [
                formatBRL(value),
                props.payload.fornecedor || "Custo",
              ]}
              labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: "11px" }}
            />
            <Line
              type="monotone"
              dataKey="custo"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--card))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
