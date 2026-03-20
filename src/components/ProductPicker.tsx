import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Package, History, Check } from "lucide-react";

interface ListaMixItem {
  id: string;
  produto: string;
  marca: string | null;
  part_number: string | null;
  custo: number;
  fornecedor: string | null;
}

interface CotacaoItem {
  id: string;
  produto: string;
  marca: string | null;
  part_number: string | null;
  custo: number;
  fornecedor: string | null;
  estoque: string | null;
  uf: string | null;
  prazo: string | null;
  link: string | null;
  created_at: string;
}

export interface PickedProduct {
  produto: string;
  marca: string;
  partNumber: string;
  custo: string;
  fornecedor: string;
  estoque: string;
  uf: string;
  prazo: string;
  link: string;
}

interface ProductPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (product: PickedProduct) => void;
}

export function ProductPicker({ open, onOpenChange, onSelect }: ProductPickerProps) {
  const [search, setSearch] = useState("");
  const [listaMix, setListaMix] = useState<ListaMixItem[]>([]);
  const [cotacoes, setCotacoes] = useState<CotacaoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelectedId(null);
    setLoading(true);

    Promise.all([
      supabase
        .from("lista_mix")
        .select("id, produto, marca, part_number, custo, fornecedor")
        .eq("ativo", true)
        .order("produto"),
      supabase
        .from("cotacoes")
        .select("id, produto, marca, part_number, custo, fornecedor, estoque, uf, prazo, link, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]).then(([{ data: mix }, { data: cots }]) => {
      setListaMix((mix as ListaMixItem[]) || []);
      // Deduplicate cotacoes by produto+part_number, keep most recent
      const seen = new Map<string, CotacaoItem>();
      ((cots as CotacaoItem[]) || []).forEach((c) => {
        const key = `${c.produto}|${c.part_number || ""}`;
        if (!seen.has(key)) seen.set(key, c);
      });
      setCotacoes(Array.from(seen.values()));
      setLoading(false);
    });
  }, [open]);

  const filteredMix = useMemo(() => {
    if (!search.trim()) return listaMix;
    const s = search.toLowerCase();
    return listaMix.filter(
      (p) =>
        p.produto.toLowerCase().includes(s) ||
        (p.marca && p.marca.toLowerCase().includes(s)) ||
        (p.part_number && p.part_number.toLowerCase().includes(s))
    );
  }, [listaMix, search]);

  const filteredCotacoes = useMemo(() => {
    if (!search.trim()) return cotacoes;
    const s = search.toLowerCase();
    return cotacoes.filter(
      (c) =>
        c.produto.toLowerCase().includes(s) ||
        (c.marca && c.marca.toLowerCase().includes(s)) ||
        (c.part_number && c.part_number.toLowerCase().includes(s))
    );
  }, [cotacoes, search]);

  const handleSelectMix = (item: ListaMixItem) => {
    setSelectedId(item.id);
    setTimeout(() => {
      onSelect({
        produto: item.produto,
        marca: item.marca || "",
        partNumber: item.part_number || "",
        custo: String(item.custo),
        fornecedor: item.fornecedor || "",
        estoque: "",
        uf: "",
        prazo: "",
        link: "",
      });
      onOpenChange(false);
    }, 150);
  };

  const handleSelectCotacao = (item: CotacaoItem) => {
    setSelectedId(item.id);
    setTimeout(() => {
      onSelect({
        produto: item.produto,
        marca: item.marca || "",
        partNumber: item.part_number || "",
        custo: String(item.custo),
        fornecedor: item.fornecedor || "",
        estoque: item.estoque || "",
        uf: item.uf || "",
        prazo: item.prazo || "",
        link: item.link || "",
      });
      onOpenChange(false);
    }, 150);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-primary font-semibold">Buscar Produto Existente</DialogTitle>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por produto, marca ou PN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 surface-input"
            autoFocus
          />
        </div>

        <Tabs defaultValue="lista-mix" className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-card border border-border mb-3">
            <TabsTrigger value="lista-mix" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Package className="h-3.5 w-3.5" />
              Lista Mix ({filteredMix.length})
            </TabsTrigger>
            <TabsTrigger value="cotacoes" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="h-3.5 w-3.5" />
              Cotações ({filteredCotacoes.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto min-h-0">
            <TabsContent value="lista-mix" className="mt-0">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg animate-shimmer" />)}
                </div>
              ) : filteredMix.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum produto encontrado</p>
              ) : (
                <div className="space-y-1">
                  {filteredMix.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectMix(item)}
                      className={`w-full text-left rounded-lg p-3 transition-all duration-150 active:scale-[0.98] ${
                        selectedId === item.id
                          ? "bg-primary/15 ring-1 ring-primary"
                          : "bg-card hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.produto}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.marca && <span>{item.marca}</span>}
                            {item.part_number && <span> · {item.part_number}</span>}
                            {item.fornecedor && <span> · {item.fornecedor}</span>}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-foreground shrink-0">{formatBRL(item.custo)}</span>
                        {selectedId === item.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="cotacoes" className="mt-0">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg animate-shimmer" />)}
                </div>
              ) : filteredCotacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma cotação encontrada</p>
              ) : (
                <div className="space-y-1">
                  {filteredCotacoes.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectCotacao(item)}
                      className={`w-full text-left rounded-lg p-3 transition-all duration-150 active:scale-[0.98] ${
                        selectedId === item.id
                          ? "bg-primary/15 ring-1 ring-primary"
                          : "bg-card hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.produto}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.marca && <span>{item.marca}</span>}
                            {item.part_number && <span> · {item.part_number}</span>}
                            {item.fornecedor && <span> · {item.fornecedor}</span>}
                            <span className="ml-2 text-apple-label">
                              {new Date(item.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-foreground shrink-0">{formatBRL(item.custo)}</span>
                        {selectedId === item.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
