import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Determine week range (Monday to Friday, São Paulo timezone)
    const now = new Date();
    // Find last Friday (or today if Friday)
    const dayOfWeek = now.getUTCDay();
    const friday = new Date(now);
    // If called on Friday, use this week; otherwise use last week's Friday
    if (dayOfWeek !== 5) {
      friday.setUTCDate(friday.getUTCDate() - ((dayOfWeek + 2) % 7));
    }
    const monday = new Date(friday);
    monday.setUTCDate(friday.getUTCDate() - 4);

    const dataInicio = monday.toISOString().split("T")[0];
    const dataFim = friday.toISOString().split("T")[0];

    // Check if report already exists for this week
    const { data: existing } = await supabase
      .from("relatorios_semanais")
      .select("id")
      .eq("data_inicio", dataInicio)
      .eq("data_fim", dataFim)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ message: "Relatório já existe para esta semana", id: existing.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Total cotações da semana
    const weekStart = `${dataInicio}T00:00:00-03:00`;
    const weekEnd = `${dataFim}T23:59:59-03:00`;

    const { data: cotacoesWeek, count: totalCotacoes } = await supabase
      .from("cotacoes")
      .select("*", { count: "exact" })
      .gte("created_at", weekStart)
      .lte("created_at", weekEnd);

    // 2. Previous week for comparison
    const prevMonday = new Date(monday);
    prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
    const prevFriday = new Date(friday);
    prevFriday.setUTCDate(prevFriday.getUTCDate() - 7);
    const prevStart = `${prevMonday.toISOString().split("T")[0]}T00:00:00-03:00`;
    const prevEnd = `${prevFriday.toISOString().split("T")[0]}T23:59:59-03:00`;

    const { count: prevTotal } = await supabase
      .from("cotacoes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", prevStart)
      .lte("created_at", prevEnd);

    const variacaoVsAnterior = prevTotal && prevTotal > 0
      ? (((totalCotacoes || 0) - prevTotal) / prevTotal) * 100
      : 0;

    // 3. Top 5 produtos
    const produtoCount: Record<string, number> = {};
    (cotacoesWeek || []).forEach((c) => {
      produtoCount[c.produto] = (produtoCount[c.produto] || 0) + 1;
    });
    const topProdutos = Object.entries(produtoCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, quantidade]) => ({ nome, quantidade }));

    // 4. Top 3 marcas
    const marcaCount: Record<string, number> = {};
    (cotacoesWeek || []).forEach((c) => {
      if (c.marca) marcaCount[c.marca] = (marcaCount[c.marca] || 0) + 1;
    });
    const topMarcas = Object.entries(marcaCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([nome, quantidade]) => ({ nome, quantidade }));

    // 5. Fornecedor mais usado
    const fornecedorCount: Record<string, number> = {};
    (cotacoesWeek || []).forEach((c) => {
      if (c.fornecedor) fornecedorCount[c.fornecedor] = (fornecedorCount[c.fornecedor] || 0) + 1;
    });
    const fornecedorTop = Object.entries(fornecedorCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // 6. Alertas da semana
    const { data: alertasWeek } = await supabase
      .from("alertas")
      .select("tipo")
      .gte("created_at", weekStart)
      .lte("created_at", weekEnd);

    const alertasAumento = (alertasWeek || []).filter((a) => a.tipo === "aumento").length;
    const alertasQueda = (alertasWeek || []).filter((a) => a.tipo === "queda").length;

    // 7. Cotações por dia
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const cotacoesPorDia: Record<string, number> = {
      Seg: 0, Ter: 0, Qua: 0, Qui: 0, Sex: 0,
    };
    (cotacoesWeek || []).forEach((c) => {
      const d = new Date(c.created_at);
      const dia = diasSemana[d.getDay()];
      if (cotacoesPorDia[dia] !== undefined) {
        cotacoesPorDia[dia]++;
      }
    });

    // 8. Lista Mix stats
    const { count: mixTotal } = await supabase
      .from("lista_mix")
      .select("*", { count: "exact", head: true })
      .eq("ativo", true);

    const { count: mixAtualizados } = await supabase
      .from("lista_mix")
      .select("*", { count: "exact", head: true })
      .eq("ativo", true)
      .gte("updated_at", weekStart)
      .lte("updated_at", weekEnd);

    // 9. Ticket médio
    const ticketMedio =
      cotacoesWeek && cotacoesWeek.length > 0
        ? cotacoesWeek.reduce((sum, c) => sum + Number(c.custo), 0) / cotacoesWeek.length
        : 0;

    // Insert report
    const { data: report, error } = await supabase
      .from("relatorios_semanais")
      .insert({
        data_inicio: dataInicio,
        data_fim: dataFim,
        total_cotacoes: totalCotacoes || 0,
        variacao_vs_anterior: Math.round(variacaoVsAnterior * 100) / 100,
        top_produtos: topProdutos,
        top_marcas: topMarcas,
        fornecedor_top: fornecedorTop,
        alertas_aumento: alertasAumento,
        alertas_queda: alertasQueda,
        cotacoes_por_dia: cotacoesPorDia,
        lista_mix_atualizados: mixAtualizados || 0,
        lista_mix_total: mixTotal || 0,
        ticket_medio: Math.round(ticketMedio * 100) / 100,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error generating report:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
