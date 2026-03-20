
CREATE TABLE public.relatorios_semanais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  total_cotacoes integer NOT NULL DEFAULT 0,
  variacao_vs_anterior numeric NOT NULL DEFAULT 0,
  top_produtos jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_marcas jsonb NOT NULL DEFAULT '[]'::jsonb,
  fornecedor_top text,
  alertas_aumento integer NOT NULL DEFAULT 0,
  alertas_queda integer NOT NULL DEFAULT 0,
  cotacoes_por_dia jsonb NOT NULL DEFAULT '{}'::jsonb,
  lista_mix_atualizados integer NOT NULL DEFAULT 0,
  lista_mix_total integer NOT NULL DEFAULT 0,
  ticket_medio numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.relatorios_semanais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage relatorios_semanais"
ON public.relatorios_semanais
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
