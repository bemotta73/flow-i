CREATE TABLE public.promocoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid REFERENCES public.lista_mix(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  imagem_url text,
  desconto_percentual numeric,
  preco_promocional numeric,
  data_inicio timestamp with time zone NOT NULL DEFAULT now(),
  data_fim timestamp with time zone,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.promocoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promocoes" ON public.promocoes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Vendedores can read active promocoes" ON public.promocoes
  FOR SELECT TO authenticated
  USING (ativo = true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.promocoes;