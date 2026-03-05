import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { image } = await req.json();
    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract base64 data and media type
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return new Response(
        JSON.stringify({ error: "Invalid image format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mediaType = match[1];
    const base64Data = match[2];

    const prompt = `Analise esta imagem de um produto em um site de distribuidor de tecnologia. Extraia as seguintes informações e retorne APENAS um JSON válido, sem markdown, sem backticks, sem texto adicional:
{
  "produto": "nome completo do produto",
  "marca": "marca do produto",
  "partNumber": "part number ou código",
  "custo": "preço em formato numérico brasileiro ex: 568,03",
  "estoque": "quantidade de unidades disponíveis (apenas número inteiro)",
  "fornecedor": "nome do distribuidor/fornecedor se visível",
  "uf": "estado/UF de onde vem o menor preço"
}

REGRAS IMPORTANTES:
- Se a imagem mostrar preços em múltiplas UFs, filiais ou locais de estoque, retorne sempre o MENOR preço entre os que possuem estoque disponível (ignorar "Indisponível", "Sem estoque" ou quantidade zero).
- No campo "custo", retorne o menor preço com estoque disponível.
- No campo "estoque", retorne a quantidade de estoque correspondente à UF/filial do menor preço escolhido.
- No campo "uf", retorne a UF correspondente ao menor preço escolhido.
- Se não houver estoque em nenhuma UF ou todos estiverem indisponíveis, retorne estoque como "Não informado".
- Se algum campo não estiver visível na imagem, use string vazia "".`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mediaType};base64,${base64Data}`,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI Gateway error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI Gateway error", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const textContent = result.choices?.[0]?.message?.content || "{}";
    
    // Clean potential markdown wrapping
    const cleaned = textContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // Parse the JSON response
    const extracted = JSON.parse(cleaned);

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
