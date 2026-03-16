import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, TrendingUp, TrendingDown, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Alerta {
  id: string;
  produto: string;
  part_number: string | null;
  fornecedor: string | null;
  custo_anterior: number;
  custo_atual: number;
  variacao_percentual: number;
  tipo: string;
  lido: boolean;
  created_at: string;
}

const Alertas = () => {
  const { toast } = useToast();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | "aumento" | "queda">("todos");
  const [limite, setLimite] = useState("10");
  const [savingLimite, setSavingLimite] = useState(false);

  const fetchAlertas = async () => {
    setLoading(true);
    let query = supabase.from("alertas").select("*").order("created_at", { ascending: false });
    if (filtro !== "todos") query = query.eq("tipo", filtro);
    const { data } = await query;
    setAlertas((data as Alerta[]) || []);
    setLoading(false);
  };

  const fetchLimite = async () => {
    const { data } = await supabase
      .from("configuracoes")
      .select("valor")
      .eq("chave", "limite_variacao")
      .single();
    if (data) setLimite(data.valor);
  };

  useEffect(() => { fetchLimite(); }, []);
  useEffect(() => { fetchAlertas(); }, [filtro]);

  const markAsRead = async (id: string) => {
    await supabase.from("alertas").update({ lido: true }).eq("id", id);
    setAlertas((prev) => prev.map((a) => (a.id === id ? { ...a, lido: true } : a)));
  };

  const saveLimite = async () => {
    setSavingLimite(true);
    await supabase
      .from("configuracoes")
      .update({ valor: limite, updated_at: new Date().toISOString() })
      .eq("chave", "limite_variacao");
    setSavingLimite(false);
    toast({ title: "Limite atualizado", description: `Novo limite: ${limite}%` });
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">Alertas de Preço</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitore variações significativas nos custos dos produtos
        </p>
      </div>

      {/* Config */}
      <div className="card-elevated p-4 mb-6 flex items-center gap-3 flex-wrap">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Limite de variação:</span>
        <Input
          value={limite}
          onChange={(e) => setLimite(e.target.value)}
          className="w-20 h-8 text-sm surface-input"
        />
        <span className="text-sm text-muted-foreground">%</span>
        <Button size="sm" onClick={saveLimite} disabled={savingLimite}>
          Salvar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {([
          { value: "todos" as const, label: "Todos" },
          { value: "aumento" as const, label: "▲ Aumentos" },
          { value: "queda" as const, label: "▼ Quedas" },
        ]).map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
              filtro === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl animate-shimmer" />)}
        </div>
      ) : alertas.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum alerta encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((a) => {
            const isAumento = a.tipo === "aumento";
            const borderColor = isAumento ? "border-l-warning" : "border-l-success";

            return (
              <div
                key={a.id}
                className={`card-elevated p-4 border-l-[3px] ${borderColor} transition-all duration-200 ${a.lido ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-4">
                  <div className={isAumento ? "text-warning mt-1" : "text-success mt-1"}>
                    {isAumento ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">{a.produto}</span>
                      {a.part_number && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {a.part_number}
                        </Badge>
                      )}
                      {!a.lido && (
                        <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                      )}
                    </div>
                    {a.fornecedor && (
                      <p className="text-xs text-muted-foreground mb-1">Fornecedor: {a.fornecedor}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{formatBRL(a.custo_anterior)}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-semibold text-foreground">{formatBRL(a.custo_atual)}</span>
                      <span className={`font-bold ${isAumento ? "text-warning" : "text-success"}`}>
                        {isAumento ? "▲" : "▼"} {a.variacao_percentual > 0 ? "+" : ""}{a.variacao_percentual.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{formatDate(a.created_at)}</p>
                  </div>
                  {!a.lido && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(a.id)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <Check className="h-4 w-4 mr-1" /> Lido
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Alertas;
