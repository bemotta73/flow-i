import { formatBRL } from "@/lib/format";

interface MarginPreviewProps {
  custo: number;
}

export function MarginPreview({ custo }: MarginPreviewProps) {
  if (!custo || custo <= 0) return null;

  const preco15 = custo / 0.85;
  const preco20 = custo / 0.80;

  return (
    <div className="grid grid-cols-3 gap-3 animate-fade-in-up">
      <div className="rounded-xl bg-card-muted p-3 text-center border border-card-border">
        <p className="text-xs text-card-muted-foreground mb-1">Custo</p>
        <p className="text-sm font-semibold text-card-foreground">{formatBRL(custo)}</p>
      </div>
      <div className="rounded-xl bg-primary/5 p-3 text-center border border-primary/20">
        <p className="text-xs text-card-muted-foreground mb-1">Margem 15%</p>
        <p className="text-sm font-bold text-primary">{formatBRL(preco15)}</p>
      </div>
      <div className="rounded-xl bg-accent/10 p-3 text-center border border-accent/25">
        <p className="text-xs text-card-muted-foreground mb-1">Margem 20%</p>
        <p className="text-sm font-bold text-officer-green">{formatBRL(preco20)}</p>
      </div>
    </div>
  );
}
