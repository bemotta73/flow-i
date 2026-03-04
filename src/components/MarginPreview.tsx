import { formatBRL } from "@/lib/format";

interface MarginPreviewProps {
  custo: number;
}

export function MarginPreview({ custo }: MarginPreviewProps) {
  if (!custo || custo <= 0) return null;

  const preco15 = custo * 1.15;
  const preco20 = custo * 1.20;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-lg border bg-muted/50 p-3 text-center">
        <p className="text-xs text-muted-foreground mb-1">Custo</p>
        <p className="text-sm font-semibold">{formatBRL(custo)}</p>
      </div>
      <div className="rounded-lg border bg-primary/5 p-3 text-center border-primary/20">
        <p className="text-xs text-muted-foreground mb-1">Margem 15%</p>
        <p className="text-sm font-bold text-primary">{formatBRL(preco15)}</p>
      </div>
      <div className="rounded-lg border bg-primary/5 p-3 text-center border-primary/20">
        <p className="text-xs text-muted-foreground mb-1">Margem 20%</p>
        <p className="text-sm font-bold text-primary">{formatBRL(preco20)}</p>
      </div>
    </div>
  );
}
