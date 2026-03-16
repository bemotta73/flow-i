import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Tag, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/format";

interface Promocao {
  id: string;
  produto_id: string | null;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  desconto_percentual: number | null;
  preco_promocional: number | null;
  data_inicio: string;
  data_fim: string | null;
  ativo: boolean;
  created_at: string;
  produto_nome?: string;
}

interface ProdutoMix {
  id: string;
  produto: string;
  marca: string | null;
  preco_15: number;
  preco_20: number;
}

const Promocoes = () => {
  const { toast } = useToast();
  const [promocoes, setPromocoes] = useState<Promocao[]>([]);
  const [produtos, setProdutos] = useState<ProdutoMix[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Promocao | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [descontoPercentual, setDescontoPercentual] = useState("");
  const [precoPromocional, setPrecoPromocional] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [ativo, setAtivo] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: promos }, { data: prods }] = await Promise.all([
      supabase.from("promocoes").select("*").order("created_at", { ascending: false }),
      supabase.from("lista_mix").select("id, produto, marca, preco_15, preco_20").eq("ativo", true).order("produto"),
    ]);

    if (prods) setProdutos(prods as ProdutoMix[]);

    if (promos && prods) {
      const enriched = (promos as any[]).map((p) => {
        const prod = (prods as ProdutoMix[]).find((pr) => pr.id === p.produto_id);
        return { ...p, produto_nome: prod?.produto || "—" };
      });
      setPromocoes(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setTitulo(""); setDescricao(""); setImagemUrl(""); setProdutoId("");
    setDescontoPercentual(""); setPrecoPromocional(""); setDataInicio(""); setDataFim("");
    setAtivo(true); setEditing(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (p: Promocao) => {
    setEditing(p);
    setTitulo(p.titulo);
    setDescricao(p.descricao || "");
    setImagemUrl(p.imagem_url || "");
    setProdutoId(p.produto_id || "");
    setDescontoPercentual(p.desconto_percentual?.toString() || "");
    setPrecoPromocional(p.preco_promocional?.toString() || "");
    setDataInicio(p.data_inicio ? new Date(p.data_inicio).toISOString().slice(0, 16) : "");
    setDataFim(p.data_fim ? new Date(p.data_fim).toISOString().slice(0, 16) : "");
    setAtivo(p.ativo);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!titulo.trim()) {
      toast({ title: "Erro", description: "Título é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload: any = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      imagem_url: imagemUrl.trim() || null,
      produto_id: produtoId || null,
      desconto_percentual: descontoPercentual ? parseFloat(descontoPercentual) : null,
      preco_promocional: precoPromocional ? parseFloat(precoPromocional) : null,
      data_inicio: dataInicio ? new Date(dataInicio).toISOString() : new Date().toISOString(),
      data_fim: dataFim ? new Date(dataFim).toISOString() : null,
      ativo,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from("promocoes").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("promocoes").insert(payload));
    }

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Promoção atualizada" : "Promoção criada" });
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta promoção?")) return;
    const { error } = await supabase.from("promocoes").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Promoção excluída" });
      fetchData();
    }
  };

  const toggleAtivo = async (p: Promocao) => {
    await supabase.from("promocoes").update({ ativo: !p.ativo }).eq("id", p.id);
    fetchData();
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-warning">Promoções</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie banners e descontos temporários para os vendedores</p>
      </div>

      <div className="flex items-center mb-6">
        <Button size="sm" className="gap-2 ml-auto" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nova Promoção
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-2xl animate-shimmer" />)}
        </div>
      ) : promocoes.length === 0 ? (
        <div className="text-center py-16">
          <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma promoção cadastrada</p>
        </div>
      ) : (
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header-dark border-0">
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Título</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Produto</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Desconto</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Preço Promo</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Validade</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promocoes.map((p, idx) => {
                const isExpired = p.data_fim && new Date(p.data_fim) < new Date();
                return (
                  <TableRow key={p.id} className={`table-row-hover transition-all duration-150 ${idx % 2 === 1 ? "table-row-alt" : ""}`}>
                    <TableCell className="text-sm font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {p.imagem_url && (
                          <img src={p.imagem_url} alt="" className="h-8 w-8 rounded object-cover" />
                        )}
                        {p.titulo}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.produto_nome}</TableCell>
                    <TableCell className="text-sm text-warning font-semibold">
                      {p.desconto_percentual ? `${p.desconto_percentual}%` : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-success">
                      {p.preco_promocional ? formatBRL(p.preco_promocional) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.data_fim ? (
                        <span className={isExpired ? "text-destructive" : ""}>
                          {new Date(p.data_fim).toLocaleDateString("pt-BR")}
                          {isExpired && " (expirada)"}
                        </span>
                      ) : "Sem prazo"}
                    </TableCell>
                    <TableCell>
                      <Switch checked={p.ativo} onCheckedChange={() => toggleAtivo(p)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-warning/20 text-warning transition-colors" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive transition-colors" title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="bg-card border-card-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-warning font-semibold">
              {editing ? "Editar Promoção" : "Nova Promoção"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="label-apple block mb-1">Título *</label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="surface-input" placeholder="Ex: Black Friday 30% OFF" />
            </div>
            <div>
              <label className="label-apple block mb-1">Descrição</label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="surface-input min-h-[60px]" placeholder="Descrição da promoção" />
            </div>
            <div>
              <label className="label-apple block mb-1">URL da Imagem (banner)</label>
              <Input value={imagemUrl} onChange={(e) => setImagemUrl(e.target.value)} className="surface-input" placeholder="https://..." />
              {imagemUrl && (
                <img src={imagemUrl} alt="Preview" className="mt-2 h-24 rounded-lg object-cover" />
              )}
            </div>
            <div>
              <label className="label-apple block mb-1">Produto vinculado</label>
              <select
                value={produtoId}
                onChange={(e) => setProdutoId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Nenhum (banner geral)</option>
                {produtos.map((pr) => (
                  <option key={pr.id} value={pr.id}>{pr.produto} {pr.marca ? `(${pr.marca})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-apple block mb-1">Desconto (%)</label>
                <Input type="number" value={descontoPercentual} onChange={(e) => setDescontoPercentual(e.target.value)} className="surface-input" placeholder="Ex: 15" />
              </div>
              <div>
                <label className="label-apple block mb-1">Preço Promocional</label>
                <Input type="number" step="0.01" value={precoPromocional} onChange={(e) => setPrecoPromocional(e.target.value)} className="surface-input" placeholder="Ex: 99.90" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-apple block mb-1">Início</label>
                <Input type="datetime-local" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="surface-input" />
              </div>
              <div>
                <label className="label-apple block mb-1">Fim</label>
                <Input type="datetime-local" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="surface-input" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={ativo} onCheckedChange={setAtivo} />
              <span className="text-sm text-muted-foreground">Promoção ativa</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Promocoes;
