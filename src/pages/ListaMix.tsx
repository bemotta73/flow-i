import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Search, Plus, Download, Upload, Pencil, X, Check, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface Produto {
  id: string;
  produto: string;
  marca: string | null;
  part_number: string | null;
  custo: number;
  preco_15: number;
  preco_20: number;
  fornecedor: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface ProdutoForm {
  produto: string;
  marca: string;
  part_number: string;
  custo: string;
  fornecedor: string;
}

const emptyForm: ProdutoForm = { produto: "", marca: "", part_number: "", custo: "", fornecedor: "" };

const ListaMix = () => {
  const { toast } = useToast();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProdutoForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Import states
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProdutos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lista_mix")
      .select("*")
      .order("produto", { ascending: true });
    setProdutos((data as Produto[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchProdutos(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return produtos;
    const s = search.toLowerCase();
    return produtos.filter(
      (p) =>
        p.produto.toLowerCase().includes(s) ||
        (p.marca && p.marca.toLowerCase().includes(s)) ||
        (p.part_number && p.part_number.toLowerCase().includes(s))
    );
  }, [produtos, search]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Produto) => {
    setEditingId(p.id);
    setForm({
      produto: p.produto,
      marca: p.marca || "",
      part_number: p.part_number || "",
      custo: String(p.custo),
      fornecedor: p.fornecedor || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.produto.trim() || !form.custo.trim()) {
      toast({ title: "Erro", description: "Produto e Custo são obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    const custo = parseFloat(form.custo.replace(",", "."));
    const preco_15 = Math.round(custo * 1.15 * 100) / 100;
    const preco_20 = Math.round(custo * 1.20 * 100) / 100;

    const row = {
      produto: form.produto.trim(),
      marca: form.marca.trim() || null,
      part_number: form.part_number.trim() || null,
      custo,
      preco_15,
      preco_20,
      fornecedor: form.fornecedor.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      await supabase.from("lista_mix").update(row).eq("id", editingId);
      toast({ title: "Produto atualizado" });
    } else {
      await supabase.from("lista_mix").insert(row);
      toast({ title: "Produto adicionado" });
    }

    setSaving(false);
    setDialogOpen(false);
    fetchProdutos();
  };

  const toggleAtivo = async (p: Produto) => {
    await supabase.from("lista_mix").update({ ativo: !p.ativo, updated_at: new Date().toISOString() }).eq("id", p.id);
    fetchProdutos();
    toast({ title: p.ativo ? "Produto desativado" : "Produto reativado" });
  };

  // Export
  const handleExport = () => {
    const rows = filtered.map((p) => ({
      Produto: p.produto,
      Marca: p.marca || "",
      "Part Number": p.part_number || "",
      Custo: formatBRL(p.custo),
      "Preço 15%": formatBRL(p.preco_15),
      "Preço 20%": formatBRL(p.preco_20),
      Fornecedor: p.fornecedor || "",
      Status: p.ativo ? "Ativo" : "Inativo",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lista Mix");
    XLSX.writeFile(wb, "lista-mix.xlsx");
  };

  // Import
  const parseCustoBRL = (raw: any): number => {
    if (typeof raw === "number") return raw;
    const s = String(raw || "0")
      .replace(/R\$\s*/g, "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    return parseFloat(s) || 0;
  };

  const detectColumnIndex = (headers: string[], keywords: string[]): number => {
    return headers.findIndex((h) => {
      const lower = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return keywords.some((k) => lower.includes(k));
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

      if (rows.length === 0) {
        toast({ title: "Planilha vazia", variant: "destructive" });
        return;
      }

      // Find the header row (may not be the first row — skip title rows)
      let headerRowIdx = -1;
      let fornecedorIdx = -1, pnIdx = -1, produtoIdx = -1, marcaIdx = -1, custoIdx = -1;

      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const cells = (rows[i] || []).map((c: any) => String(c || ""));
        const f = detectColumnIndex(cells, ["fornecedor"]);
        const p = detectColumnIndex(cells, ["produto", "produtos", "descricao", "item"]);
        const c = detectColumnIndex(cells, ["custo", "preco", "precos", "valor", "price"]);
        // Need at least 2 matches to consider it a header
        if ([f, p, c].filter((x) => x !== -1).length >= 2) {
          headerRowIdx = i;
          fornecedorIdx = f;
          produtoIdx = p;
          custoIdx = c;
          pnIdx = detectColumnIndex(cells, ["pn", "part_number", "part number", "partnumber", "codigo"]);
          marcaIdx = detectColumnIndex(cells, ["marca", "fabricante", "brand"]);
          break;
        }
      }

      let startIdx: number;
      if (headerRowIdx !== -1) {
        startIdx = headerRowIdx + 1;
      } else {
        // Fallback: assume A=fornecedor, B=PN, C=produto, D=marca, E=custo
        fornecedorIdx = 0;
        pnIdx = 1;
        produtoIdx = 2;
        marcaIdx = 3;
        custoIdx = 4;
        startIdx = 0;
      }

      const colLabel = (idx: number) => idx !== -1 ? String.fromCharCode(65 + idx) : "—";
      const detectedNames = headerRowIdx !== -1
        ? `Fornecedor→${colLabel(fornecedorIdx)}, PN→${colLabel(pnIdx)}, Produto→${colLabel(produtoIdx)}, Marca→${colLabel(marcaIdx)}, Custo→${colLabel(custoIdx)}`
        : "Sem cabeçalho — usando A=Fornecedor, B=PN, C=Produto, D=Marca, E=Custo";

      const mapped = rows.slice(startIdx).map((row) => {
        const fornecedor = fornecedorIdx !== -1 ? String(row[fornecedorIdx] ?? "").trim() : "";
        const part_number = pnIdx !== -1 ? String(row[pnIdx] ?? "").trim() : "";
        const produto = produtoIdx !== -1 ? String(row[produtoIdx] ?? "").trim() : "";
        const marca = marcaIdx !== -1 ? String(row[marcaIdx] ?? "").trim() : "";
        const custo = custoIdx !== -1 ? parseCustoBRL(row[custoIdx]) : 0;
        return {
          produto,
          marca,
          part_number,
          custo,
          preco_15: Math.round(custo * 1.15 * 100) / 100,
          preco_20: Math.round(custo * 1.20 * 100) / 100,
          fornecedor,
        };
      }).filter((r) => r.produto && r.custo > 0);

      if (mapped.length === 0) {
        toast({ title: "Nenhum produto válido encontrado", description: detectedNames, variant: "destructive" });
        return;
      }

      setImportPreview(mapped);
      setImportDialogOpen(true);
      toast({ title: "Colunas detectadas", description: detectedNames });
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    setImporting(true);

    for (const item of importPreview) {
      // Check for existing product by name or PN
      const { data: existing } = await supabase
        .from("lista_mix")
        .select("id")
        .or(`produto.eq.${item.produto}${item.part_number ? `,part_number.eq.${item.part_number}` : ""}`)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase.from("lista_mix").update({
          custo: item.custo,
          preco_15: item.preco_15,
          preco_20: item.preco_20,
          marca: item.marca || null,
          part_number: item.part_number || null,
          fornecedor: item.fornecedor || null,
          updated_at: new Date().toISOString(),
        }).eq("id", existing[0].id);
      } else {
        await supabase.from("lista_mix").insert({
          produto: item.produto,
          marca: item.marca || null,
          part_number: item.part_number || null,
          custo: item.custo,
          preco_15: item.preco_15,
          preco_20: item.preco_20,
          fornecedor: item.fornecedor || null,
        });
      }
    }

    setImporting(false);
    setImportDialogOpen(false);
    setImportPreview(null);
    fetchProdutos();
    toast({ title: "Importação concluída", description: `${importPreview.length} produtos processados` });
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-warning">Lista Mix</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie a base de produtos e preços</p>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto, marca ou PN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 surface-input"
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" className="gap-2 border-primary text-primary hover:bg-primary/10" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Importar Excel
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
          <Button variant="outline" size="sm" className="gap-2 border-primary text-primary hover:bg-primary/10" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" /> Exportar Excel
          </Button>
          <Button size="sm" className="gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Adicionar Produto
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-2xl animate-shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header-dark border-0">
                {isAdmin && <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Fornecedor</TableHead>}
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Produto</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Marca</TableHead>
                {isAdmin && <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Custo</TableHead>}
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">PN</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">15%</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">20%</TableHead>
                {isAdmin && <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Status</TableHead>}
                {isAdmin && <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider w-20">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p, idx) => (
                <TableRow key={p.id} className={`table-row-hover transition-all duration-150 ${idx % 2 === 1 ? "table-row-alt" : ""} ${!p.ativo ? "opacity-50" : ""}`}>
                  {isAdmin && <TableCell className="text-xs text-muted-foreground">{p.fornecedor}</TableCell>}
                  <TableCell className="text-xs font-medium text-foreground">{p.produto}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.marca}</TableCell>
                  {isAdmin && <TableCell className="text-xs text-foreground">{formatBRL(p.custo)}</TableCell>}
                  <TableCell className="text-xs text-muted-foreground">{p.part_number}</TableCell>
                  <TableCell className="text-xs font-medium text-primary">{formatBRL(p.preco_15)}</TableCell>
                  <TableCell className="text-xs font-medium text-success">{formatBRL(p.preco_20)}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.ativo ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                        {p.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>
                  )}
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-primary/20 text-primary transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => toggleAtivo(p)} className={`p-1.5 rounded-lg transition-colors ${p.ativo ? "hover:bg-destructive/20 text-destructive" : "hover:bg-success/20 text-success"}`}>
                          {p.ativo ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader>
            <DialogTitle className="text-warning font-semibold">
              {editingId ? "Editar Produto" : "Adicionar Produto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="label-apple block mb-1">Produto *</label>
              <Input value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} className="surface-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-apple block mb-1">Marca</label>
                <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} className="surface-input" />
              </div>
              <div>
                <label className="label-apple block mb-1">Part Number</label>
                <Input value={form.part_number} onChange={(e) => setForm({ ...form, part_number: e.target.value })} className="surface-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-apple block mb-1">Custo (R$) *</label>
                <Input value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} className="surface-input" placeholder="0.00" />
              </div>
              <div>
                <label className="label-apple block mb-1">Fornecedor</label>
                <Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} className="surface-input" />
              </div>
            </div>
            {form.custo && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted">
                <div>
                  <span className="label-apple">Preço 15%</span>
                  <p className="text-sm font-medium text-primary">{formatBRL(parseFloat(form.custo.replace(",", ".") || "0") * 1.15)}</p>
                </div>
                <div>
                  <span className="label-apple">Preço 20%</span>
                  <p className="text-sm font-medium text-success">{formatBRL(parseFloat(form.custo.replace(",", ".") || "0") * 1.20)}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="bg-card border-card-border max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-warning font-semibold">Preview da Importação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{importPreview?.length || 0} produtos encontrados na planilha</p>
          <div className="max-h-[50vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="table-header-dark border-0">
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">Fornecedor</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">Produto</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">Marca</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">Custo</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">PN</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">15%</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">20%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importPreview?.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs text-muted-foreground">{item.fornecedor}</TableCell>
                    <TableCell className="text-xs text-foreground">{item.produto}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.marca}</TableCell>
                    <TableCell className="text-xs text-foreground">{formatBRL(item.custo)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.part_number}</TableCell>
                    <TableCell className="text-xs text-primary">{formatBRL(item.preco_15)}</TableCell>
                    <TableCell className="text-xs text-success">{formatBRL(item.preco_20)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportPreview(null); }}>Cancelar</Button>
            <Button onClick={confirmImport} disabled={importing}>
              {importing ? "Importando..." : "Confirmar Importação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListaMix;
