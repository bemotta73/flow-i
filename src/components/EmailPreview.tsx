import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";

export type MargemSelecionada = "15" | "20" | "ambas";

interface EmailPreviewProps {
  vendedor: string;
  produto: string;
  custo: number;
  margem: MargemSelecionada;
}

function isNobreak(produto: string): boolean {
  const lower = produto.toLowerCase();
  return lower.includes("nobreak") || lower.includes("estabilizador");
}

function generateEmail(vendedor: string, produto: string, custo: number, margem: MargemSelecionada): string {
  const preco15 = formatBRL(custo / 0.85);
  const preco20 = formatBRL(custo / 0.80);
  const nobreak = isNobreak(produto);

  let precoSection = "";
  if (margem === "15") {
    precoSection = `Preço: ${preco15}`;
  } else if (margem === "20") {
    precoSection = `Preço: ${preco20}`;
  } else {
    precoSection = `Preço (15%): ${preco15}\nPreço (20%): ${preco20}`;
  }

  const freteSection = nobreak
    ? `Frete FOB: sujeito a consulta de frete`
    : `Frete Grátis: Pedidos acima de 3.000,00.\nExceto: NOBREAK e ESTABILIZADORES por tamanho e peso = sujeito a consulta de frete`;

  return `Olá ${vendedor},

Segue cotação solicitada:

${produto}
${precoSection}

Faturamento: Via ES
Expedição: 10-15 dias úteis + frete local
Prazo: 28 dias
${freteSection}

RAZÃO SOCIAL: OFFICER DISTRIBUIDORA DE TECNOLOGIA E INFORMATICA
CNPJ: 71.702.716/0006-93

Qualquer dúvida estou à disposição.`;
}

export function EmailPreview({ vendedor, produto, custo, margem }: EmailPreviewProps) {
  const [copied, setCopied] = useState(false);

  if (!vendedor || !produto || !custo) return null;

  const emailText = generateEmail(vendedor, produto, custo, margem);
  const nobreak = isNobreak(produto);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Email Gerado</h3>
        <Badge
          variant="secondary"
          className={nobreak
            ? "bg-accent/20 text-accent-foreground border-accent"
            : "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30"
          }
        >
          {nobreak ? "NOBREAK / ESTABILIZADOR" : "PRODUTO GERAL"}
        </Badge>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{emailText}</pre>
      </div>

      <Button
        onClick={handleCopy}
        variant={copied ? "default" : "outline"}
        size="sm"
        className={copied ? "bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90" : ""}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" /> Copiado! ✓
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" /> Copiar
          </>
        )}
      </Button>
    </div>
  );
}
