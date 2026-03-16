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
      <div className="rounded-lg bg-background border border-border p-3 text-center">
        <p className="label-apple mb-1">Custo</p>
        <p className="text-sm font-semibold text-foreground">{formatBRL(custo)}</p>
      </div>
      <div className="rounded-lg bg-secondary/10 p-3 text-center">
        <p className="label-apple mb-1">Margem 15%</p>
        <p className="text-sm font-bold text-secondary">{formatBRL(preco15)}</p>
      </div>
      <div className="rounded-lg bg-success/10 p-3 text-center">
        <p className="label-apple mb-1">Margem 20%</p>
        <p className="text-sm font-bold text-success">{formatBRL(preco20)}</p>
      </div>
    </div>
  );
}
