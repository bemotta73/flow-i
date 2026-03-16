import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseBRLNumber, formatBRL, capitalizeMarca } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MarginPreview } from "./MarginPreview";
import { EmailPreview, type MargemSelecionada } from "./EmailPreview";
import { ImageUpload, type ExtractedData } from "./ImageUpload";
import { Save, Eraser, Loader2, Plus, X, Pencil, AlertTriangle } from "lucide-react";
import { checkPriceAlert } from "@/lib/alertas";

interface Vendedor {
  id: string;
  nome: string;
}

export interface ProdutoItem {
  produto: string;
  marca: string;
  partNumber: string;
  custo: string;
  custoNum: number;
  estoque: string;
  fornecedor: string;
  uf: string;
  prazo: string;
  link: string;
}

const emptyProduto = {
  produto: "",
  marca: "",
  partNumber: "",
  custo: "",
  estoque: "",
  fornecedor: "",
  uf: "",
  prazo: "",
  link: "",
};

export function QuotationForm() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [saving, setSaving] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [margemSelecionada, setMargemSelecionada] = useState<MargemSelecionada>("20");
  const [customMargem, setCustomMargem] = useState("");

  const [vendedor, setVendedor] = useState("");
  const [canal, setCanal] = useState("");
  const [form, setForm] = useState({ ...emptyProduto });
  const [produtos, setProdutos] = useState<ProdutoItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [alertBanners, setAlertBanners] = useState<Array<{ produto: string; variacao: number; custoAnterior: number; custoAtual: number }>>([]);
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    supabase.from("vendedores").select("id, nome").eq("ativo", true).then(({ data }) => {
      if (data) setVendedores(data);
    });
  }, []);

  const custoNum = parseBRLNumber(form.custo);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: field === "marca" ? capitalizeMarca(value) : value }));
    setShowEmail(false);
  };

  const handleExtracted = (data: ExtractedData) => {
    setForm((prev) => ({
      ...prev,
      produto: data.produto || prev.produto,
      marca: capitalizeMarca(data.marca || prev.marca),
      partNumber: data.partNumber || prev.partNumber,
      custo: data.custo || prev.custo,
      estoque: data.estoque || prev.estoque,
      fornecedor: data.fornecedor || prev.fornecedor,
      uf: data.uf || prev.uf,
    }));
    setShowEmail(false);
  };

  const handleAddProduct = () => {
    if (!form.produto || !custoNum) {
      toast({ title: "Campos obrigatórios", description: "Preencha produto e custo para adicionar.", variant: "destructive" });
      return;
    }
    if (editingIndex !== null) {
      setProdutos((prev) => prev.map((p, i) => i === editingIndex ? { ...form, custoNum } : p));
      setEditingIndex(null);
    } else {
      setProdutos((prev) => [...prev, { ...form, custoNum }]);
    }
    setForm({ ...emptyProduto });
    setShowEmail(false);
  };

  const handleEditProduct = (index: number) => {
    const p = produtos[index];
    setForm({ produto: p.produto, marca: p.marca, partNumber: p.partNumber, custo: p.custo, estoque: p.estoque, fornecedor: p.fornecedor, uf: p.uf, prazo: p.prazo, link: p.link });
    setEditingIndex(index);
    setShowEmail(false);
  };

  const handleCancelEdit = () => {
    setForm({ ...emptyProduto });
    setEditingIndex(null);
  };

  const handleRemoveProduct = (index: number) => {
    setProdutos((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) { setEditingIndex(null); setForm({ ...emptyProduto }); }
    else if (editingIndex !== null && index < editingIndex) { setEditingIndex(editingIndex - 1); }
    setShowEmail(false);
  };

  const handleClear = () => {
    setForm({ ...emptyProduto });
    setProdutos([]);
    setVendedor("");
    setCanal("");
    setShowEmail(false);
    setEditingIndex(null);
  };

  const handleFinalize = async () => {
    if (!vendedor || !canal) {
      toast({ title: "Campos obrigatórios", description: "Preencha vendedor e canal.", variant: "destructive" });
      return;
    }

    const allProducts = [...produtos];
    if (form.produto && custoNum) {
      allProducts.push({ ...form, custoNum });
    }

    if (allProducts.length === 0) {
      toast({ title: "Nenhum produto", description: "Adicione pelo menos um produto.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const cotacaoGrupo = crypto.randomUUID();

      const rows = allProducts.map((p) => ({
        vendedor,
        canal,
        produto: p.produto,
        marca: p.marca || null,
        part_number: p.partNumber || null,
        custo: p.custoNum,
        preco_15: p.custoNum / 0.85,
        preco_20: p.custoNum / 0.80,
        estoque: p.estoque || null,
        fornecedor: p.fornecedor || null,
        uf: p.uf || null,
        prazo: p.prazo || null,
        link: p.link || null,
        cotacao_grupo: cotacaoGrupo,
      }));

      const { error } = await supabase.from("cotacoes").insert(rows);
      if (error) throw error;

      const banners: typeof alertBanners = [];
      for (const p of allProducts) {
        try {
          const alerta = await checkPriceAlert(p.produto, p.partNumber || null, p.fornecedor || null, p.custoNum);
          if (alerta) {
            banners.push({
              produto: p.produto,
              variacao: alerta.variacao_percentual,
              custoAnterior: alerta.custo_anterior,
              custoAtual: alerta.custo_atual,
            });
          }
        } catch {}
      }
      setAlertBanners(banners);

      setProdutos(allProducts.map((p) => ({ ...p, custoNum: p.custoNum })));
      setForm({ ...emptyProduto });
      setShowEmail(true);
      toast({ title: "Cotação salva!", description: `${allProducts.length} produto(s) salvo(s) com sucesso.` });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const allProductsForEmail = showEmail
    ? (produtos.length > 0 ? produtos : (form.produto && custoNum ? [{ ...form, custoNum }] : []))
    : [];

  const inputClass = "surface-input";

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {alertBanners.length > 0 && (
        <div className="space-y-2 animate-fade-in-up">
          {alertBanners.map((b, i) => (
            <button
              key={i}
              onClick={() => navigate("/alertas")}
              className={`w-full text-left rounded-xl p-3 flex items-center gap-3 transition-all hover:opacity-80 ${
                b.variacao > 0
                  ? "bg-warning/15 border border-warning/30 text-warning"
                  : "bg-success/15 border border-success/30 text-success"
              }`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-sm">
                <strong>{b.produto}</strong> variou {b.variacao > 0 ? "+" : ""}{b.variacao.toFixed(1)}% em relação à última cotação ({formatBRL(b.custoAnterior)} → {formatBRL(b.custoAtual)})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Image Upload */}
      <ImageUpload onExtracted={handleExtracted} />

      {/* Shared fields */}
      <div className="card-elevated p-6 space-y-5 animate-fade-in-up">
        <p className="text-[13px] font-semibold text-primary uppercase tracking-wide">Dados da Cotação</p>
        <div className="grid gap-4 sm:grid-cols-2">
           <div className="space-y-2">
            <label className="label-apple">Vendedor *</label>
            <Select value={vendedor} onValueChange={(v) => { setVendedor(v); setShowEmail(false); }} disabled={produtos.length > 0 && !!vendedor}>
              <SelectTrigger className={cn(inputClass, produtos.length > 0 && !!vendedor && "opacity-60 cursor-not-allowed")}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {vendedores.map((v) => (
                  <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="label-apple">Canal *</label>
            <Select value={canal} onValueChange={(v) => { setCanal(v); setShowEmail(false); }} disabled={produtos.length > 0 && !!canal}>
              <SelectTrigger className={cn(inputClass, produtos.length > 0 && !!canal && "opacity-60 cursor-not-allowed")}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Teams">Teams</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Product list */}
      {produtos.length > 0 && (
        <div className="space-y-2 animate-fade-in-up">
          <p className="label-apple">Produtos adicionados ({produtos.length})</p>
          <div className="space-y-2">
            {produtos.map((p, i) => (
              <div key={i} className={cn("group flex items-center gap-3 rounded-xl p-3.5 animate-slide-in-left", editingIndex === i ? "bg-primary/10 ring-1 ring-primary" : "bg-card")} style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.produto}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.marca && `${p.marca} · `}
                    Custo: {formatBRL(p.custoNum)} ·{" "}
                    <span className="text-secondary">15%: {formatBRL(p.custoNum / 0.85)}</span> ·{" "}
                    <span className="text-success">20%: {formatBRL(p.custoNum / 0.80)}</span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary transition-all"
                  onClick={() => handleEditProduct(i)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                  onClick={() => handleRemoveProduct(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product form fields */}
      <div className="card-elevated p-6 space-y-5 animate-fade-in-up">
        <p className="text-[13px] font-semibold text-primary uppercase tracking-wide">
          {editingIndex !== null ? `Editando Produto #${editingIndex + 1}` : produtos.length > 0 ? "Adicionar Próximo Produto" : "Dados do Produto"}
        </p>

        <div className="space-y-2">
          <label className="label-apple">Produto *</label>
          <Input value={form.produto} onChange={(e) => update("produto", e.target.value)} placeholder="Nome completo do produto" className={inputClass} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="label-apple">Marca</label>
            <Input value={form.marca} onChange={(e) => update("marca", e.target.value)} placeholder="Marca" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className="label-apple">Part Number</label>
            <Input value={form.partNumber} onChange={(e) => update("partNumber", e.target.value)} placeholder="PN" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className="label-apple">Custo R$ *</label>
            <Input value={form.custo} onChange={(e) => update("custo", e.target.value)} placeholder="568,03" className={inputClass} />
          </div>
        </div>

        <MarginPreview custo={custoNum} />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="label-apple">Estoque</label>
            <Input value={form.estoque} onChange={(e) => update("estoque", e.target.value)} placeholder="Quantidade" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className="label-apple">Fornecedor</label>
            <Input value={form.fornecedor} onChange={(e) => update("fornecedor", e.target.value)} placeholder="Distribuidor" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className="label-apple">UF</label>
            <Input value={form.uf} onChange={(e) => update("uf", e.target.value)} placeholder="SP" className={inputClass} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="label-apple">Prazo</label>
            <Input value={form.prazo} onChange={(e) => update("prazo", e.target.value)} placeholder="Ex: 10-15 dias úteis" className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className="label-apple">Link do Produto</label>
            <Input value={form.link} onChange={(e) => update("link", e.target.value)} placeholder="URL (opcional)" className={inputClass} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddProduct}
            className="gap-2 border-border text-foreground hover:bg-card rounded-lg transition-all duration-150"
          >
            <Plus className="h-4 w-4" /> {editingIndex !== null ? "Salvar Alteração" : "Adicionar Produto"}
          </Button>
          {editingIndex !== null && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancelEdit}
              className="gap-2 text-muted-foreground hover:text-foreground rounded-lg"
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Observação para o email */}
      <div className="card-elevated p-6 space-y-3 animate-fade-in-up">
        <p className="text-[13px] font-semibold text-primary uppercase tracking-wide">Observação para o Email</p>
        <p className="text-xs text-muted-foreground">Texto opcional que será adicionado ao final do email, antes dos dados da empresa.</p>
        <textarea
          value={observacao}
          onChange={(e) => { setObservacao(e.target.value); setShowEmail(false); }}
          placeholder="Ex: Valor especial válido por 48h, Condição exclusiva para este pedido..."
          className="w-full min-h-[80px] rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_hsla(168,76%,37%,0.15)] resize-y"
        />
      </div>

      <div className="space-y-2">
        <p className="text-[13px] font-semibold text-primary uppercase tracking-wide">Margem para o Email</p>
        <div className="flex gap-2 items-center">
          {([
            { value: "15" as MargemSelecionada, label: "15%" },
            { value: "20" as MargemSelecionada, label: "20%" },
            { value: "custom" as MargemSelecionada, label: "Personalizado" },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setMargemSelecionada(opt.value); setShowEmail(false); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                margemSelecionada === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {margemSelecionada === "custom" && (
            <div className="flex items-center gap-1.5">
              <Input
                value={customMargem}
                onChange={(e) => { setCustomMargem(e.target.value); setShowEmail(false); }}
                placeholder="Ex: 18"
                className="w-20 h-9 text-sm surface-input"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleFinalize}
          disabled={saving}
          className="gap-2 rounded-lg transition-all duration-150"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Finalizar e Gerar Email
        </Button>
        <Button
          onClick={handleClear}
          variant="ghost"
          className="gap-2 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Eraser className="h-4 w-4" /> Limpar Tudo
        </Button>
      </div>

      {/* Email Preview */}
      {showEmail && allProductsForEmail.length > 0 && (
        <div className="animate-fade-in-up">
          <EmailPreview vendedor={vendedor} produtos={allProductsForEmail} margem={margemSelecionada} customMargem={parseFloat(customMargem) || undefined} observacao={observacao} />
        </div>
      )}
    </div>
  );
}
