-- Restrict cotacoes UPDATE to admins only (was open to all authenticated)
DROP POLICY IF EXISTS "Authenticated can update cotacoes" ON public.cotacoes;
CREATE POLICY "Admins can update cotacoes"
  ON public.cotacoes
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));