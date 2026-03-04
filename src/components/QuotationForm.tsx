import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseBRLNumber } from "@/lib/format";
import { MarginPreview } from "./MarginPreview";
import { EmailPreview } from "./EmailPreview";
import { ImageUpload, type ExtractedData } from "./ImageUpload";
import { Save, Eraser, Loader2 } from "lucide-react";
import type { MargemSelecionada } from "./EmailPreview";

interface Vendedor {
  id: string;
  nome: string;
}

export function QuotationForm() {
  const { toast } = useToast();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [saving, setSaving] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [margemSelecionada, setMargemSelecionada] = useState<MargemSelecionada>("ambas");

  const [form, setForm] = useState({
    vendedor: "",
    canal: "",
    produto: "",
    marca: "",
    partNumber: "",
    custo: "",
    estoque: "",
    fornecedor: "",
    uf: "",
    prazo: "",
    link: "",
  });

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

  const handleClear = () => {
    setForm({
      vendedor: "", canal: "", produto: "", marca: "", partNumber: "",
      custo: "", estoque: "", fornecedor: "", uf: "", prazo: "", link: "",
    });
    setShowEmail(false);
  };

  const handleSave = async () => {
    if (!form.vendedor || !form.canal || !form.produto || !custoNum) {
      toast({ title: "Campos obrigatórios", description: "Preencha vendedor, canal, produto e custo.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const preco15 = custoNum / 0.85;
      const preco20 = custoNum / 0.80;

      const { error } = await supabase.from("cotacoes").insert({
        vendedor: form.vendedor,
        canal: form.canal,
        produto: form.produto,
        marca: form.marca,
        part_number: form.partNumber,
        custo: custoNum,
        preco_15: preco15,
        preco_20: preco20,
        estoque: form.estoque,
        fornecedor: form.fornecedor,
        uf: form.uf,
        prazo: form.prazo,
        link: form.link || null,
      });

      if (error) throw error;

      setShowEmail(true);
      toast({ title: "Cotação salva!", description: "Email gerado com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Image Upload */}
      <ImageUpload onExtracted={handleExtracted} />

      {/* Form */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Vendedor *</Label>
          <Select value={form.vendedor} onValueChange={(v) => update("vendedor", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {vendedores.map((v) => (
                <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Canal</Label>
          <Select value={form.canal} onValueChange={(v) => update("canal", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Email">Email</SelectItem>
              <SelectItem value="Teams">Teams</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Produto *</Label>
        <Input
          value={form.produto}
          onChange={(e) => update("produto", e.target.value)}
          placeholder="Nome completo do produto"
          className="focus-visible:ring-primary"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Marca</Label>
          <Input value={form.marca} onChange={(e) => update("marca", e.target.value)} placeholder="Marca" className="focus-visible:ring-primary" />
        </div>
        <div className="space-y-2">
          <Label>Part Number</Label>
          <Input value={form.partNumber} onChange={(e) => update("partNumber", e.target.value)} placeholder="PN" className="focus-visible:ring-primary" />
        </div>
        <div className="space-y-2">
          <Label>Custo R$ *</Label>
          <Input value={form.custo} onChange={(e) => update("custo", e.target.value)} placeholder="568,03" className="focus-visible:ring-primary" />
        </div>
      </div>

      {/* Margin Preview */}
      <MarginPreview custo={custoNum} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Estoque</Label>
          <Input value={form.estoque} onChange={(e) => update("estoque", e.target.value)} placeholder="Quantidade" className="focus-visible:ring-primary" />
        </div>
        <div className="space-y-2">
          <Label>Fornecedor</Label>
          <Input value={form.fornecedor} onChange={(e) => update("fornecedor", e.target.value)} placeholder="Distribuidor" className="focus-visible:ring-primary" />
        </div>
        <div className="space-y-2">
          <Label>UF</Label>
          <Input value={form.uf} onChange={(e) => update("uf", e.target.value)} placeholder="SP" className="focus-visible:ring-primary" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Prazo</Label>
          <Input value={form.prazo} onChange={(e) => update("prazo", e.target.value)} placeholder="Ex: 10-15 dias úteis" className="focus-visible:ring-primary" />
        </div>
        <div className="space-y-2">
          <Label>Link do Produto</Label>
          <Input value={form.link} onChange={(e) => update("link", e.target.value)} placeholder="URL (opcional)" className="focus-visible:ring-primary" />
        </div>
      </div>

      {/* Margem selector */}
      <div className="space-y-2">
        <Label>Margem para o email</Label>
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
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                margemSelecionada === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar e Gerar Email
        </Button>
        <Button onClick={handleClear} variant="outline" className="gap-2">
          <Eraser className="h-4 w-4" /> Limpar
        </Button>
      </div>

      {/* Email Preview */}
      {showEmail && (
        <EmailPreview vendedor={form.vendedor} produto={form.produto} custo={custoNum} margem={margemSelecionada} />
      )}
    </div>
  );
}
