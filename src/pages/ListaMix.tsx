import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, capitalizeMarca } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Search, Plus, Download, Pencil, X, Check, FileSpreadsheet, TableProperties, Save, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import ImportMix from "@/components/ImportMix";

interface Produto {
  id: string;
  produto: string;
  marca: string | null;
  part_number: string | null;
  custo: number;
  preco_15: number;
  preco_20: number;
  fornecedor: string | null;
  link: string | null;
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
  link: string;
}

interface EditableRow {
  id: string;
  fornecedor: string;
  produto: string;
  marca: string;
  part_number: string;
  custo: string;
}

const emptyForm: ProdutoForm = { produto: "", marca: "", part_number: "", custo: "", fornecedor: "", link: "" };

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

  // Inline edit mode
  const [editMode, setEditMode] = useState(false);
  const [editableRows, setEditableRows] = useState<EditableRow[]>([]);
  const [savingAll, setSavingAll] = useState(false);

  const fetchProdutos = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    const { data } = await supabase
      .from("lista_mix")
      .select("*")
      .order("produto", { ascending: true });
    setProdutos((data as Produto[]) || []);
    if (isInitial) setLoading(false);
  };

  useEffect(() => { fetchProdutos(true); }, []);

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

  // --- Inline Edit Mode ---
  const enterEditMode = () => {
    setEditableRows(
      filtered.map((p) => ({
        id: p.id,
        fornecedor: p.fornecedor || "",
        produto: p.produto,
        marca: p.marca || "",
        part_number: p.part_number || "",
        custo: String(p.custo),
      }))
    );
    setEditMode(true);
  };

  const cancelEditMode = () => {
    setEditMode(false);
    setEditableRows([]);
  };

  const updateEditableRow = (id: string, field: keyof EditableRow, value: string) => {
    setEditableRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const getEditCusto = (row: EditableRow): number => {
    return parseFloat(row.custo.replace(",", ".")) || 0;
  };

  const saveAllEdits = async () => {
    setSavingAll(true);
    let count = 0;
    for (const row of editableRows) {
      const custo = getEditCusto(row);
      const preco_15 = Math.round((custo / 0.85) * 100) / 100;
      const preco_20 = Math.round((custo / 0.80) * 100) / 100;
      await supabase.from("lista_mix").update({
        fornecedor: row.fornecedor.trim() || null,
        produto: row.produto.trim(),
        marca: row.marca.trim() || null,
        part_number: row.part_number.trim() || null,
        custo,
        preco_15,
        preco_20,
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      count++;
    }
    setSavingAll(false);
    setEditMode(false);
    setEditableRows([]);
    fetchProdutos();
    toast({ title: "Alterações salvas", description: `${count} produtos atualizados` });
  };

  // --- Single product dialog ---
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
      link: p.link || "",
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
    const preco_15 = Math.round((custo / 0.85) * 100) / 100;
    const preco_20 = Math.round((custo / 0.80) * 100) / 100;

    const row = {
      produto: form.produto.trim(),
      marca: form.marca.trim() || null,
      part_number: form.part_number.trim() || null,
      custo,
      preco_15,
      preco_20,
      fornecedor: form.fornecedor.trim() || null,
      link: form.link.trim() || null,
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

  const handleDelete = async (p: Produto) => {
    await supabase.from("lista_mix").delete().eq("id", p.id);
    fetchProdutos();
    toast({ title: "Produto excluído", description: p.produto });
  };

  // Export
  const handleExport = () => {
    const rows = filtered.map((p) => ({
      Fornecedor: p.fornecedor || "",
      PN: p.part_number || "",
      Produto: p.produto,
      Marca: p.marca || "",
      Custo: formatBRL(p.custo),
      "Preço 15%": formatBRL(p.preco_15),
      "Preço 20%": formatBRL(p.preco_20),
      Status: p.ativo ? "Ativo" : "Inativo",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lista Mix");
    XLSX.writeFile(wb, "lista-mix.xlsx");
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
          {isAdmin && !editMode && (
            <Button variant="outline" size="sm" className="gap-2 border-warning text-warning hover:bg-warning/10" onClick={enterEditMode} disabled={filtered.length === 0}>
              <TableProperties className="h-4 w-4" /> Editar Tabela
            </Button>
          )}
          {isAdmin && editMode && (
            <>
              <span className="text-xs text-muted-foreground font-medium">{editableRows.length} produtos</span>
              <Button size="sm" className="gap-2 bg-success text-success-foreground hover:bg-success/90" onClick={saveAllEdits} disabled={savingAll}>
                <Save className="h-4 w-4" /> {savingAll ? "Salvando..." : "Salvar Alterações"}
              </Button>
              <Button variant="outline" size="sm" className="gap-2 border-destructive text-destructive hover:bg-destructive/10" onClick={cancelEditMode}>
                <X className="h-4 w-4" /> Cancelar
              </Button>
            </>
          )}
          {!editMode && (
            <>
              <ImportMix onComplete={fetchProdutos} />
              <Button variant="outline" size="sm" className="gap-2 border-warning text-warning hover:bg-warning/10" onClick={handleExport} disabled={filtered.length === 0}>
                <Download className="h-4 w-4" /> Exportar Excel
              </Button>
              <Button size="sm" className="gap-2 bg-warning text-warning-foreground hover:bg-warning/90" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Adicionar Produto
              </Button>
            </>
          )}
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
      ) : editMode ? (
        /* Editable Table */
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header-dark border-0">
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Fornecedor</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">PN</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Produto</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Marca</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Custo</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">15%</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">20%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editableRows.map((row, idx) => {
                const custo = getEditCusto(row);
                return (
                  <TableRow key={row.id} className={`transition-all duration-150 ${idx % 2 === 1 ? "table-row-alt" : ""}`}>
                    <TableCell>
                      <Input
                        value={row.fornecedor}
                        onChange={(e) => updateEditableRow(row.id, "fornecedor", e.target.value)}
                        className="h-7 text-xs surface-input"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.part_number}
                        onChange={(e) => updateEditableRow(row.id, "part_number", e.target.value)}
                        className="h-7 text-xs surface-input"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.produto}
                        onChange={(e) => updateEditableRow(row.id, "produto", e.target.value)}
                        className="h-7 text-xs surface-input"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.marca}
                        onChange={(e) => updateEditableRow(row.id, "marca", capitalizeMarca(e.target.value))}
                        className="h-7 text-xs surface-input"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.custo}
                        onChange={(e) => updateEditableRow(row.id, "custo", e.target.value)}
                        className="h-7 text-xs surface-input w-24"
                      />
                    </TableCell>
                    <TableCell className="text-xs font-medium text-primary">
                      {formatBRL(Math.round((custo / 0.85) * 100) / 100)}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-success">
                      {formatBRL(Math.round((custo / 0.80) * 100) / 100)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Read-only Table */
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header-dark border-0">
                {isAdmin && <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Fornecedor</TableHead>}
                {isAdmin ? (
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">PN</TableHead>
                ) : null}
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Produto</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Marca</TableHead>
                {!isAdmin && <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">PN</TableHead>}
                {isAdmin && <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Custo</TableHead>}
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
                  {isAdmin && <TableCell className="text-xs text-muted-foreground">{p.part_number}</TableCell>}
                  <TableCell className="text-xs font-medium text-foreground">{p.produto}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.marca}</TableCell>
                  {!isAdmin && <TableCell className="text-xs text-muted-foreground">{p.part_number}</TableCell>}
                  {isAdmin && <TableCell className="text-xs text-foreground">{formatBRL(p.custo)}</TableCell>}
                  <TableCell className="text-xs font-medium text-primary">{formatBRL(p.preco_15)}</TableCell>
                  <TableCell className="text-xs font-medium text-warning">{formatBRL(p.preco_20)}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.ativo ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive"}`}>
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
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-card-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir <strong>{p.produto}</strong>? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDelete(p)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
                <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: capitalizeMarca(e.target.value) })} className="surface-input" />
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
            <div>
              <label className="label-apple block mb-1">Link</label>
              <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="surface-input" placeholder="https://..." />
            </div>
            {form.custo && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted">
                <div>
                  <span className="label-apple">Preço 15%</span>
                  <p className="text-sm font-medium text-primary">{formatBRL(parseFloat(form.custo.replace(",", ".") || "0") / 0.85)}</p>
                </div>
                <div>
                  <span className="label-apple">Preço 20%</span>
                  <p className="text-sm font-medium text-success">{formatBRL(parseFloat(form.custo.replace(",", ".") || "0") / 0.80)}</p>
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
    </div>
  );
};

export default ListaMix;
