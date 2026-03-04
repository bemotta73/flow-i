import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MESES, formatDateTime, formatDate, formatBRL } from "@/lib/format";
import { ExternalLink } from "lucide-react";
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Controle de Cotações</h1>
      </div>

      {/* Month tabs + Year selector */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex flex-wrap gap-1">
          {MESES.map((m, i) => (
            <button
              key={m}
              onClick={() => setMes(i)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                i === mes
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
        <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : cotacoes.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma cotação neste período.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day}>
              <div className="bg-primary text-primary-foreground px-4 py-2 rounded-t-lg text-sm font-semibold">
                {day}
              </div>
              <div className="border border-t-0 rounded-b-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Hora</TableHead>
                      <TableHead className="text-xs">Produto</TableHead>
                      <TableHead className="text-xs">Marca</TableHead>
                      <TableHead className="text-xs">PN</TableHead>
                      <TableHead className="text-xs">Custo</TableHead>
                      <TableHead className="text-xs">15%</TableHead>
                      <TableHead className="text-xs">20%</TableHead>
                      <TableHead className="text-xs">Fornecedor</TableHead>
                      <TableHead className="text-xs">Vendedor</TableHead>
                      <TableHead className="text-xs">Canal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs">
                          {new Date(c.created_at).toLocaleTimeString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-xs font-medium max-w-[200px] truncate">
                          {c.produto}
                          {c.link && (
                            <a href={c.link} target="_blank" rel="noopener noreferrer" className="inline-block ml-1 text-primary hover:text-primary/80">
                              <ExternalLink className="h-3 w-3 inline" />
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{c.marca}</TableCell>
                        <TableCell className="text-xs">{c.part_number}</TableCell>
                        <TableCell className="text-xs">{formatBRL(c.custo)}</TableCell>
                        <TableCell className="text-xs">{formatBRL(c.preco_15)}</TableCell>
                        <TableCell className="text-xs">{formatBRL(c.preco_20)}</TableCell>
                        <TableCell className="text-xs">{c.fornecedor}</TableCell>
                        <TableCell className="text-xs">{c.vendedor}</TableCell>
                        <TableCell className="text-xs">{c.canal}</TableCell>
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
