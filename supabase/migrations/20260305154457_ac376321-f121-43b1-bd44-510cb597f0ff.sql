
-- Tabela de alertas de preço
CREATE TABLE public.alertas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto TEXT NOT NULL,
  part_number TEXT,
  fornecedor TEXT,
  custo_anterior NUMERIC NOT NULL,
  custo_atual NUMERIC NOT NULL,
  variacao_percentual NUMERIC NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('aumento', 'queda')),
  lido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de configurações key/value
CREATE TABLE public.configuracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default threshold
INSERT INTO public.configuracoes (chave, valor) VALUES ('limite_variacao', '10');

-- RLS for alertas
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alertas"
  ON public.alertas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS for configuracoes
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage configuracoes"
  ON public.configuracoes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read configuracoes"
  ON public.configuracoes FOR SELECT
  TO authenticated
  USING (true);
