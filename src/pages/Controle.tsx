import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MESES, formatBRL, parseBRLNumber, formatBRLNumber, capitalizeMarca } from "@/lib/format";
import { exportCotacoesToExcel } from "@/lib/exportExcel";
import { ExternalLink, Download, Pencil, Save, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
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
  estoque: string | null;
  fornecedor: string | null;
  uf: string | null;
  prazo: string | null;
  link: string | null;
  created_at: string;
  cotacao_grupo: string | null;
}

function calcPreco(custo: number, margemPct: number): number {
  return custo / (1 - margemPct / 100);
}

const Controle = () => {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCotacao, setEditingCotacao] = useState<Cotacao | null>(null);
  const [editForm, setEditForm] = useState({ produto: "", marca: "", part_number: "", custo: "", fornecedor: "", vendedor: "", canal: "", link: "" });
  const [saving, setSaving] = useState(false);
  const [emailCotacao, setEmailCotacao] = useState<Cotacao | null>(null);
  const [emailText, setEmailText] = useState("");
  const [emailCopied, setEmailCopied] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const startDate = new Date(ano, mes, 1).toISOString();
    const endDate = new Date(ano, mes + 1, 0, 23, 59, 59).toISOString();

    const { data } = await supabase
      .from("cotacoes")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false });

    setCotacoes((data as Cotacao[]) || []);
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [mes, ano]);

  const filtered = useMemo(() => {
    if (!search.trim()) return cotacoes;
    const q = search.toLowerCase().trim();
    return cotacoes.filter((c) =>
      c.produto.toLowerCase().includes(q) ||
      (c.marca && c.marca.toLowerCase().includes(q)) ||
      (c.part_number && c.part_number.toLowerCase().includes(q))
    );
  }, [cotacoes, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, Cotacao[]> = {};
    filtered.forEach((c) => {
      const day = new Date(c.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      if (!groups[day]) groups[day] = [];
      groups[day].push(c);
    });
    return groups;
  }, [filtered]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const handleEdit = (c: Cotacao) => {
    setEditingCotacao(c);
    setEditForm({
      produto: c.produto,
      marca: c.marca || "",
      part_number: c.part_number || "",
      custo: formatBRLNumber(c.custo),
      fornecedor: c.fornecedor || "",
      vendedor: c.vendedor,
      canal: c.canal,
      link: c.link || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCotacao) return;
    setSaving(true);
    const custoNum = parseBRLNumber(editForm.custo);
    const { error } = await supabase
      .from("cotacoes")
      .update({
        produto: editForm.produto,
        marca: editForm.marca || null,
        part_number: editForm.part_number || null,
        custo: custoNum,
        preco_15: calcPreco(custoNum, 15),
        preco_20: calcPreco(custoNum, 20),
        fornecedor: editForm.fornecedor || null,
        vendedor: editForm.vendedor,
        canal: editForm.canal,
        link: editForm.link || null,
      })
      .eq("id", editingCotacao.id);

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cotação atualizada" });
      setEditingCotacao(null);
      fetchData(false);
    }
  };

  const handleGenerateEmail = (c: Cotacao) => {
    const group = c.cotacao_grupo
      ? cotacoes.filter((x) => x.cotacao_grupo === c.cotacao_grupo)
      : [c];

    const hasNobreak = group.some((p) => {
      const lower = p.produto.toLowerCase();
      return lower.includes("nobreak") || lower.includes("estabilizador");
    });

    const produtoSection = group.length > 1
      ? group.map((p, i) => `${i + 1}. ${p.produto}\nPreço 15%: ${formatBRL(p.preco_15)}\nPreço 20%: ${formatBRL(p.preco_20)}`).join("\n\n")
      : `${group[0].produto}\nPreço 15%: ${formatBRL(group[0].preco_15)}\nPreço 20%: ${formatBRL(group[0].preco_20)}`;

    const freteSection = hasNobreak
      ? `Frete FOB: sujeito a consulta de frete`
      : `Frete Grátis: Pedidos acima de 3.000,00.\nExceto: NOBREAK e ESTABILIZADORES por tamanho e peso = sujeito a consulta de frete`;

    const text = `Olá ${c.vendedor},

Segue cotação solicitada:

${produtoSection}

Faturamento: Via ES
Expedição: 10-15 dias úteis + frete local
Prazo: 28 dias
${freteSection}

RAZÃO SOCIAL: OFFICER DISTRIBUIDORA DE TECNOLOGIA E INFORMATICA
CNPJ: 71.702.716/0006-93

Qualquer dúvida estou à disposição.`;

    setEmailText(text);
    setEmailCotacao(c);
    setEmailCopied(false);
  };

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(emailText);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">Controle de Cotações</h1>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por produto, marca ou PN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 surface-input"
        />
      </div>

      {/* Month tabs + Year selector */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex flex-wrap gap-1 bg-card rounded-lg p-1">
          {MESES.map((m, i) => (
            <button
              key={m}
              onClick={() => setMes(i)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                i === mes
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
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
          className="ml-auto gap-2 border-border text-foreground hover:bg-card"
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
            <div key={i} className="h-16 rounded-xl animate-shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">{search ? "Nenhum resultado para a busca." : "Nenhuma cotação neste período."}</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day} className="animate-fade-in-up">
              <div className="day-separator">{day}</div>
              <div className="card-elevated rounded-t-none overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header-dark border-0">
                      <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Hora</TableHead>
                      <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Produto</TableHead>
                      <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Marca</TableHead>
                      <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">PN</TableHead>
                      <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Custo</TableHead>
                      <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">15%</TableHead>
                      <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">20%</TableHead>
                      <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Fornecedor</TableHead>
                      <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Vendedor</TableHead>
                      <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Canal</TableHead>
                      <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3 w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((c, idx) => (
                      <TableRow key={c.id} className={`table-row-hover transition-all duration-150 ${idx % 2 === 1 ? "table-row-alt" : ""}`}>
                        <TableCell className="text-xs text-foreground px-4 py-3">
                          {new Date(c.created_at).toLocaleTimeString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-xs font-medium max-w-[200px] truncate text-foreground px-4 py-3">
                          {c.produto}
                          {c.link && (
                            <a href={c.link} target="_blank" rel="noopener noreferrer" className="inline-block ml-1 text-primary hover:text-primary/80">
                              <ExternalLink className="h-3 w-3 inline" />
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground px-4 py-3">{c.marca}</TableCell>
                        <TableCell className="text-xs text-muted-foreground px-4 py-3">{c.part_number}</TableCell>
                        <TableCell className="text-xs text-foreground px-4 py-3">{formatBRL(c.custo)}</TableCell>
                        <TableCell className="text-xs font-medium text-secondary px-4 py-3">{formatBRL(c.preco_15)}</TableCell>
                        <TableCell className="text-xs font-medium text-success px-4 py-3">{formatBRL(c.preco_20)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground px-4 py-3">{c.fornecedor}</TableCell>
                        <TableCell className="text-xs text-foreground px-4 py-3">{c.vendedor}</TableCell>
                        <TableCell className="text-xs text-muted-foreground px-4 py-3">{c.canal}</TableCell>
                        <TableCell className="text-xs px-4 py-3">
                          {isAdmin && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEdit(c)}
                                className="p-1 rounded hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
                                title="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleGenerateEmail(c)}
                                className="p-1 rounded hover:bg-card text-muted-foreground hover:text-primary transition-colors"
                                title="Gerar Email"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingCotacao} onOpenChange={(open) => !open && setEditingCotacao(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cotação</DialogTitle>
            <DialogDescription>Altere os campos desejados e salve.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Produto</Label>
              <Input value={editForm.produto} onChange={(e) => setEditForm((f) => ({ ...f, produto: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Marca</Label>
                <Input value={editForm.marca} onChange={(e) => setEditForm((f) => ({ ...f, marca: capitalizeMarca(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs">Part Number</Label>
                <Input value={editForm.part_number} onChange={(e) => setEditForm((f) => ({ ...f, part_number: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Custo</Label>
                <Input value={editForm.custo} onChange={(e) => setEditForm((f) => ({ ...f, custo: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Fornecedor</Label>
                <Input value={editForm.fornecedor} onChange={(e) => setEditForm((f) => ({ ...f, fornecedor: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Vendedor</Label>
                <Input value={editForm.vendedor} onChange={(e) => setEditForm((f) => ({ ...f, vendedor: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Canal</Label>
                <Input value={editForm.canal} onChange={(e) => setEditForm((f) => ({ ...f, canal: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Link</Label>
              <Input value={editForm.link} onChange={(e) => setEditForm((f) => ({ ...f, link: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditingCotacao(null)}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={!!emailCotacao} onOpenChange={(open) => !open && setEmailCotacao(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Email da Cotação</DialogTitle>
            <DialogDescription>Edite o texto se necessário e copie.</DialogDescription>
          </DialogHeader>
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            className="w-full min-h-[300px] whitespace-pre-wrap text-sm leading-relaxed font-sans bg-background rounded-lg p-4 border border-border outline-none resize-y text-foreground"
          />
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEmailCotacao(null)}>Fechar</Button>
            <Button
              size="sm"
              onClick={handleCopyEmail}
              className={emailCopied ? "bg-success hover:bg-success/90 text-success-foreground" : ""}
            >
              {emailCopied ? "Copiado! ✓" : "Copiar Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Controle;
