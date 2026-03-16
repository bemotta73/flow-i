import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, LogOut, Package, Tag } from "lucide-react";
import vorneLogo from "@/assets/vorne-logo.png";

interface Produto {
  id: string;
  produto: string;
  marca: string | null;
  part_number: string | null;
  preco_15: number;
  preco_20: number;
}

interface Promocao {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  desconto_percentual: number | null;
  preco_promocional: number | null;
  data_fim: string | null;
  produto_id: string | null;
}

const ConsultaPrecos = () => {
  const { signOut, profile } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [promocoes, setPromocoes] = useState<Promocao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [marcaFilter, setMarcaFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [{ data: prods }, { data: promos }] = await Promise.all([
        supabase
          .from("lista_mix")
          .select("id, produto, marca, part_number, preco_15, preco_20")
          .eq("ativo", true)
          .order("produto"),
        supabase
          .from("promocoes")
          .select("id, titulo, descricao, imagem_url, desconto_percentual, preco_promocional, data_fim, produto_id")
          .eq("ativo", true)
          .order("created_at", { ascending: false }),
      ]);
      setProdutos((prods as Produto[]) || []);
      const activePromos = ((promos as Promocao[]) || []).filter(
        (p) => !p.data_fim || new Date(p.data_fim) > new Date()
      );
      setPromocoes(activePromos);
      setLoading(false);
    };
    fetchAll();

    const channel = supabase
      .channel("consulta_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "lista_mix" }, () => { fetchAll(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "promocoes" }, () => { fetchAll(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const marcas = useMemo(() => {
    const set = new Set<string>();
    produtos.forEach((p) => { if (p.marca) set.add(p.marca); });
    return Array.from(set).sort();
  }, [produtos]);

  const filtered = useMemo(() => {
    let result = produtos;
    if (marcaFilter) result = result.filter((p) => p.marca === marcaFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.produto.toLowerCase().includes(s) ||
          (p.marca && p.marca.toLowerCase().includes(s)) ||
          (p.part_number && p.part_number.toLowerCase().includes(s))
      );
    }
    return result;
  }, [produtos, search, marcaFilter]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 flex items-center px-6 border-b border-card">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-foreground">Flow</span>
          <span className="text-primary">i</span>
        </h1>
        <span className="text-[10px] text-muted-foreground tracking-widest uppercase ml-2">Officer Distribuidora</span>
        <div className="flex-1" />
        {profile && <span className="text-xs text-muted-foreground mr-4">Olá, {profile.nome}</span>}
        <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </header>

      <main className="max-w-5xl mx-auto p-6 animate-fade-in-up">
        {/* Promotions banner */}
        {promocoes.length > 0 && (
          <div className="mb-8 space-y-3">
            {promocoes.map((promo) => {
              const linkedProduct = promo.produto_id ? produtos.find((p) => p.id === promo.produto_id) : null;
              return (
                <div key={promo.id} className="card-elevated overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 to-primary/5">
                  <div className="flex items-center gap-4 p-4">
                    {promo.imagem_url ? (
                      <img src={promo.imagem_url} alt={promo.titulo} className="h-20 w-20 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Tag className="h-8 w-8 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-primary">{promo.titulo}</h3>
                      {promo.descricao && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{promo.descricao}</p>}
                      {linkedProduct && (
                        <p className="text-xs text-muted-foreground mt-1">Produto: {linkedProduct.produto}</p>
                      )}
                      {promo.data_fim && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Válido até {new Date(promo.data_fim).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {promo.desconto_percentual && (
                        <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                          -{promo.desconto_percentual}%
                        </span>
                      )}
                      {promo.preco_promocional && (
                        <span className="text-lg font-bold text-success">{formatBRL(promo.preco_promocional)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Consulta de Preços</h2>
          <p className="text-sm text-muted-foreground">Busque produtos e veja os preços de venda</p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por produto, marca ou part number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-12 text-base surface-input"
          />
        </div>

        {/* Marca filters */}
        {marcas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            <button
              onClick={() => setMarcaFilter(null)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                !marcaFilter ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Todas
            </button>
            {marcas.map((m) => (
              <button
                key={m}
                onClick={() => setMarcaFilter(marcaFilter === m ? null : m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  marcaFilter === m ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl animate-shimmer" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="card-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="table-header-dark border-0">
                  <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Produto</TableHead>
                  <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Marca</TableHead>
                  <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Part Number</TableHead>
                  <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Preço 15%</TableHead>
                  <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Preço 20%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p, idx) => (
                  <TableRow key={p.id} className={`table-row-hover transition-all duration-150 ${idx % 2 === 1 ? "table-row-alt" : ""}`}>
                    <TableCell className="text-sm font-medium text-foreground px-4 py-3">{p.produto}</TableCell>
                    <TableCell className="text-sm text-muted-foreground px-4 py-3">{p.marca || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground px-4 py-3">{p.part_number || "—"}</TableCell>
                    <TableCell className="text-sm font-semibold text-secondary px-4 py-3">{formatBRL(p.preco_15)}</TableCell>
                    <TableCell className="text-sm font-semibold text-success px-4 py-3">{formatBRL(p.preco_20)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col items-center gap-1 mt-12">
          <img src={vorneLogo} alt="Vorne AI" className="h-8 w-8" />
          <span className="text-[9px] text-apple-label tracking-wide">
            Desenvolvido por <span className="font-medium text-muted-foreground">Vorne AI</span>
          </span>
        </div>
      </main>
    </div>
  );
};

export default ConsultaPrecos;
