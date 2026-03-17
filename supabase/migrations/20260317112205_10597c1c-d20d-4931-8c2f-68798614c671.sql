-- Restrict cotacoes SELECT to admins only (was open to public)
DROP POLICY IF EXISTS "Anyone can read cotacoes" ON public.cotacoes;
CREATE POLICY "Admins can read cotacoes"
  ON public.cotacoes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Restrict cotacoes INSERT to admins only (was open to public)
DROP POLICY IF EXISTS "Anyone can insert cotacoes" ON public.cotacoes;
CREATE POLICY "Admins can insert cotacoes"
  ON public.cotacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Restrict configuracoes read to admins only (remove the open read policy)
DROP POLICY IF EXISTS "Anyone can read configuracoes" ON public.configuracoes;
CREATE POLICY "Admins can read configuracoes"
  ON public.configuracoes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));