import { supabase } from "@/integrations/supabase/client";

/**
 * Check price variation and generate alert if threshold exceeded.
 * Compares against the last cotacao with same part_number OR same produto+fornecedor.
 */
export async function checkPriceAlert(produto: string, partNumber: string | null, fornecedor: string | null, custoAtual: number) {
  // Get threshold
  const { data: configData } = await supabase
    .from("configuracoes")
    .select("valor")
    .eq("chave", "limite_variacao")
    .single();

  const limite = parseFloat(configData?.valor || "10");

  // Find last cotacao with same PN or same produto+fornecedor
  let custoAnterior: number | null = null;

  if (partNumber) {
    const { data } = await supabase
      .from("cotacoes")
      .select("custo")
      .eq("part_number", partNumber)
      .order("created_at", { ascending: false })
      .limit(2);

    // Skip the one we just inserted (first), take the previous
    if (data && data.length >= 2) {
      custoAnterior = data[1].custo;
    }
  }

  if (custoAnterior === null && fornecedor) {
    const { data } = await supabase
      .from("cotacoes")
      .select("custo")
      .eq("produto", produto)
      .eq("fornecedor", fornecedor)
      .order("created_at", { ascending: false })
      .limit(2);

    if (data && data.length >= 2) {
      custoAnterior = data[1].custo;
    }
  }

  if (custoAnterior === null || custoAnterior === 0) return null;

  const variacao = ((custoAtual - custoAnterior) / custoAnterior) * 100;
  const absVariacao = Math.abs(variacao);

  if (absVariacao < limite) return null;

  const tipo = variacao > 0 ? "aumento" : "queda";
  const variacaoRounded = Math.round(variacao * 100) / 100;

  const { data: alerta } = await supabase.from("alertas").insert({
    produto,
    part_number: partNumber,
    fornecedor,
    custo_anterior: custoAnterior,
    custo_atual: custoAtual,
    variacao_percentual: variacaoRounded,
    tipo,
  }).select().single();

  return alerta ? { ...alerta, custo_anterior_val: custoAnterior } : null;
}
