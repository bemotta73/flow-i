import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MESES, formatBRL } from "@/lib/format";
import { exportCotacoesToExcel } from "@/lib/exportExcel";
import { ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Cotacao {
  id: string;
  vendedor: string;
  canal: string;
  produto: string;
  marca: string | null;
  part_number: string | null;
  custo: number;
  preco_15: number;
  preco_20: number;
  fornecedor: string | null;
  link: string | null;
  created_at: string;
}

const Controle = () => {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const startDate = new Date(ano, mes, 1).toISOString();
      const endDate = new Date(ano, mes + 1, 0, 23, 59, 59).toISOString();

      const { data } = await supabase
        .from("cotacoes")
        .select("*")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      setCotacoes((data as Cotacao[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [mes, ano]);

  const grouped = useMemo(() => {
    const groups: Record<string, Cotacao[]> = {};
    cotacoes.forEach((c) => {
      const day = new Date(c.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      if (!groups[day]) groups[day] = [];
      groups[day].push(c);
    });
    return groups;
  }, [cotacoes]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-warning">Controle de Cotações</h1>
      </div>

      {/* Month tabs + Year selector */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex flex-wrap gap-1">
          {MESES.map((m, i) => (
            <button
              key={m}
              onClick={() => setMes(i)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                i === mes
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
        <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
          <SelectTrigger className="w-24 surface-input">
            <SelectValue />
          </SelectTrigger>
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
          onClick={() => exportCotacoesToExcel(cotacoes, `cotacoes-${MESES[mes]?.toLowerCase() || "todos"}-${ano}.xlsx`)}
          disabled={cotacoes.length === 0}
        >
          <Download className="h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl animate-shimmer" />
          ))}
        </div>
      ) : cotacoes.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma cotação neste período.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day} className="animate-fade-in-up">
              <div className="day-separator">{day}</div>
              <div className="card-elevated rounded-t-none overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header-dark border-0">
                      <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Hora</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Produto</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Marca</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">PN</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Custo</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">15%</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">20%</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Fornecedor</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Vendedor</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Canal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((c, idx) => (
                      <TableRow key={c.id} className={`table-row-hover transition-all duration-150 ${idx % 2 === 1 ? "table-row-alt" : ""}`}>
                        <TableCell className="text-xs text-foreground">
                          {new Date(c.created_at).toLocaleTimeString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-xs font-medium max-w-[200px] truncate text-foreground">
                          {c.produto}
                          {c.link && (
                            <a href={c.link} target="_blank" rel="noopener noreferrer" className="inline-block ml-1 text-primary hover:text-primary/80">
                              <ExternalLink className="h-3 w-3 inline" />
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.marca}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.part_number}</TableCell>
                        <TableCell className="text-xs text-foreground">{formatBRL(c.custo)}</TableCell>
                        <TableCell className="text-xs font-medium text-primary">{formatBRL(c.preco_15)}</TableCell>
                        <TableCell className="text-xs font-medium text-success">{formatBRL(c.preco_20)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.fornecedor}</TableCell>
                        <TableCell className="text-xs text-foreground">{c.vendedor}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.canal}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Controle;
