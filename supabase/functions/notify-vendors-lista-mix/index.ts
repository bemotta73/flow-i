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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Use service role to check admin and fetch data
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userId = claimsData.claims.sub;
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    // Get active vendors (users with role 'vendedor' and active profile)
    const { data: vendorRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "vendedor");

    if (!vendorRoles || vendorRoles.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "Nenhum vendedor ativo encontrado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vendorIds = vendorRoles.map((r: any) => r.user_id);

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, nome, email")
      .in("id", vendorIds)
      .eq("ativo", true);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "Nenhum vendedor ativo encontrado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const RESEND_FROM_EMAIL =
      Deno.env.get("RESEND_FROM_EMAIL") ||
      "Flowi <noreply@officerdistribuidora.com.br>";

    const now = new Date();
    const dataFormatada = now.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });

    const APP_URL = "https://flow-i.lovable.app";
    let sentCount = 0;
    let senderDomainUnauthorized = false;
    const errors: string[] = [];

    for (const profile of profiles) {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 16px;">Flowi — Lista Mix Atualizada</h2>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">
            Olá <strong>${profile.nome}</strong>,
          </p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">
            A Lista Mix de produtos foi atualizada em <strong>${dataFormatada}</strong>.
          </p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">
            Acesse a plataforma para consultar os novos preços:
          </p>
          <a href="${APP_URL}" style="display: inline-block; background-color: #14B8A6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
            Acessar Flowi
          </a>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">
            Flowi — Officer Distribuidora
          </p>
        </div>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: RESEND_FROM_EMAIL,
          to: [profile.email],
          subject: "Flowi — Lista Mix Atualizada",
          html,
        }),
      });

      if (res.ok) {
        sentCount++;
      } else {
        const errBody = await res.text();
        if (
          res.status === 403 &&
          errBody.toLowerCase().includes("not authorized to send emails from")
        ) {
          senderDomainUnauthorized = true;
        }
        errors.push(`${profile.email}: ${errBody}`);
      }
    }

    // Update last update date
    const nowIso = now.toISOString();
    const { data: existing } = await supabaseAdmin
      .from("configuracoes")
      .select("id")
      .eq("chave", "lista_mix_ultima_atualizacao")
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("configuracoes")
        .update({ valor: nowIso, updated_at: nowIso })
        .eq("chave", "lista_mix_ultima_atualizacao");
    } else {
      await supabaseAdmin
        .from("configuracoes")
        .insert({ chave: "lista_mix_ultima_atualizacao", valor: nowIso });
    }

    return new Response(
      JSON.stringify({
        sent: sentCount,
        total: profiles.length,
        sender_domain_unauthorized: senderDomainUnauthorized,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
