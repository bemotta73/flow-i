import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, FileText, Download, RefreshCw, ChevronLeft } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

interface WeeklyReport {
  id: string;
  data_inicio: string;
  data_fim: string;
  total_cotacoes: number;
  variacao_vs_anterior: number;
  top_produtos: { nome: string; quantidade: number }[];
  top_marcas: { nome: string; quantidade: number }[];
  fornecedor_top: string | null;
  alertas_aumento: number;
  alertas_queda: number;
  cotacoes_por_dia: Record<string, number>;
  lista_mix_atualizados: number;
  lista_mix_total: number;
  ticket_medio: number;
  created_at: string;
}

function formatDateBR(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function Relatorios() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selected, setSelected] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("relatorios_semanais")
      .select("*")
      .order("data_fim", { ascending: false });
    setReports((data as unknown as WeeklyReport[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-weekly-report");
      if (error) throw error;
      toast({ title: "Relatório gerado com sucesso!" });
      await fetchReports();
    } catch (e: any) {
      toast({ title: "Erro ao gerar relatório", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleExportPDF = async (report: WeeklyReport) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const dias = Object.entries(report.cotacoes_por_dia).map(([d, v]) => `${d}: ${v}`).join(" | ");
    const topProds = (report.top_produtos as any[]).map((p, i) => `${i + 1}. ${p.nome} (${p.quantidade})`).join("<br/>");
    const topMarcas = (report.top_marcas as any[]).map((p, i) => `${i + 1}. ${p.nome} (${p.quantidade})`).join("<br/>");

    const varIcon = report.variacao_vs_anterior >= 0 ? "▲" : "▼";
    const varColor = report.variacao_vs_anterior >= 0 ? "#14B8A6" : "#8B5CF6";

    printWindow.document.write(`
      <html><head><title>Relatório Semanal - Flowi</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1E293B; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        h2 { font-size: 16px; color: #64748B; margin-top: 0; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; }
        .card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; }
        .card-title { font-size: 12px; color: #64748B; text-transform: uppercase; margin-bottom: 8px; }
        .card-value { font-size: 24px; font-weight: bold; }
        .section { margin-top: 24px; }
        .section-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
      </style></head><body>
        <h1>Flowi — Relatório Semanal</h1>
        <h2>${formatDateBR(report.data_inicio)} a ${formatDateBR(report.data_fim)}</h2>
        <div class="grid">
          <div class="card">
            <div class="card-title">Total de Cotações</div>
            <div class="card-value">${report.total_cotacoes} <span style="font-size:14px;color:${varColor}">${varIcon} ${Math.abs(report.variacao_vs_anterior).toFixed(1)}%</span></div>
          </div>
          <div class="card">
            <div class="card-title">Ticket Médio</div>
            <div class="card-value">${formatBRL(report.ticket_medio)}</div>
          </div>
          <div class="card">
            <div class="card-title">Alertas de Aumento</div>
            <div class="card-value" style="color:#EF4444">${report.alertas_aumento}</div>
          </div>
          <div class="card">
            <div class="card-title">Alertas de Queda</div>
            <div class="card-value" style="color:#14B8A6">${report.alertas_queda}</div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Cotações por Dia</div>
          <p>${dias}</p>
        </div>
        <div class="section">
          <div class="section-title">Top 5 Produtos</div>
          <p>${topProds}</p>
        </div>
        <div class="section">
          <div class="section-title">Top 3 Marcas</div>
          <p>${topMarcas}</p>
        </div>
        <div class="section">
          <div class="section-title">Fornecedor Mais Usado</div>
          <p>${report.fornecedor_top || "—"}</p>
        </div>
        <div class="section">
          <div class="section-title">Lista Mix</div>
          <p>${report.lista_mix_atualizados} / ${report.lista_mix_total} atualizados</p>
        </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  if (selected) {
    return <ReportDetail report={selected} onBack={() => setSelected(null)} onExport={handleExportPDF} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios Semanais</h1>
          <p className="text-sm text-muted-foreground">Resumos automáticos de desempenho</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
          Gerar Relatório
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum relatório gerado ainda.</p>
            <p className="text-sm text-muted-foreground mt-1">Clique em "Gerar Relatório" para criar o primeiro.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {reports.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setSelected(r)}
            >
              <CardContent className="flex items-center justify-between py-4 px-6">
                <div className="flex items-center gap-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">
                      {formatDateBR(r.data_inicio)} a {formatDateBR(r.data_fim)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.total_cotacoes} cotações · Ticket médio {formatBRL(r.ticket_medio)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <VariationBadge value={r.variacao_vs_anterior} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function VariationBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
      positive ? "bg-primary/10 text-primary" : "bg-purple-500/10 text-purple-400"
    }`}>
      {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function ReportDetail({
  report,
  onBack,
  onExport,
}: {
  report: WeeklyReport;
  onBack: () => void;
  onExport: (r: WeeklyReport) => void;
}) {
  const dias = report.cotacoes_por_dia as Record<string, number>;
  const maxDia = Math.max(...Object.values(dias), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Relatório Semanal
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatDateBR(report.data_inicio)} a {formatDateBR(report.data_fim)}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => onExport(report)} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cotações"
          value={report.total_cotacoes.toString()}
          badge={<VariationBadge value={report.variacao_vs_anterior} />}
        />
        <StatCard title="Ticket Médio" value={formatBRL(report.ticket_medio)} />
        <StatCard
          title="Alertas Aumento"
          value={report.alertas_aumento.toString()}
          valueClass="text-destructive"
        />
        <StatCard
          title="Alertas Queda"
          value={report.alertas_queda.toString()}
          valueClass="text-primary"
        />
      </div>

      {/* Cotações por dia */}
      <Card className="bg-[#1E293B] border-[#334155]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">Cotações por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-32">
            {["Seg", "Ter", "Qua", "Qui", "Sex"].map((dia) => {
              const val = dias[dia] || 0;
              const height = maxDia > 0 ? (val / maxDia) * 100 : 0;
              return (
                <div key={dia} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-primary tabular-nums">{val}</span>
                  <div
                    className="w-full rounded-t bg-primary/80 transition-all"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-[10px] text-slate-400">{dia}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Produtos */}
        <Card className="bg-[#1E293B] border-[#334155]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Top 5 Produtos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(report.top_produtos as any[]).map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-200 truncate">{i + 1}. {p.nome}</span>
                <span className="text-sm font-semibold text-primary tabular-nums">{p.quantidade}</span>
              </div>
            ))}
            {(report.top_produtos as any[]).length === 0 && (
              <p className="text-sm text-slate-500">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Top Marcas */}
        <Card className="bg-[#1E293B] border-[#334155]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Top 3 Marcas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(report.top_marcas as any[]).map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-200 truncate">{i + 1}. {m.nome}</span>
                <span className="text-sm font-semibold text-primary tabular-nums">{m.quantidade}</span>
              </div>
            ))}
            {(report.top_marcas as any[]).length === 0 && (
              <p className="text-sm text-slate-500">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Fornecedor Top */}
        <Card className="bg-[#1E293B] border-[#334155]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Fornecedor Mais Usado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-slate-100">
              {report.fornecedor_top || "—"}
            </p>
          </CardContent>
        </Card>

        {/* Lista Mix */}
        <Card className="bg-[#1E293B] border-[#334155]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Lista Mix Atualizados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-slate-100">
              <span className="text-primary">{report.lista_mix_atualizados}</span>
              <span className="text-slate-400 text-sm"> / {report.lista_mix_total}</span>
            </p>
            {report.lista_mix_total > 0 && (
              <div className="mt-2 h-2 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${(report.lista_mix_atualizados / report.lista_mix_total) * 100}%`,
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  badge,
  valueClass = "",
}: {
  title: string;
  value: string;
  badge?: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xl font-bold tabular-nums ${valueClass}`}>{value}</span>
          {badge}
        </div>
      </CardContent>
    </Card>
  );
}
