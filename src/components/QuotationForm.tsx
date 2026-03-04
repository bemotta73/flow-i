import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseBRLNumber, formatBRL } from "@/lib/format";
import { MarginPreview } from "./MarginPreview";
import { EmailPreview, type MargemSelecionada } from "./EmailPreview";
import { ImageUpload, type ExtractedData } from "./ImageUpload";
import { Save, Eraser, Loader2, Plus, X } from "lucide-react";

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
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [saving, setSaving] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [margemSelecionada, setMargemSelecionada] = useState<MargemSelecionada>("ambas");

  const [vendedor, setVendedor] = useState("");
  const [canal, setCanal] = useState("");
  const [form, setForm] = useState({ ...emptyProduto });
  const [produtos, setProdutos] = useState<ProdutoItem[]>([]);

  useEffect(() => {
    supabase.from("vendedores").select("id, nome").eq("ativo", true).then(({ data }) => {
      if (data) setVendedores(data);
    });
  }, []);

  const custoNum = parseBRLNumber(form.custo);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setShowEmail(false);
  };

  const handleExtracted = (data: ExtractedData) => {
    setForm((prev) => ({
      ...prev,
      produto: data.produto || prev.produto,
      marca: data.marca || prev.marca,
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
    setProdutos((prev) => [...prev, { ...form, custoNum }]);
    setForm({ ...emptyProduto });
    setShowEmail(false);
  };

  const handleRemoveProduct = (index: number) => {
    setProdutos((prev) => prev.filter((_, i) => i !== index));
    setShowEmail(false);
  };

  const handleClear = () => {
    setForm({ ...emptyProduto });
    setProdutos([]);
    setVendedor("");
    setCanal("");
    setShowEmail(false);
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

  return (
    <div className="space-y-6">
      {/* Image Upload */}
      <ImageUpload onExtracted={handleExtracted} />

      {/* Shared fields */}
      <div className="card-internal p-5 space-y-4 animate-fade-in-up">
        <p className="text-xs font-semibold text-card-muted-foreground uppercase tracking-wider">Dados da cotação</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-card-foreground">Vendedor *</Label>
            <Select value={vendedor} onValueChange={(v) => { setVendedor(v); setShowEmail(false); }}>
              <SelectTrigger className="bg-card border-card-border text-card-foreground"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {vendedores.map((v) => (
                  <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-card-foreground">Canal *</Label>
            <Select value={canal} onValueChange={(v) => { setCanal(v); setShowEmail(false); }}>
              <SelectTrigger className="bg-card border-card-border text-card-foreground"><SelectValue placeholder="Selecione" /></SelectTrigger>
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
          <Label className="text-sm font-semibold text-foreground">Produtos adicionados ({produtos.length})</Label>
          <div className="space-y-2">
            {produtos.map((p, i) => (
              <div key={i} className="flex items-center gap-3 card-internal p-3 animate-slide-in-left" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">{p.produto}</p>
                  <p className="text-xs text-card-muted-foreground">
                    {p.marca && `${p.marca} · `}
                    Custo: {formatBRL(p.custoNum)} ·{" "}
                    <span className="text-primary">15%: {formatBRL(p.custoNum / 0.85)}</span> ·{" "}
                    <span className="text-officer-green">20%: {formatBRL(p.custoNum / 0.80)}</span>
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-card-muted-foreground hover:text-destructive" onClick={() => handleRemoveProduct(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product form fields */}
      <div className="card-internal p-5 space-y-4 animate-fade-in-up">
        <p className="text-xs font-semibold text-card-muted-foreground uppercase tracking-wider">
          {produtos.length > 0 ? "Adicionar próximo produto" : "Dados do produto"}
        </p>

        <div className="space-y-2">
          <Label className="text-card-foreground">Produto *</Label>
          <Input value={form.produto} onChange={(e) => update("produto", e.target.value)} placeholder="Nome completo do produto" className="bg-card border-card-border text-card-foreground focus-visible:ring-primary" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-card-foreground">Marca</Label>
            <Input value={form.marca} onChange={(e) => update("marca", e.target.value)} placeholder="Marca" className="bg-card border-card-border text-card-foreground focus-visible:ring-primary" />
          </div>
          <div className="space-y-2">
            <Label className="text-card-foreground">Part Number</Label>
            <Input value={form.partNumber} onChange={(e) => update("partNumber", e.target.value)} placeholder="PN" className="bg-card border-card-border text-card-foreground focus-visible:ring-primary" />
          </div>
          <div className="space-y-2">
            <Label className="text-card-foreground">Custo R$ *</Label>
            <Input value={form.custo} onChange={(e) => update("custo", e.target.value)} placeholder="568,03" className="bg-card border-card-border text-card-foreground focus-visible:ring-primary" />
          </div>
        </div>

        <MarginPreview custo={custoNum} />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-card-foreground">Estoque</Label>
            <Input value={form.estoque} onChange={(e) => update("estoque", e.target.value)} placeholder="Quantidade" className="bg-card border-card-border text-card-foreground focus-visible:ring-primary" />
          </div>
          <div className="space-y-2">
            <Label className="text-card-foreground">Fornecedor</Label>
            <Input value={form.fornecedor} onChange={(e) => update("fornecedor", e.target.value)} placeholder="Distribuidor" className="bg-card border-card-border text-card-foreground focus-visible:ring-primary" />
          </div>
          <div className="space-y-2">
            <Label className="text-card-foreground">UF</Label>
            <Input value={form.uf} onChange={(e) => update("uf", e.target.value)} placeholder="SP" className="bg-card border-card-border text-card-foreground focus-visible:ring-primary" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-card-foreground">Prazo</Label>
            <Input value={form.prazo} onChange={(e) => update("prazo", e.target.value)} placeholder="Ex: 10-15 dias úteis" className="bg-card border-card-border text-card-foreground focus-visible:ring-primary" />
          </div>
          <div className="space-y-2">
            <Label className="text-card-foreground">Link do Produto</Label>
            <Input value={form.link} onChange={(e) => update("link", e.target.value)} placeholder="URL (opcional)" className="bg-card border-card-border text-card-foreground focus-visible:ring-primary" />
          </div>
        </div>

        <Button type="button" variant="outline" onClick={handleAddProduct} className="gap-2 border-card-border text-card-foreground hover:bg-card-muted">
          <Plus className="h-4 w-4" /> Adicionar Produto
        </Button>
      </div>

      {/* Margem selector */}
      <div className="space-y-2">
        <Label className="text-foreground">Margem para o email</Label>
        <div className="flex gap-2">
          {([
            { value: "15" as MargemSelecionada, label: "Apenas 15%" },
            { value: "20" as MargemSelecionada, label: "Apenas 20%" },
            { value: "ambas" as MargemSelecionada, label: "Ambas" },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setMargemSelecionada(opt.value); setShowEmail(false); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                margemSelecionada === opt.value
                  ? "btn-primary-gradient shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button onClick={handleFinalize} disabled={saving} className="gap-2 btn-primary-gradient border-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Finalizar e Gerar Email
        </Button>
        <Button onClick={handleClear} variant="outline" className="gap-2 border-muted-foreground/30 text-foreground hover:bg-muted/50">
          <Eraser className="h-4 w-4" /> Limpar Tudo
        </Button>
      </div>

      {/* Email Preview */}
      {showEmail && allProductsForEmail.length > 0 && (
        <div className="animate-fade-in-up">
          <EmailPreview vendedor={vendedor} produtos={allProductsForEmail} margem={margemSelecionada} />
        </div>
      )}
    </div>
  );
}
