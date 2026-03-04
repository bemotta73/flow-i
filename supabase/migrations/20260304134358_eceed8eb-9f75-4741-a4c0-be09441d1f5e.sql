-- Create vendedores table
CREATE TABLE public.vendedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read vendedores" ON public.vendedores FOR SELECT USING (true);

-- Create cotacoes table
CREATE TABLE public.cotacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendedor TEXT NOT NULL,
  canal TEXT NOT NULL,
  produto TEXT NOT NULL,
  marca TEXT,
  part_number TEXT,
  custo NUMERIC NOT NULL,
  preco_15 NUMERIC NOT NULL,
  preco_20 NUMERIC NOT NULL,
  estoque TEXT,
  fornecedor TEXT,
  uf TEXT,
  prazo TEXT,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cotacoes" ON public.cotacoes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert cotacoes" ON public.cotacoes FOR INSERT WITH CHECK (true);