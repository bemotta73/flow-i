import { useState } from "react";
import { Copy, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";
import type { ProdutoItem } from "./QuotationForm";

export type MargemSelecionada = "15" | "20" | "custom";

interface EmailPreviewProps {
  vendedor: string;
  produtos: ProdutoItem[];
  margem: MargemSelecionada;
  customMargem?: number;
  observacao?: string;
}

function hasNobreak(produtos: ProdutoItem[]): boolean {
  return produtos.some((p) => {
    const lower = p.produto.toLowerCase();
    return lower.includes("nobreak") || lower.includes("estabilizador");
  });
}

function calcPreco(custo: number, margemPct: number): number {
  return custo / (1 - margemPct / 100);
}

function generateEmail(vendedor: string, produtos: ProdutoItem[], margem: MargemSelecionada, customMargem?: number, observacao?: string): string {
  const nobreak = hasNobreak(produtos);
  const multi = produtos.length > 1;

  const getPrecoLine = (custoNum: number) => {
    if (margem === "15") return `Preço: ${formatBRL(calcPreco(custoNum, 15))}`;
    if (margem === "20") return `Preço: ${formatBRL(calcPreco(custoNum, 20))}`;
    // custom
    const pct = customMargem || 20;
    return `Preço: ${formatBRL(calcPreco(custoNum, pct))}`;
  };

  let produtoSection = "";
  if (multi) {
    produtoSection = produtos.map((p, i) => {
      return `${i + 1}. ${p.produto}\n${getPrecoLine(p.custoNum)}`;
    }).join("\n\n");
  } else {
    const p = produtos[0];
    produtoSection = `${p.produto}\n${getPrecoLine(p.custoNum)}`;
  }

  const freteSection = nobreak
    ? `Frete FOB: sujeito a consulta de frete`
    : `Frete Grátis: Pedidos acima de 3.000,00.\nExceto: NOBREAK e ESTABILIZADORES por tamanho e peso = sujeito a consulta de frete`;

  return `Olá ${vendedor},

Segue cotação solicitada:

${produtoSection}

Faturamento: Via ES
Expedição: 10-15 dias úteis + frete local
Prazo: 28 dias
${freteSection}

RAZÃO SOCIAL: OFFICER DISTRIBUIDORA DE TECNOLOGIA E INFORMATICA
CNPJ: 71.702.716/0006-93

Qualquer dúvida estou à disposição.`;
}

export function EmailPreview({ vendedor, produtos, margem, customMargem }: EmailPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState("");

  if (!vendedor || produtos.length === 0) return null;

  const emailText = generateEmail(vendedor, produtos, margem, customMargem);
  const displayText = editing ? editedText : emailText;

  const handleStartEdit = () => {
    setEditedText(emailText);
    setEditing(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-warning">Email Gerado</h3>
        <Badge
          className={hasNobreak(produtos)
            ? "bg-warning/15 text-warning border-warning/30"
            : "bg-success/15 text-success border-success/30"
          }
        >
          {hasNobreak(produtos) ? "NOBREAK / ESTABILIZADOR" : "PRODUTO GERAL"}
        </Badge>
        {produtos.length > 1 && (
          <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
            {produtos.length} produtos
          </Badge>
        )}
      </div>

      <div className="card-elevated p-5">
        {editing ? (
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full min-h-[300px] whitespace-pre-wrap text-sm leading-relaxed font-sans bg-transparent border-none outline-none resize-y text-foreground"
          />
        ) : (
          <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-apple-text-soft">{emailText}</pre>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleCopy}
          size="sm"
          className={`transition-all duration-200 ${
            copied
              ? "bg-success hover:bg-success/90 text-success-foreground animate-pulse-success"
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          }`}
        >
          {copied ? (
            <><Check className="h-4 w-4 mr-1.5" /> Copiado! ✓</>
          ) : (
            <><Copy className="h-4 w-4 mr-1.5" /> Copiar</>
          )}
        </Button>

        {editing ? (
          <Button
            onClick={() => setEditing(false)}
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-xl"
          >
            <Check className="h-4 w-4" /> Confirmar Edição
          </Button>
        ) : (
          <Button
            onClick={handleStartEdit}
            size="sm"
            variant="ghost"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-4 w-4" /> Editar Email
          </Button>
        )}
      </div>
    </div>
  );
}
